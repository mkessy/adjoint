import {
  canRedoRx,
  canUndoRx,
  currentGraphRx,
  GraphWorkspaceRxRuntime,
  workspaceActionsRx,
  workspaceEventsRx,
  workspaceStatsRx
} from "@adjoint/domain/engine/services/GraphWorkspaceRxRuntime"
import { Rx } from "@effect-rx/rx"

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
 * These don't belong in the domain layer
 */
export const selectedNodeIdRx = Rx.make<string | null>(() => null)
export const isProcessingRx = Rx.make<boolean>(() => false)
export const uiModeRx = Rx.make<"graph" | "table" | "tree">(() => "graph")

/**
 * Derived reactive values combining domain and UI state
 */
export const selectedNodeRx = Rx.make(() => null)
