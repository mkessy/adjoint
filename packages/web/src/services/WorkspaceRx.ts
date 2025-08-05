import {
  canRedoRx,
  canUndoRx,
  currentGraphRx,
  GraphWorkspaceRxRuntime,
  workspaceActionsRx,
  workspaceEventsRx,
  workspaceStatsRx
} from "@adjoint/domain/engine/services/GraphWorkspaceRxRuntime"
import { Result, Rx } from "@effect-rx/rx"
import { Effect } from "effect"

/**
 * Re-export domain Rx objects for React components
 * This creates a clean API boundary
 */
export {
  canRedoRx,
  canUndoRx,
  currentGraphRx,
  GraphWorkspaceRxRuntime,
  workspaceActionsRx,
  workspaceEventsRx,
  workspaceStatsRx
}

/**
 * Web-specific reactive values for UI state
 * These don't belong in the domain layer - using writable pattern
 */
export const selectedNodeIdRx = Rx.make<string | null>(() => null)
export const isProcessingRx = Rx.make<boolean>(() => false)
export const uiModeRx = Rx.make<"graph" | "table" | "tree">(() => "graph")

// Layout-specific UI state - writable with setSelf
export const focusedLevelRx = Rx.make<number>((_get) => {
  // Default focus on sentences
  return 2
})

export const currentTransformRx = Rx.make<{
  from: string
  to: string
  op: string
}>((_get) => ({
  from: "Sections",
  to: "Sentences",
  op: "tokenize"
}))

/**
 * Derived reactive values combining domain and UI state
 */
export const selectedNodeRx = Rx.make((get) => {
  const graphResult = get(currentGraphRx)
  const selectedId = get(selectedNodeIdRx)

  if (!selectedId) return null

  return Result.match(graphResult, {
    onInitial: () => null,
    onFailure: () => null,
    onSuccess: (graph) => {
      // Find node in graph by selectedId - assuming graph has nodes array
      const node = (graph as any).nodes?.find?.((n: any) => n.id === selectedId)
      return node || null
    }
  })
})

/**
 * Action functions for UI state management
 */
export const setFocusedLevelRx = Rx.fn((level: number, get: Rx.FnContext) =>
  Effect.sync(() => {
    // Update focused level using setSelf
    get.setSelf(focusedLevelRx)

    // Update current transform based on level
    const transforms = [
      { from: "Document", to: "Sections", op: "split" },
      { from: "Sections", to: "Sentences", op: "tokenize" },
      { from: "Sentences", to: "Tokens", op: "parse" },
      { from: "Tokens", to: "Analysis", op: "analyze" }
    ]

    if (transforms[level]) {
      get.setSelf(currentTransformRx)
    }

    return level
  })
)
