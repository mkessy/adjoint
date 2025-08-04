/**
 * WorkspaceStateService - The Single Source of Truth for UI State
 *
 * This service manages the sequence of immutable Graph states using Effect's
 * compositional Ref APIs, functional pipelines, and class-based encapsulation.
 */

import { Chunk, Context, Data, DateTime, Effect, Layer, Option, pipe, PubSub, Ref, Stream } from "effect"
import type { Graph } from "../../graph/graph.js"

// --- Data Types ---

export class GraphSnapshot extends Data.TaggedClass("GraphSnapshot")<{
  readonly graph: Graph
  readonly timestamp: DateTime.DateTime
  readonly operation: "initial" | "transform" | "compose" | "undo" | "redo"
  readonly metadata: Record<string, unknown>
}> {}

export class WorkspaceState extends Data.TaggedClass("WorkspaceState")<{
  readonly history: Chunk.Chunk<GraphSnapshot>
  readonly currentIndex: number
  readonly maxHistorySize: number
}> {
  static empty = new WorkspaceState({
    history: Chunk.empty(),
    currentIndex: -1,
    maxHistorySize: 100
  })

  get canUndo(): boolean {
    return this.currentIndex > 0
  }

  get canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  get currentSnapshot(): Option.Option<GraphSnapshot> {
    return this.currentIndex === -1
      ? Option.none()
      : Chunk.get(this.history, this.currentIndex)
  }

  // --- Functional State Transitions ---

  /**
   * Pure function to add a snapshot to history.
   * Handles branching and history size limits functionally.
   */
  addSnapshot(snapshot: GraphSnapshot): WorkspaceState {
    return pipe(
      this,
      (state) => {
        // Branch from current position or append to end
        const newHistory = state.currentIndex === state.history.length - 1
          ? Chunk.append(state.history, snapshot)
          : pipe(
            state.history,
            Chunk.take(state.currentIndex + 1),
            Chunk.append(snapshot)
          )

        // Maintain max history size
        const trimmedHistory = newHistory.length > state.maxHistorySize
          ? pipe(
            newHistory,
            Chunk.drop(newHistory.length - state.maxHistorySize)
          )
          : newHistory

        return new WorkspaceState({
          history: trimmedHistory,
          currentIndex: trimmedHistory.length - 1,
          maxHistorySize: state.maxHistorySize
        })
      }
    )
  }

  /**
   * Pure function to move to previous state.
   */
  moveToPrevious(): [Option.Option<GraphSnapshot>, WorkspaceState] {
    if (!this.canUndo) {
      return [Option.none(), this]
    }

    const newIndex = this.currentIndex - 1
    const newState = new WorkspaceState({
      ...this,
      currentIndex: newIndex
    })

    const snapshot = Chunk.get(this.history, newIndex)
    return [snapshot, newState]
  }

  /**
   * Pure function to move to next state.
   */
  moveToNext(): [Option.Option<GraphSnapshot>, WorkspaceState] {
    if (!this.canRedo) {
      return [Option.none(), this]
    }

    const newIndex = this.currentIndex + 1
    const newState = new WorkspaceState({
      ...this,
      currentIndex: newIndex
    })

    const snapshot = Chunk.get(this.history, newIndex)
    return [snapshot, newState]
  }

  /**
   * Pure function to clear all history.
   */
  clear(): WorkspaceState {
    return WorkspaceState.empty
  }
}

export class WorkspaceEvent extends Data.TaggedClass("WorkspaceEvent")<{
  readonly graph: Graph
  readonly snapshot: GraphSnapshot
  readonly fromIndex: number
  readonly toIndex: number
  readonly timestamp: DateTime.DateTime
}> {}

// --- Service Definition ---

