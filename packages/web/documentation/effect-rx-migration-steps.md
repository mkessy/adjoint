# Effect-RX Migration Steps

## Overview

This document provides exact step-by-step instructions to migrate your current GraphWorkspace to proper effect-rx integration.

## Current State Issues

- `GraphWorkspaceRuntime` returns `Promise<Stream>` instead of `Rx` objects
- React hooks expect promises, not `Rx<Result<T>>`
- Manual state management instead of reactive updates

## Migration Steps

### Step 1: Install Effect-RX Dependencies

```bash
cd packages/web
pnpm add @effect-rx/rx @effect-rx/rx-react

cd packages/domain
pnpm add @effect-rx/rx
```

### Step 2: Create Domain Rx Runtime

Create new file: `packages/domain/src/engine/services/GraphWorkspaceRxRuntime.ts`

```typescript
import { Rx } from "@effect-rx/rx"
import { Duration, Effect, Schedule, Stream } from "effect"
import type { Graph } from "../../graph/graph.js"
import {
  WorkspaceStateService,
  WorkspaceStateServiceLive,
  WorkspaceStats
} from "./WorkspaceStateService.js"

// Create main Rx runtime from domain services
export const GraphWorkspaceRxRuntime = Rx.runtime(WorkspaceStateServiceLive)

// Current graph reactive value
export const currentGraphRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.currentGraph
  })
)

// Workspace stats reactive value
export const workspaceStatsRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.getStats
  })
)

// Events stream as reactive value
export const workspaceEventsRx = Rx.make(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return workspace.eventStream
  })
)

// Action functions as Rx.fn
export const workspaceActionsRx = {
  initializeWorkspace: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* (initialGraph: Graph) {
      const workspace = yield* WorkspaceStateService
      yield* workspace.commitGraph(initialGraph, "initial", {
        source: "initialization"
      })
    })
  ),

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

  undo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.undo
    })
  ),

  redo: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.redo
    })
  ),

  getCurrentGraph: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* () {
      const workspace = yield* WorkspaceStateService
      return yield* workspace.currentGraph
    })
  )
}

// Boolean reactive values for UI state
export const canUndoRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.canUndo
  })
)

export const canRedoRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.canRedo
  })
)
```

### Step 3: Update Domain Engine Index

Update `packages/domain/src/engine/index.ts`:

```typescript
// Export the new Rx runtime
export * from "./services/GraphWorkspaceRxRuntime.js"

// Keep existing exports for backward compatibility
export * from "./Engine.js"
export * as Services from "./services/index.js"
```

### Step 4: Create Web Rx Service Layer

Create new file: `packages/web/src/services/WorkspaceRx.ts`

```typescript
import { Rx } from "@effect-rx/rx"
import {
  currentGraphRx,
  workspaceStatsRx,
  workspaceEventsRx,
  workspaceActionsRx,
  canUndoRx,
  canRedoRx,
  GraphWorkspaceRxRuntime
} from "@adjoint/domain/engine/services/GraphWorkspaceRxRuntime"

// Re-export domain Rx objects
export {
  currentGraphRx,
  workspaceStatsRx,
  workspaceEventsRx,
  workspaceActionsRx,
  canUndoRx,
  canRedoRx,
  GraphWorkspaceRxRuntime
}

// Web-specific UI state
export const selectedNodeIdRx = Rx.state<string | null>(null)
export const isProcessingRx = Rx.state<boolean>(false)
```

### Step 5: Update GraphWorkspace Component

Replace `packages/web/src/components/GraphWorkspace.tsx`:

