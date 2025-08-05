// packages/web/src/hooks/useWorkspace.ts
import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import {
  canRedoRx,
  canUndoRx,
  currentGraphRx,
  workspaceActionsRx,
  workspaceEventsRx,
  workspaceStatsRx
} from "../services/WorkspaceRx.js"

/**
 * Hook to get the current graph
 */
export const useCurrentGraph = () => {
  return useRxValue(currentGraphRx)
}

/**
 * Hook to get workspace statistics
 */
export const useWorkspaceStats = () => {
  return useRxValue(workspaceStatsRx)
}

/**
 * Hook to get workspace events stream
 */
export const useWorkspaceEvents = () => {
  return useRxValue(workspaceEventsRx)
}

/**
 * Hook to get workspace actions
 */
export const useWorkspaceActions = () => {
  return {
    initializeWorkspace: useRxSet(workspaceActionsRx.initializeWorkspace),
    commitGraph: useRxSet(workspaceActionsRx.commitGraph),
    undo: useRxSet(workspaceActionsRx.undo),
    redo: useRxSet(workspaceActionsRx.redo),
    getCurrentGraph: useRxSet(workspaceActionsRx.getCurrentGraph),
    clearHistory: useRxSet(workspaceActionsRx.clearHistory)
  }
}

/**
 * Hook to get undo/redo state
 */
export const useUndoRedo = () => {
  const canUndo = useRxValue(canUndoRx)
  const canRedo = useRxValue(canRedoRx)
  return {
    canUndo,
    canRedo
  }
}
