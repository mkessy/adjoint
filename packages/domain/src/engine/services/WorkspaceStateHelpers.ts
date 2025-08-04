/**
 * WorkspaceState Functional Helpers
 *
 * Demonstrates functional pipeline patterns and Ref combinators
 * for workspace state management.
 */

import { Chunk, Data, DateTime, Duration, Effect, Function, Option, pipe, Ref, Schedule } from "effect"
import type { GraphSnapshot } from "./WorkspaceStateService.js"
import { WorkspaceError, WorkspaceState } from "./WorkspaceStateService.js"

// --- Functional Pipeline Combinators ---

/**
 * Functional combinator for updating workspace state.
 * Uses the data-last style for better composition.
 */
export const updateWorkspaceState = Function.dual<
  (f: (state: WorkspaceState) => WorkspaceState) => (ref: Ref.Ref<WorkspaceState>) => Effect.Effect<WorkspaceState>,
  (ref: Ref.Ref<WorkspaceState>, f: (state: WorkspaceState) => WorkspaceState) => Effect.Effect<WorkspaceState>
>(2, (ref, f) => Ref.updateAndGet(ref, f))

/**
 * Functional combinator for modifying workspace state with return value.
 * Demonstrates the modify pattern for atomic read+write.
 */
export const modifyWorkspaceState = Function.dual<
  <A>(f: (state: WorkspaceState) => readonly [A, WorkspaceState]) => (ref: Ref.Ref<WorkspaceState>) => Effect.Effect<A>,
  <A>(ref: Ref.Ref<WorkspaceState>, f: (state: WorkspaceState) => readonly [A, WorkspaceState]) => Effect.Effect<A>
>(2, (ref, f) => Ref.modify(ref, f))

/**
 * Functional combinator for getting a derived value from workspace state.
 * Uses the map pattern for read-only transformations.
 */
export const getFromWorkspaceState = Function.dual<
  <A>(f: (state: WorkspaceState) => A) => (ref: Ref.Ref<WorkspaceState>) => Effect.Effect<A>,
  <A>(ref: Ref.Ref<WorkspaceState>, f: (state: WorkspaceState) => A) => Effect.Effect<A>
>(2, (ref, f) => pipe(Ref.get(ref), Effect.map(f)))

// --- Pure State Transformation Functions ---

/**
 * Pure function to add multiple snapshots at once.
 * Demonstrates functional composition of state transitions.
 */
export const addSnapshots = (snapshots: Chunk.Chunk<GraphSnapshot>) => (state: WorkspaceState): WorkspaceState =>
  pipe(
    snapshots,
    Chunk.reduce(state, (currentState, snapshot) => currentState.addSnapshot(snapshot))
  )

/**
 * Pure function to navigate to a specific index.
 * Returns both the snapshot and new state.
 */
export const navigateToIndex =
  (targetIndex: number) => (state: WorkspaceState): [Option.Option<GraphSnapshot>, WorkspaceState] => {
    if (targetIndex < 0 || targetIndex >= state.history.length) {
      return [Option.none(), state]
    }

    const newState = new WorkspaceState({
      ...state,
      currentIndex: targetIndex
    })

    const snapshot = Chunk.get(state.history, targetIndex)
    return [snapshot, newState]
  }

/**
 * Pure function to filter history by operation type.
 * Demonstrates functional data processing.
 */
export const filterHistoryByOperation = (operation: string) => (state: WorkspaceState): Chunk.Chunk<GraphSnapshot> =>
  pipe(
    state.history,
    Chunk.filter((snapshot) => snapshot.operation === operation)
  )

/**
 * Pure function to get recent snapshots within a time window.
 */
export const getRecentSnapshots =
  (withinDuration: Duration.Duration) => (state: WorkspaceState): Effect.Effect<Chunk.Chunk<GraphSnapshot>> =>
    Effect.gen(function*() {
      const now = yield* DateTime.now
      const cutoffTime = DateTime.subtract(now, { millis: Duration.toMillis(withinDuration) })
      return pipe(
        state.history,
        Chunk.filter((snapshot) => DateTime.greaterThan(snapshot.timestamp, cutoffTime))
      )
    })

// --- Higher-Order Workspace Operations ---

/**
 * Higher-order function that wraps workspace operations with logging.
 * Demonstrates functional composition patterns.
 */
