# Effect-RX Implementation Guide

## Current vs Target Architecture

### Current Issues

Your `GraphWorkspaceRuntime` returns `Promise<Stream>` but effect-rx expects `Rx<Result<T>>` objects. The hooks are incompatible with effect-rx React integration.

### Target: Proper Effect-RX Integration

## 1. Domain Layer: Create Rx Runtime

```typescript
// packages/domain/src/engine/services/GraphWorkspaceRxRuntime.ts
import { Rx } from "@effect-rx/rx"
import { Duration, Effect, Schedule, Stream } from "effect"
import type { Graph } from "../../graph/graph.js"
import {
  WorkspaceStateService,
  WorkspaceStateServiceLive,
  WorkspaceStats
} from "./WorkspaceStateService.js"

/**
 * Main Rx Runtime - converts Effect services to reactive values
 * This is the bridge between domain services and UI
 */
export const GraphWorkspaceRxRuntime = Rx.runtime(WorkspaceStateServiceLive)

/**
 * Current graph as reactive value
 * UI components can subscribe to this for automatic updates
 */
export const currentGraphRx: Rx.Rx<Result.Result<Graph, never>> =
  GraphWorkspaceRxRuntime.rx(
    Effect.gen(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.currentGraph
    })
  )

/**
 * Workspace statistics as reactive value
 * Updates automatically based on workspace changes
 */
export const workspaceStatsRx: Rx.Rx<Result.Result<WorkspaceStats, never>> =
  GraphWorkspaceRxRuntime.rx(
    Effect.gen(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.getStats
    })
  )

/**
 * Workspace events stream as reactive value
 * For notifications, animations, analytics
 */
export const workspaceEventsRx: Rx.Rx<Result.Result<WorkspaceEvent, never>> =
  Rx.make(
    Effect.gen(function* () {
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
    Effect.fnUntraced(function* (initialGraph: Graph) {
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
    Effect.fnUntraced(function* (
      graph: Graph,
      operation: string = "user-action",
      metadata: Record<string, unknown> = {}
    ) {
      const workspace = yield* WorkspaceStateService
      yield* workspace.commitGraph(graph, operation, metadata)
    })
  ),

  /**
   * Undo last operation
   */
  undo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.undo
    })
  ),

  /**
   * Redo next operation
   */
  redo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.redo
    })
  ),

  /**
   * Get current graph (for imperative access)
   */
  getCurrentGraph: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.currentGraph
    })
  ),

  /**
   * Clear workspace history
   */
  clearHistory: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      yield* workspace.clearHistory
    })
  )
}

/**
 * Export reactive booleans for UI state
 */
export const canUndoRx: Rx.Rx<Result.Result<boolean, never>> =
  GraphWorkspaceRxRuntime.rx(
    Effect.gen(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.canUndo
    })
  )

export const canRedoRx: Rx.Rx<Result.Result<boolean, never>> =
  GraphWorkspaceRxRuntime.rx(
    Effect.gen(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.canRedo
    })
  )
```

## 2. Web Layer: Clean Service Integration

```typescript
// packages/web/src/services/WorkspaceRx.ts
import { Result } from "effect"
import {
  currentGraphRx,
  workspaceStatsRx,
  workspaceEventsRx,
  workspaceActionsRx,
  canUndoRx,
  canRedoRx,
  GraphWorkspaceRxRuntime
} from "@adjoint/domain/engine/services/GraphWorkspaceRxRuntime"

/**
 * Re-export domain Rx objects for React components
 * This creates a clean API boundary
 */
export {
  currentGraphRx,
  workspaceStatsRx,
  workspaceEventsRx,
  workspaceActionsRx,
  canUndoRx,
  canRedoRx,
  GraphWorkspaceRxRuntime
}

/**
 * Web-specific reactive values can be added here
 * For example, UI state that doesn't belong in domain
 */
export const selectedNodeIdRx = Rx.state<string | null>(null)
export const isProcessingRx = Rx.state<boolean>(false)
export const uiModeRx = Rx.state<"graph" | "table" | "tree">("graph")

/**
 * Derived reactive values combining domain and UI state
 */
export const selectedNodeRx = Rx.make(
  Effect.gen(function* () {
    const graph = yield* Result.match(currentGraphRx.get(), {
      onSuccess: (graph) => Effect.succeed(graph),
      onFailure: () => Effect.succeed(null)
    })
    const selectedId = yield* selectedNodeIdRx.get()

    if (!graph || !selectedId) return null
    return graph.nodes.get(selectedId) ?? null
  })
)
```

