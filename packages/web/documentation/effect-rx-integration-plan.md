# Effect-RX Integration Plan for Adjoint GraphWorkspace

## Current Architecture Analysis

### Issues Identified

1. **Wrong Return Types**: Current `GraphWorkspaceRuntime` returns `Promise<Stream>` but effect-rx expects `Rx` objects
2. **Missing Rx Integration**: No proper conversion from Effect streams to effect-rx reactive values
3. **Incorrect Hook Usage**: React components try to use promises with effect-rx hooks
4. **Layer Separation**: Domain and UI concerns are mixed

## Target Architecture

### Domain Layer (packages/domain)

- **Pure Effect Services**: WorkspaceStateService returns Effect/Stream
- **Business Logic**: All graph operations, state management, event handling
- **No UI Dependencies**: No knowledge of React or effect-rx

### Integration Layer (packages/domain/engine)

- **Rx Runtime**: Convert Effect services to Rx reactive values
- **Clean API**: Expose typed Rx objects for UI consumption
- **Service Bridge**: Bridge between Effect domain services and effect-rx

### UI Layer (packages/web)

- **React Components**: Use effect-rx hooks for reactive state
- **UI State**: Local component state, UI-specific concerns only
- **Event Handling**: Dispatch actions through Rx runtime

## Implementation Plan

### Phase 1: Domain Layer Rx Runtime

Create a proper effect-rx runtime in the domain layer:

```typescript
// packages/domain/src/engine/services/GraphWorkspaceRxRuntime.ts
import { Rx } from "@effect-rx/rx"
import { Duration, Schedule, Stream } from "effect"
import {
  WorkspaceStateService,
  WorkspaceStateServiceLive
} from "./WorkspaceStateService.js"

// Create the main Rx runtime from our domain services
export const GraphWorkspaceRxRuntime = Rx.runtime(WorkspaceStateServiceLive)

// Create reactive values (Rx objects) from our domain streams
export const currentGraphRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.currentGraph
  })
)

export const graphStreamRx = Rx.make(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return workspace.graphStream
  })
)

export const workspaceStatsRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    const stats = yield* workspace.getStats
    return stats
  })
)

// Create action functions that return Rx functions
export const workspaceActionsRx = {
  commitGraph: GraphWorkspaceRxRuntime.fn(
    Effect.fnUntraced(function* (
      graph: Graph,
      operation: string,
      metadata: Record<string, unknown>
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
  )
}
```

### Phase 2: Web Layer Integration

Update the web package to properly use effect-rx:

```typescript
// packages/web/src/services/WorkspaceRx.ts
import {
  currentGraphRx,
  workspaceStatsRx,
  workspaceActionsRx,
  GraphWorkspaceRxRuntime
} from "@adjoint/domain/engine/services/GraphWorkspaceRxRuntime"

// Re-export the Rx objects for React components
export {
  currentGraphRx,
  workspaceStatsRx,
  workspaceActionsRx,
  GraphWorkspaceRxRuntime
}

// Create event stream Rx for notifications
export const workspaceEventsRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return workspace.eventStream
  })
)
```

### Phase 3: React Component Updates

Update components to use proper effect-rx hooks:

```typescript
// packages/web/src/components/GraphWorkspace.tsx
import {
  useRx,
  useRxSuspenseSuccess,
  useRxSetPromise
} from "@effect-rx/rx-react"
import {
  currentGraphRx,
  workspaceStatsRx,
  workspaceActionsRx
} from "../services/WorkspaceRx.js"

export const GraphWorkspace: React.FC = () => {
  // Use proper effect-rx hooks
  const currentGraph = useRxSuspenseSuccess(currentGraphRx)
  const stats = useRxSuspenseSuccess(workspaceStatsRx)

  // Use Rx actions
  const commitGraph = useRxSetPromise(workspaceActionsRx.commitGraph)
  const undo = useRxSetPromise(workspaceActionsRx.undo)
  const redo = useRxSetPromise(workspaceActionsRx.redo)

  const handleAddNode = async () => {
    const newNode = createNewNode()
    const updatedGraph = Graph.addNode(currentGraph.value)(newNode)
    await commitGraph(updatedGraph, "add-node", {})
  }

  return (
    <div className="workspace">
      <div className="stats">
        <span>Nodes: {Graph.countNodes()(currentGraph.value)}</span>
        <span>Can Undo: {stats.value.canUndo ? "Yes" : "No"}</span>
      </div>

      <button onClick={handleAddNode}>Add Node</button>
      <button onClick={() => undo()} disabled={!stats.value.canUndo}>
        Undo
      </button>
      <button onClick={() => redo()} disabled={!stats.value.canRedo}>
        Redo
      </button>
    </div>
  )
}
```

## Benefits of This Architecture

### Clean Separation of Concerns

- **Domain**: Pure Effect services, no UI dependencies
- **Integration**: effect-rx bridge, converts Effect to Rx
- **UI**: React components using effect-rx hooks

### Reactive by Default

- **Automatic Updates**: UI automatically updates when domain state changes
- **Type Safety**: Full TypeScript support through effect-rx
- **Performance**: Efficient reactive updates, no unnecessary re-renders

### Testable

- **Domain Services**: Easy to test with Effect test utilities
- **Rx Integration**: Can test Rx behavior independently
- **React Components**: Can test with effect-rx test utilities

## Migration Strategy

### Step 1: Create New Rx Runtime

1. Create `GraphWorkspaceRxRuntime.ts` in domain
2. Export Rx objects for current state, events, actions
3. Keep existing GraphWorkspaceRuntime for backward compatibility

### Step 2: Update Web Services

1. Create `WorkspaceRx.ts` in web services
2. Re-export domain Rx objects
3. Add any web-specific Rx values (UI state, etc.)

### Step 3: Update Components

1. Replace promise-based hooks with effect-rx hooks
2. Use `useRx`, `useRxSuspenseSuccess` for reactive values
3. Use `useRxSetPromise` for actions

### Step 4: Clean Up

1. Remove old GraphWorkspaceRuntime hooks
2. Remove intermediate AppRuntime.tsx complexity
3. Simplify component state management

## Key Effect-RX Patterns to Use

### 1. Rx.runtime() for Services

```typescript
const runtime = Rx.runtime(YourServiceLayer)
const dataRx = runtime.rx(yourEffect)
```

### 2. Rx.make() for Streams

```typescript
const streamRx = Rx.make(yourStream)
```

### 3. Rx.fn() for Actions

```typescript
const actionRx = runtime.fn(yourEffectFunction)
```

### 4. React Hooks

```typescript
const data = useRxSuspenseSuccess(dataRx)
const action = useRxSetPromise(actionRx)
```

## Expected Outcomes

1. **Simpler Code**: Less boilerplate, more declarative
2. **Better Performance**: Efficient reactive updates
3. **Type Safety**: Full TypeScript support
4. **Maintainability**: Clear separation of concerns
5. **Testability**: Each layer easily testable

This architecture follows effect-rx best practices and provides a clean, maintainable foundation for reactive UI development with Effect.
