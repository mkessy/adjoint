import { Rx } from "@effect-rx/rx"
import { Effect } from "effect"
import type { Graph } from "../../graph/graph.js"
import { WorkspaceStateService, WorkspaceStateServiceLive } from "./WorkspaceStateService.js"

/**
 * Main Rx Runtime - converts Effect services to reactive values
 * This is the bridge between domain services and UI
 */
export const GraphWorkspaceRxRuntime = Rx.runtime(WorkspaceStateServiceLive)

/**
 * Current graph as reactive value
 * UI components can subscribe to this for automatic updates
 */
export const currentGraphRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function*() {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.currentGraph
  })
)

/**
 * Workspace statistics as reactive value
 * Updates automatically based on workspace changes
 */
export const workspaceStatsRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function*() {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.getStats
  })
)

/**
 * Workspace events stream as reactive value
 * For notifications, animations, analytics
 */
export const workspaceEventsRx = Rx.make(
  Effect.gen(function*() {
    const workspace = yield* WorkspaceStateService
    return workspace.eventStream
  })
)

/**
 * Action functions as Rx.fn - these trigger domain operations
 * Return Results that can be handled by React components
 */
export const workspaceActionsRx = {
  /**
   * Initialize workspace with a graph
   */
  initializeWorkspace: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*(initialGraph: Graph) {
      const workspace = yield* WorkspaceStateService
      yield* workspace.commitGraph(initialGraph, "initial", {
        source: "initialization"
      })
    })
  ),

  /**
   * Commit a new graph state
   */
  commitGraph: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*(params: { graph: Graph; operation?: string; metadata?: Record<string, unknown> }) {
      const workspace = yield* WorkspaceStateService
      yield* workspace.commitGraph(
        params.graph,
        params.operation ?? "user-action",
        params.metadata ?? {}
      )
    })
  ),

  /**
   * Undo last operation
   */
  undo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*() {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.undo
    })
  ),

  /**
   * Redo next operation
   */
  redo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*() {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.redo
    })
  ),

  /**
   * Get current graph (for imperative access)
   */
  getCurrentGraph: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*() {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.currentGraph
    })
  ),

  /**
   * Clear workspace history
   */
  clearHistory: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function*() {
      const workspace = yield* WorkspaceStateService
      yield* workspace.clearHistory
    })
  )
}

/**
 * Export reactive booleans for UI state
 */
export const canUndoRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function*() {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.canUndo
  })
)

export const canRedoRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function*() {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.canRedo
  })
)