export class WorkspaceStateService extends Context.Tag("WorkspaceStateService")<
  WorkspaceStateService,
  {
    readonly currentGraph: Effect.Effect<Graph, WorkspaceError>
    readonly graphStream: Stream.Stream<Graph, never>
    readonly eventStream: Stream.Stream<WorkspaceEvent, never>
    readonly commitGraph: (
      graph: Graph,
      operation?: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<GraphSnapshot, never>
    readonly undo: Effect.Effect<Option.Option<Graph>, never>
    readonly redo: Effect.Effect<Option.Option<Graph>, never>
    readonly getHistory: Effect.Effect<Chunk.Chunk<GraphSnapshot>, never>
    readonly canUndo: Effect.Effect<boolean, never>
    readonly canRedo: Effect.Effect<boolean, never>
    readonly clearHistory: Effect.Effect<void, never>
    readonly getStats: Effect.Effect<WorkspaceStats, never>
  }
>() {}

export class WorkspaceError extends Data.TaggedError("WorkspaceError")<{
  readonly reason: "NoGraphInWorkspace" | "InvalidState"
  readonly context?: Record<string, unknown>
}> {}

export class WorkspaceStats extends Data.TaggedClass("WorkspaceStats")<{
  readonly totalGraphs: number
  readonly currentIndex: number
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly oldestGraph: Option.Option<DateTime.DateTime>
  readonly newestGraph: Option.Option<DateTime.DateTime>
}> {}

// --- Functional Workspace Controller Class ---

/**
 * Encapsulates all workspace operations using Effect's Ref combinators.
 * This follows the class-based pattern from Effect's documentation.
 */
class WorkspaceController {
  // Public operations as Effect values
  readonly getCurrentGraph: Effect.Effect<Graph, WorkspaceError>
  readonly commitGraph: (
    graph: Graph,
    operation?: string,
    metadata?: Record<string, unknown>
  ) => Effect.Effect<GraphSnapshot, never>
  readonly undo: Effect.Effect<Option.Option<Graph>, never>
  readonly redo: Effect.Effect<Option.Option<Graph>, never>
  readonly getHistory: Effect.Effect<Chunk.Chunk<GraphSnapshot>, never>
  readonly canUndo: Effect.Effect<boolean, never>
  readonly canRedo: Effect.Effect<boolean, never>
  readonly clearHistory: Effect.Effect<void, never>
  readonly getStats: Effect.Effect<WorkspaceStats, never>

  constructor(
    private readonly state: Ref.Ref<WorkspaceState>,
    private readonly graphPubSub: PubSub.PubSub<Graph>,
    private readonly eventPubSub: PubSub.PubSub<WorkspaceEvent>
  ) {
    // --- Pure Read Operations using Ref.get pipeline ---

    this.getCurrentGraph = pipe(
      Ref.get(this.state),
      Effect.flatMap((workspaceState) =>
        Option.match(workspaceState.currentSnapshot, {
          onNone: () =>
            Effect.fail(
              new WorkspaceError({
                reason: "NoGraphInWorkspace"
              })
            ),
          onSome: (snapshot) => Effect.succeed(snapshot.graph)
        })
      )
    )

    this.getHistory = pipe(
      Ref.get(this.state),
      Effect.map((workspaceState) => workspaceState.history)
    )

    this.canUndo = pipe(
      Ref.get(this.state),
      Effect.map((workspaceState) => workspaceState.canUndo)
    )

    this.canRedo = pipe(
      Ref.get(this.state),
      Effect.map((workspaceState) => workspaceState.canRedo)
    )

    this.getStats = Ref.get(this.state).pipe(
      Effect.map(this.computeStats)
    )

    // --- Effectful Operations using Ref combinators ---

    this.commitGraph = (
      graph: Graph,
      operation: string = "transform",
      metadata: Record<string, unknown> = {}
    ) =>
      pipe(
        DateTime.now,
        Effect.flatMap((timestamp) => {
          const newSnapshot = new GraphSnapshot({
            graph,
            timestamp,
            operation: operation as any,
            metadata
          })

          return pipe(
            // Use Ref.modify for atomic state transition
            this.state,
            Ref.modify((currentState) => {
              const fromIndex = currentState.currentIndex
              const nextState = currentState.addSnapshot(newSnapshot)
              const toIndex = nextState.currentIndex
              return [{ fromIndex, toIndex, nextState }, nextState] as const
            }),
            Effect.tap(({ fromIndex, toIndex }) =>
              // Concurrent publishing
              Effect.all(
                [
                  PubSub.publish(this.graphPubSub, graph),
                  PubSub.publish(
                    this.eventPubSub,
                    new WorkspaceEvent({
                      graph,
                      snapshot: newSnapshot,
                      fromIndex,
                      toIndex,
                      timestamp
                    })
                  )
                ],
                { concurrency: "unbounded" }
              )
            ),
            Effect.as(newSnapshot)
          )
        })
      )

    this.undo = pipe(
      this.state,
      Ref.modify((currentState) => {
        const fromIndex = currentState.currentIndex
        const [maybeSnapshot, nextState] = currentState.moveToPrevious()
        const toIndex = nextState.currentIndex
        return [
          { maybeSnapshot, fromIndex, toIndex }, // result of modify
          nextState
        ]
      }),
      Effect.tap(({ fromIndex, maybeSnapshot, toIndex }) =>
        pipe(
          maybeSnapshot,
          Option.match({
            onNone: () => Effect.void,
            onSome: (snapshot) =>
              Effect.all(
                [
                  PubSub.publish(this.graphPubSub, snapshot.graph),
                  Effect.flatMap(DateTime.now, (timestamp) =>
                    PubSub.publish(
                      this.eventPubSub,
                      new WorkspaceEvent({
                        graph: snapshot.graph,
                        snapshot,
                        fromIndex,
                        toIndex,
                        timestamp
                      })
                    )),
                  Effect.logDebug("Undo performed")
                ],
                { concurrency: "unbounded" }
              )
          })
        )
      ),
      Effect.map(({ maybeSnapshot }) => Option.map(maybeSnapshot, (s) => s.graph))
    )

    this.redo = pipe(
      this.state,
      Ref.modify((currentState) => {
        const fromIndex = currentState.currentIndex
        const [maybeSnapshot, nextState] = currentState.moveToNext()
        const toIndex = nextState.currentIndex
        return [
          { maybeSnapshot, fromIndex, toIndex },
          nextState
        ]
      }),
      Effect.tap(({ fromIndex, maybeSnapshot, toIndex }) =>
        pipe(
          maybeSnapshot,
          Option.match({
            onNone: () => Effect.void,
            onSome: (snapshot) =>
              Effect.all(
                [
                  PubSub.publish(this.graphPubSub, snapshot.graph),
                  Effect.flatMap(DateTime.now, (timestamp) =>
                    PubSub.publish(
                      this.eventPubSub,
                      new WorkspaceEvent({
                        graph: snapshot.graph,
                        snapshot,
                        fromIndex,
                        toIndex,
                        timestamp
                      })
                    )),
                  Effect.logDebug("Redo performed")
                ],
                { concurrency: "unbounded" }
              )
          })
        )
      ),
      Effect.map(({ maybeSnapshot }) => Option.map(maybeSnapshot, (s) => s.graph))
    )

    this.clearHistory = pipe(
      Ref.set(this.state, WorkspaceState.empty),
      Effect.zipRight(Effect.logInfo("Workspace history cleared")),
      Effect.asVoid
    )
  }

  // --- Private Pure Helper Functions ---

  private computeStats = (workspaceState: WorkspaceState): WorkspaceStats => {
    const timestamps = pipe(
      workspaceState.history,
      Chunk.map((snapshot) => snapshot.timestamp)
    )

    return new WorkspaceStats({
      totalGraphs: workspaceState.history.length,
      currentIndex: workspaceState.currentIndex,
      canUndo: workspaceState.canUndo,
      canRedo: workspaceState.canRedo,
      oldestGraph: Chunk.head(timestamps),
      newestGraph: Chunk.last(timestamps)
    })
  }
}

// --- Service Factory using Class-based Controller ---

const makeWorkspaceStateService = Effect.gen(function*() {
  // Initialize dependencies
  const state = yield* Ref.make(WorkspaceState.empty)
  const graphPubSub = yield* PubSub.bounded<Graph>(32)
  const eventPubSub = yield* PubSub.bounded<WorkspaceEvent>(64)

  // Create controller with encapsulated Ref operations
  const controller = new WorkspaceController(state, graphPubSub, eventPubSub)

  // Create reactive streams
  const graphStream = Stream.fromPubSub(graphPubSub)
  const eventStream = Stream.fromPubSub(eventPubSub)

  // Return service interface
  return WorkspaceStateService.of({
    currentGraph: controller.getCurrentGraph,
    graphStream,
    eventStream,
    commitGraph: controller.commitGraph,
    undo: controller.undo,
    redo: controller.redo,
    getHistory: controller.getHistory,
    canUndo: controller.canUndo,
    canRedo: controller.canRedo,
    clearHistory: controller.clearHistory,
    getStats: controller.getStats
  })
})

// --- Layer Definition ---

export const WorkspaceStateServiceLive = Layer.effect(
  WorkspaceStateService,
  makeWorkspaceStateService
)

// --- Testing Layer ---

export const WorkspaceStateServiceTest = Layer.effect(
  WorkspaceStateService,
  Effect.gen(function*() {
    // Test implementation with smaller history size for testing
    const state = yield* Ref.make(
      new WorkspaceState({
        history: Chunk.empty(),
        currentIndex: -1,
        maxHistorySize: 10 // Smaller for testing
      })
    )
    const graphPubSub = yield* PubSub.bounded<Graph>(32)
    const eventPubSub = yield* PubSub.bounded<WorkspaceEvent>(64)

    // Create controller with test-specific state
    const controller = new WorkspaceController(state, graphPubSub, eventPubSub)

    // Create reactive streams
    const graphStream = Stream.fromPubSub(graphPubSub)
    const eventStream = Stream.fromPubSub(eventPubSub)

    // Return same interface as live implementation
    return WorkspaceStateService.of({
      currentGraph: controller.getCurrentGraph,
      graphStream,
      eventStream,
      commitGraph: controller.commitGraph,
      undo: controller.undo,
      redo: controller.redo,
      getHistory: controller.getHistory,
      canUndo: controller.canUndo,
      canRedo: controller.canRedo,
      clearHistory: controller.clearHistory,
      getStats: controller.getStats
    })
  })
)

// --- Utility Functions ---

export const withInitialGraph = (graph: Graph) =>
  Effect.flatMap(
    WorkspaceStateService,
    (service) => service.commitGraph(graph, "initial", { source: "initialization" })
  )

export const subscribeToGraphChanges = Effect.flatMap(
  WorkspaceStateService,
  (service) => Effect.succeed(service.graphStream)
)

export const subscribeToWorkspaceEvents = Effect.flatMap(
  WorkspaceStateService,
  (service) => Effect.succeed(service.eventStream)
)