## 3. React Components: Proper Effect-RX Usage

```typescript
// packages/web/src/components/GraphWorkspace.tsx
import React, { Suspense } from "react"
import { Result } from "effect"
import {
  useRx,
  useRxSuspenseSuccess,
  useRxSetPromise
} from "@effect-rx/rx-react"
import { Graph as GraphAPI } from "@adjoint/domain"
import {
  currentGraphRx,
  workspaceStatsRx,
  workspaceActionsRx,
  canUndoRx,
  canRedoRx,
  selectedNodeIdRx,
  isProcessingRx
} from "../services/WorkspaceRx.js"

const { Graph } = GraphAPI

export const GraphWorkspace: React.FC = () => {
  return (
    <div className="app">
      <div className="app-header">
        <h1>Algebraic Graph Workspace</h1>
      </div>

      <Suspense fallback={<div>Loading workspace...</div>}>
        <WorkspaceContent />
      </Suspense>
    </div>
  )
}

const WorkspaceContent: React.FC = () => {
  // Reactive values - automatically update when domain state changes
  const currentGraph = useRxSuspenseSuccess(currentGraphRx)
  const stats = useRxSuspenseSuccess(workspaceStatsRx)
  const canUndo = useRxSuspenseSuccess(canUndoRx)
  const canRedo = useRxSuspenseSuccess(canRedoRx)

  // Local UI state
  const [selectedNodeId, setSelectedNodeId] = useRx(selectedNodeIdRx)
  const [isProcessing, setIsProcessing] = useRx(isProcessingRx)

  // Action functions
  const commitGraph = useRxSetPromise(workspaceActionsRx.commitGraph)
  const undo = useRxSetPromise(workspaceActionsRx.undo)
  const redo = useRxSetPromise(workspaceActionsRx.redo)

  // Event handlers
  const handleAddNode = async () => {
    setIsProcessing(true)
    try {
      const newNode = new GraphAPI.Node.SourceDataNode({
        id: `source-${Date.now()}` as GraphAPI.Node.NodeId,
        sourceUri: "https://example.com/data",
        createdAt: DateTime.unsafeFromDate(new Date()),
        lastSeenBy: "user-action" as GraphAPI.Node.NodeId
      })

      const updatedGraph = Graph.addNode(newNode)(currentGraph.value)
      await commitGraph(updatedGraph, "add-source-node", { nodeId: newNode.id })
    } catch (error) {
      console.error("Failed to add node:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUndo = async () => {
    if (canUndo.value) {
      const result = await undo()
      Result.match(result, {
        onSuccess: () => console.log("Undo successful"),
        onFailure: (error) => console.error("Undo failed:", error)
      })
    }
  }

  const handleRedo = async () => {
    if (canRedo.value) {
      const result = await redo()
      Result.match(result, {
        onSuccess: () => console.log("Redo successful"),
        onFailure: (error) => console.error("Redo failed:", error)
      })
    }
  }

  return (
    <div className="workspace">
      {/* Stats display - automatically updates */}
      <div className="stats">
        <span>Nodes: {Graph.countNodes()(currentGraph.value)}</span>
        <span>Edges: {currentGraph.value.edges.length}</span>
        <span>History: {stats.value.totalGraphs}</span>
        <span>Can Undo: {canUndo.value ? "Yes" : "No"}</span>
        <span>Can Redo: {canRedo.value ? "Yes" : "No"}</span>
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={handleAddNode} disabled={isProcessing}>
          {isProcessing ? "Adding..." : "Add Source Node"}
        </button>

        <button onClick={handleUndo} disabled={!canUndo.value}>
          Undo
        </button>

        <button onClick={handleRedo} disabled={!canRedo.value}>
          Redo
        </button>
      </div>

      {/* Graph visualization */}
      <GraphVisualization
        graph={currentGraph.value}
        selectedNodeId={selectedNodeId}
        onNodeSelect={setSelectedNodeId}
      />

      {/* Node details */}
      {selectedNodeId && (
        <NodeDetails graph={currentGraph.value} nodeId={selectedNodeId} />
      )}
    </div>
  )
}

// Simple visualization component
const GraphVisualization: React.FC<{
  graph: GraphAPI.Graph.Graph
  selectedNodeId: string | null
  onNodeSelect: (id: string | null) => void
}> = ({ graph, selectedNodeId, onNodeSelect }) => {
  const nodes = Array.from(graph.nodes.values())

  return (
    <div className="graph-visualization">
      {nodes.length === 0 ? (
        <div className="empty">No nodes in graph</div>
      ) : (
        <div className="nodes-grid">
          {nodes.map((node: any) => (
            <div
              key={node.id}
              onClick={() => onNodeSelect(node.id)}
              className={`node-item ${
                selectedNodeId === node.id ? "selected" : ""
              }`}
            >
              <div className="node-type">{node._tag}</div>
              <div className="node-id">{node.id.slice(0, 8)}...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const NodeDetails: React.FC<{
  graph: GraphAPI.Graph.Graph
  nodeId: string
}> = ({ graph, nodeId }) => {
  const node = graph.nodes.get(nodeId)

  if (!node) return null

  return (
    <div className="node-details">
      <h3>Selected Node</h3>
      <div className="details">
        <div>
          <strong>ID:</strong> {(node as any).id}
        </div>
        <div>
          <strong>Type:</strong> {(node as any)._tag}
        </div>
        <div>
          <strong>Created:</strong>{" "}
          {new Date((node as any).createdAt).toLocaleString()}
        </div>
        {(node as any)._tag === "SourceDataNode" && (
          <div>
            <strong>Source:</strong> {(node as any).sourceUri}
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphWorkspace
```