export const withWorkspaceLogging = <A, E>(
  operation: string
) =>
(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  pipe(
    Effect.logDebug(`Starting workspace operation: ${operation}`),
    Effect.andThen(effect),
    Effect.tap((result) => Effect.logDebug(`Completed workspace operation: ${operation}`, { result })),
    Effect.tapError((error) => Effect.logError(`Failed workspace operation: ${operation}`, { error }))
  )

/**
 * Higher-order function for workspace operations with retry logic.
 * Shows how to compose resilience patterns.
 */
export const withWorkspaceRetry = <A, E>(
  maxRetries: number
) =>
(effect: Effect.Effect<A, E>): Effect.Effect<A, E> => Effect.retry(effect, Schedule.recurs(maxRetries))

/**
 * Combines logging and retry for robust workspace operations.
 */
export const robustWorkspaceOperation = <A, E>(
  operation: string,
  maxRetries: number = 3
) =>
(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  pipe(
    effect,
    withWorkspaceLogging(operation),
    withWorkspaceRetry(maxRetries)
  )

// --- Workspace Validation Functions ---

/**
 * Pure validation function for workspace state consistency.
 */
export const validateWorkspaceState = (state: WorkspaceState): boolean =>
  pipe(
    [
      // Current index is within bounds
      state.currentIndex >= -1 && state.currentIndex < state.history.length,
      // History doesn't exceed max size
      state.history.length <= state.maxHistorySize,
      // If not empty, current index points to valid snapshot
      state.currentIndex === -1 || Chunk.get(state.history, state.currentIndex).pipe(Option.isSome)
    ],
    (validations) => validations.every(Boolean)
  )

/**
 * Effect that validates workspace state and fails if invalid.
 */
export const assertValidWorkspaceState = (ref: Ref.Ref<WorkspaceState>): Effect.Effect<void, WorkspaceError> =>
  pipe(
    Ref.get(ref),
    Effect.flatMap((state) =>
      Effect.if(validateWorkspaceState(state), {
        onFalse: () => Effect.void,
        onTrue: () =>
          Effect.fail(
            new WorkspaceError({
              reason: "InvalidState",
              context: {
                currentIndex: state.currentIndex,
                historyLength: state.history.length
              }
            })
          )
      })
    )
  )

// --- Workspace Query Functions ---

/**
 * Query function to find snapshots by graph ID.
 * Demonstrates functional search patterns.
 */
export const findSnapshotsByGraphId = (graphId: string) => (state: WorkspaceState): Chunk.Chunk<GraphSnapshot> =>
  pipe(
    state.history,
    Chunk.filter((snapshot) => snapshot.graph.id === graphId)
  )

/**
 * Query function to get workspace statistics.
 * Shows functional data aggregation.
 */
export const computeWorkspaceMetrics = (state: WorkspaceState): WorkspaceMetrics => {
  const operations = pipe(
    state.history,
    Chunk.map((snapshot) => snapshot.operation),
    Chunk.reduce(new Map<string, number>(), (acc, operation) => {
      acc.set(operation, (acc.get(operation) ?? 0) + 1)
      return acc
    })
  )

  const graphIds = pipe(
    state.history,
    Chunk.map((snapshot) => snapshot.graph.id),
    (ids) => new Set(Chunk.toReadonlyArray(ids))
  )

  return new WorkspaceMetrics({
    totalSnapshots: state.history.length,
    uniqueGraphs: graphIds.size,
    operationCounts: operations,
    currentPosition: state.currentIndex,
    undoDepth: state.currentIndex,
    redoDepth: state.history.length - 1 - state.currentIndex
  })
}

// --- Data Types for Metrics ---

export class WorkspaceMetrics extends Data.TaggedClass("WorkspaceMetrics")<{
  readonly totalSnapshots: number
  readonly uniqueGraphs: number
  readonly operationCounts: Map<string, number>
  readonly currentPosition: number
  readonly undoDepth: number
  readonly redoDepth: number
}> {}

// --- Usage Examples ---

/**
 * Example: Functional workspace state management
 *
 * ```typescript
 * const workspaceOperations = Effect.gen(function* () {
 *   const stateRef = yield* Ref.make(WorkspaceState.empty)
 *
 *   // Add multiple snapshots functionally
 *   const snapshots = Chunk.make(snapshot1, snapshot2, snapshot3)
 *   yield* updateWorkspaceState(addSnapshots(snapshots))(stateRef)
 *
 *   // Navigate to specific index
 *   const [maybeSnapshot, _] = yield* modifyWorkspaceState(
 *     navigateToIndex(1)
 *   )(stateRef)
 *
 *   // Get filtered history
 *   const transformSnapshots = yield* getFromWorkspaceState(
 *     filterHistoryByOperation("transform")
 *   )(stateRef)
 *
 *   // Validate state
 *   yield* assertValidWorkspaceState(stateRef)
 *
 *   return { maybeSnapshot, transformSnapshots }
 * })
 *
 * // Run with robust error handling
 * const result = yield* robustWorkspaceOperation(
 *   "bulk-workspace-update",
 *   3
 * )(workspaceOperations)
 * ```
 */

// Re-export for convenience
export type { WorkspaceStats } from "./WorkspaceStateService.js"