```typescript
import React, { Suspense } from "react"
import { DateTime, Effect, Result } from "effect"
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

      <Suspense fallback={<div className="loading">Loading workspace...</div>}>
        <WorkspaceContent />
      </Suspense>
    </div>
  )
}

const WorkspaceContent: React.FC = () => {
  // Reactive values from domain
  const currentGraph = useRxSuspenseSuccess(currentGraphRx)
  const stats = useRxSuspenseSuccess(workspaceStatsRx)
  const canUndo = useRxSuspenseSuccess(canUndoRx)
  const canRedo = useRxSuspenseSuccess(canRedoRx)

  // Local UI state
  const [selectedNodeId, setSelectedNodeId] = useRx(selectedNodeIdRx)
  const [isProcessing, setIsProcessing] = useRx(isProcessingRx)

  // Action functions
  const initializeWorkspace = useRxSetPromise(
    workspaceActionsRx.initializeWorkspace
  )
  const commitGraph = useRxSetPromise(workspaceActionsRx.commitGraph)
  const undo = useRxSetPromise(workspaceActionsRx.undo)
  const redo = useRxSetPromise(workspaceActionsRx.redo)

  // Initialize workspace on mount
  React.useEffect(() => {
    const personSchema = new GraphAPI.Node.SchemaNode({
      id: "person-schema" as GraphAPI.Node.NodeId,
      schemaId: "person" as GraphAPI.Node.SchemaId,
      definition: {
        _tag: "Schema",
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        }
      },
      createdAt: DateTime.unsafeFromDate(new Date()),
      lastSeenBy: "init" as GraphAPI.Node.NodeId
    })

    const initialGraph = Graph.fromNodes([personSchema])
    initializeWorkspace(initialGraph).catch(console.error)
  }, [initializeWorkspace])

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

  return (
    <div className="app-main">
      {/* Stats */}
      <div className="stats">
        <span>Nodes: {Graph.countNodes()(currentGraph.value)}</span>
        <span>Edges: {currentGraph.value.edges.length}</span>
        <span>History: {stats.value.totalGraphs}</span>
        <span>Can Undo: {canUndo.value ? "Yes" : "No"}</span>
        <span>Can Redo: {canRedo.value ? "Yes" : "No"}</span>
      </div>

      {/* Actions */}
      <div className="actions">
        <button
          onClick={handleAddNode}
          disabled={isProcessing}
          className="btn btn-primary"
        >
          {isProcessing ? "Adding..." : "Add Source Node"}
        </button>

        <button
          onClick={() => undo()}
          disabled={!canUndo.value}
          className="btn btn-secondary"
        >
          Undo
        </button>

        <button
          onClick={() => redo()}
          disabled={!canRedo.value}
          className="btn btn-secondary"
        >
          Redo
        </button>
      </div>

      {/* Graph visualization */}
      <SimpleGraphVisualization
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

const SimpleGraphVisualization: React.FC<{
  graph: any
  selectedNodeId: string | null
  onNodeSelect: (id: string | null) => void
}> = ({ graph, selectedNodeId, onNodeSelect }) => {
  const nodes = graph ? Array.from(graph.nodes.values()) : []

  return (
    <div className="workspace-panel">
      <h2>Graph Visualization</h2>
      <div
        style={{
          minHeight: "400px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1rem"
        }}
      >
        {nodes.length === 0 ? (
          <div className="empty">
            No nodes in graph. Add a source node to begin.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem"
            }}
          >
            {nodes.map((node: any) => (
              <div
                key={node.id}
                onClick={() => onNodeSelect(node.id)}
                className={`node-item ${
                  selectedNodeId === node.id ? "selected" : ""
                }`}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {node._tag}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.25rem"
                  }}
                >
                  ID: {node.id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const NodeDetails: React.FC<{
  graph: any
  nodeId: string
}> = ({ graph, nodeId }) => {
  const node = graph ? graph.nodes.get(nodeId) : null

  if (!node) return null

  return (
    <div className="node-details">
      <h3>Selected Node</h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          fontSize: "0.875rem"
        }}
      >
        <div>
          <span style={{ fontWeight: 500 }}>ID:</span> {node.id}
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Type:</span> {node._tag}
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Created:</span>{" "}
          {new Date(node.createdAt).toLocaleTimeString()}
        </div>
        {node._tag === "SourceDataNode" && node.sourceUri && (
          <div>
            <span style={{ fontWeight: 500 }}>Source:</span> {node.sourceUri}
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphWorkspace
```

### Step 6: Simplify App Runtime

Update `packages/web/src/services/AppRuntime.tsx`:

```typescript
import React from "react"

/**
 * Simplified - effect-rx handles reactive runtime
 */
export const AppRuntime = {
  Provider: ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
  }
}
```

### Step 7: Update App.tsx

Make sure `packages/web/src/App.tsx` is:

```typescript
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

### Step 8: Add CSS for New Components

Add to `packages/web/src/styles/index.css`:

```css
/* Workspace panels */
.workspace-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.workspace-panel h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

/* Stats bar */
.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

/* Actions */
.actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

/* Node items */
.node-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.node-item:hover {
  border-color: #999;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.node-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

/* Node details */
.node-details {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.node-details h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}
```

### Step 9: Test the Migration

1. **Build and start**:

   ```bash
   cd packages/domain && pnpm build
   cd ../web && pnpm dev
   ```

2. **Verify functionality**:
   - Workspace initializes with person schema
   - Add node button works
   - Undo/redo buttons are properly enabled/disabled
   - Stats update automatically
   - Node selection works

### Step 10: Clean Up (Optional)

Once everything works, you can remove:

- Old `createWorkspaceHooks` function from `GraphWorkspaceRuntime.ts`
- Old imports in `AppRuntime.tsx`
- Any unused state management code

## Troubleshooting

### Common Issues

1. **"Rx is not defined"**: Make sure `@effect-rx/rx` is installed in both packages
2. **"useRx is not defined"**: Install `@effect-rx/rx-react` in web package
3. **Type errors**: Ensure all imports use correct paths with `.js` extensions
4. **Runtime errors**: Check that Effect services are properly configured

### Debugging

Add logging to see reactive updates:

```typescript
// In component
React.useEffect(() => {
  console.log("Graph updated:", currentGraph.value)
}, [currentGraph.value])
```

## Expected Results

After migration:

- ✅ UI automatically updates when domain state changes
- ✅ No manual state synchronization needed
- ✅ Type-safe reactive programming
- ✅ Clean separation between domain and UI
- ✅ Better performance with minimal re-renders
- ✅ Proper error handling with Result types

This migration transforms your architecture from manual promise-based state management to true reactive programming with effect-rx!