## 4. Simplified App Setup

```typescript
// packages/web/src/services/AppRuntime.tsx (simplified)
import React from "react"

/**
 * Much simpler app setup - effect-rx handles the reactive runtime
 * No need for complex runtime management
 */
export const AppRuntime = {
  Provider: ({ children }: { children: React.ReactNode }) => {
    // Just a simple provider wrapper
    // All reactive state is handled by effect-rx
    return <>{children}</>
  }
}
```

```typescript
// packages/web/src/App.tsx (updated)
import "./App.css"
import { AppRuntime } from "./services/AppRuntime.js"
import GraphWorkspace from "./components/GraphWorkspace.js"

function App() {
  return (
    <AppRuntime.Provider>
      <GraphWorkspace />
    </AppRuntime.Provider>
  )
}

export default App
```

## Key Benefits of This Architecture

### 1. **True Reactive Programming**

- UI automatically updates when domain state changes
- No manual state synchronization needed
- Efficient, minimal re-renders

### 2. **Clean Separation**

- Domain: Pure Effect services
- Integration: effect-rx bridge
- UI: React components with hooks

### 3. **Type Safety**

- Full TypeScript support through effect-rx
- Compile-time guarantees for reactive values
- No runtime type errors

### 4. **Performance**

- Efficient reactive updates
- Only components using changed data re-render
- Built-in suspense support

### 5. **Testability**

- Domain services easily testable with Effect
- Rx values can be tested independently
- React components use standard testing patterns

## Migration Steps

1. **Create `GraphWorkspaceRxRuntime.ts`** - Add to domain layer
2. **Update web services** - Create `WorkspaceRx.ts`
3. **Refactor components** - Use proper effect-rx hooks
4. **Test integration** - Ensure reactive updates work
5. **Clean up** - Remove old runtime code

This architecture follows effect-rx best practices and provides the clean separation you're looking for between domain logic and UI concerns.
