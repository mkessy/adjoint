/**
 * GraphWorkspaceRuntime - UI Integration Layer
 *
 * Demonstrates how the WorkspaceStateService integrates with effect-rx
 * for reactive UI development.
 */

import { Duration, Effect, Layer, ManagedRuntime, Option, Schedule, Stream } from "effect"
import type { Graph } from "../../graph/graph.js"
import { WorkspaceStateService, WorkspaceStateServiceLive } from "./WorkspaceStateService.js"

// --- Runtime Configuration ---

export interface RuntimeConfig {
  readonly maxHistorySize?: number
  readonly enableMetrics?: boolean
  readonly logLevel?: "debug" | "info" | "warn" | "error"
}

// --- Main Runtime for Web Package ---

export class GraphWorkspaceRuntime {
  private constructor(
    private readonly runtime: ManagedRuntime.ManagedRuntime<WorkspaceStateService, never>
  ) {}

  static make(_config: RuntimeConfig = {}) {
    const layer = Layer.mergeAll(
      WorkspaceStateServiceLive
      // Future: Add other services like AdjointEngine, MetricsService, etc.
    )

    const runtime = ManagedRuntime.make(layer)
    return new GraphWorkspaceRuntime(runtime)
  }

  // --- Primary Reactive Streams for effect-rx ---

  /**
   * The main reactive stream for UI state.
   * This is what effect-rx will subscribe to for automatic UI updates.
   */
  get currentGraph$() {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return service.graphStream
      })
    )
  }

  /**
   * Stream of workspace events for rich UI feedback.
   * Use this for animations, notifications, analytics, etc.
   */
  get workspaceEvents$() {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return service.eventStream
      })
    )
  }

  /**
   * Current workspace statistics for status displays.
   */
  get workspaceStats$() {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return Stream.repeatEffectWithSchedule(
          service.getStats,
          // Update stats every second
          Schedule.spaced(Duration.seconds(1))
        )
      })
    )
  }

  // --- UI Action Methods ---

  /**
   * Initialize the workspace with a starting graph.
   * Call this once when the app loads.
   */
  async initializeWorkspace(initialGraph: Graph): Promise<void> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        yield* service.commitGraph(initialGraph, "initial", { source: "app-initialization" })
      })
    )
  }

  /**
   * Commit a new graph state (e.g., after user applies a transformation).
   * The UI will automatically react via currentGraph$.
   */
  async commitGraph(
    graph: Graph,
    operation: string = "user-action",
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        yield* service.commitGraph(graph, operation, metadata)
      })
    )
  }

  /**
   * Undo the last operation.
   * Returns the previous graph, or null if at the beginning.
   */
  async undo(): Promise<Graph | null> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        const option = yield* service.undo
        return Option.getOrNull(option)
      })
    )
  }

  /**
   * Redo the next operation.
   * Returns the next graph, or null if at the end.
   */
  async redo(): Promise<Graph | null> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        const option = yield* service.redo
        return Option.getOrNull(option)
      })
    )
  }

  /**
   * Get the current graph synchronously.
   * Useful for imperative operations that need the current state.
   */
  async getCurrentGraph(): Promise<Graph> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return yield* service.currentGraph
      })
    )
  }

  /**
   * Check if undo is possible.
   */
  async canUndo(): Promise<boolean> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return yield* service.canUndo
      })
    )
  }

  /**
   * Check if redo is possible.
   */
  async canRedo(): Promise<boolean> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        return yield* service.canRedo
      })
    )
  }

  /**
   * Clear the entire workspace history.
   * Use with caution - this cannot be undone!
   */
  async clearHistory(): Promise<void> {
    return this.runtime.runPromise(
      Effect.gen(function*() {
        const service = yield* WorkspaceStateService
        yield* service.clearHistory
      })
    )
  }

  /**
   * Cleanup and dispose of the runtime.
   * Call this when the app is unmounting.
   */
  async dispose(): Promise<void> {
    await this.runtime.dispose()
  }
}

// --- effect-rx Integration Helpers ---

/**
 * Hook-style helper for React components using effect-rx.
 * This would be used in the web package.
 */
export const createWorkspaceHooks = (runtime: GraphWorkspaceRuntime) => {
  return {
    // Current graph reactive value
    useCurrentGraph: () => runtime.currentGraph$,

    // Workspace statistics reactive value
    useWorkspaceStats: () => runtime.workspaceStats$,

    // Event stream for animations/notifications
    useWorkspaceEvents: () => runtime.workspaceEvents$,

    // Action dispatchers
    actions: {
      commitGraph: runtime.commitGraph.bind(runtime),
      undo: runtime.undo.bind(runtime),
      redo: runtime.redo.bind(runtime),
      clearHistory: runtime.clearHistory.bind(runtime),
      initializeWorkspace: runtime.initializeWorkspace.bind(runtime),
      getCurrentGraph: runtime.getCurrentGraph.bind(runtime),
      canUndo: runtime.canUndo.bind(runtime),
      canRedo: runtime.canRedo.bind(runtime)
    }
  }
}

// --- Usage Example in React Component ---

/**
 * Example React component showing effect-rx integration:
 *
 * ```typescript
 * import { Rx } from "@effect-rx/rx-react"
 * import { GraphWorkspaceRuntime, createWorkspaceHooks } from "@adjoint/domain"
 *
 * const runtime = GraphWorkspaceRuntime.make()
 * const { useCurrentGraph, useWorkspaceStats, actions } = createWorkspaceHooks(runtime)
 *
 * export const GraphWorkspace = () => {
 *   const currentGraph = Rx.use(useCurrentGraph())
 *   const stats = Rx.use(useWorkspaceStats())
 *   const [selectedNodeId, setSelectedNodeId] = useState<Node.NodeId | null>(null)
 *
 *   const handleApplyTransformation = async (transformation: any) => {
 *     const newGraph = applyTransformationToGraph(currentGraph, transformation)
 *     await actions.commitGraph(newGraph, "user-transformation")
 *     // UI automatically updates via reactive currentGraph!
 *   }
 *
 *   return (
 *     <div className="workspace">
 *       <div className="stats">
 *         Graphs: {stats.totalGraphs} | Can Undo: {stats.canUndo} | Can Redo: {stats.canRedo}
 *       </div>
 *
 *       <GraphVisualization
 *         graph={currentGraph}
 *         onNodeSelect={setSelectedNodeId}
 *       />
 *
 *       <ControlPanel
 *         selectedNodeId={selectedNodeId}
 *         onApplyTransformation={handleApplyTransformation}
 *       />
 *
 *       <div className="actions">
 *         <button onClick={actions.undo} disabled={!stats.canUndo}>
 *           Undo
 *         </button>
 *         <button onClick={actions.redo} disabled={!stats.canRedo}>
 *           Redo
 *         </button>
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
