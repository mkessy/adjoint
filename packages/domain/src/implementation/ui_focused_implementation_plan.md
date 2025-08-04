# UI-Focused Implementation Plan: Reprioritized Steps 3 & 4

## **Priority-Based Approach for Rapid UI Development**

Based on the feedback in `graph_engine_01.md`, we're reprioritizing the implementation to focus on **local-first UI enablement** rather than comprehensive engine infrastructure. This approach will get us to a working UI much faster.

---

## **🎯 PRIORITY 1: WorkspaceStateService - The Foundation**

### **The Single Source of Truth for UI State**

The `WorkspaceStateService` is the **most critical service** for the UI. It manages the sequence of immutable `Graph` states and provides reactive updates.

```typescript
// packages/domain/src/engine/services/WorkspaceStateService.ts
import { Effect, Context, Ref, Chunk, Stream, Hub, PubSub } from "effect"

export class WorkspaceStateService extends Context.Tag("WorkspaceStateService")<
  WorkspaceStateService,
  {
    readonly currentGraph: Effect.Effect<Graph, never>
    readonly graphStream: Stream.Stream<Graph, never>
    readonly commitGraph: (graph: Graph) => Effect.Effect<void, never>
    readonly undo: Effect.Effect<Option.Option<Graph>, never>
    readonly redo: Effect.Effect<Option.Option<Graph>, never>
    readonly getHistory: Effect.Effect<Chunk.Chunk<GraphSnapshot>, never>
    readonly canUndo: Effect.Effect<boolean, never>
    readonly canRedo: Effect.Effect<boolean, never>
  }
>() {}

// Internal state representation
class GraphSnapshot extends Data.TaggedClass("GraphSnapshot")<{
  readonly graph: Graph
  readonly timestamp: DateTime.DateTime
  readonly operation: string // "initial" | "transform" | "compose" | "undo" | "redo"
  readonly metadata: Record<string, unknown>
}> {}

class WorkspaceState extends Data.TaggedClass("WorkspaceState")<{
  readonly history: Chunk.Chunk<GraphSnapshot>
  readonly currentIndex: number
  readonly maxHistorySize: number
}> {}
```

### **Implementation with Reactive Streams**

```typescript
const makeWorkspaceStateService = Effect.gen(function* () {
  // Core state management
  const state = yield* Ref.make(
    new WorkspaceState({
      history: Chunk.empty(),
      currentIndex: -1,
      maxHistorySize: 100
    })
  )

  // Reactive stream for UI updates - this is the KEY for effect-rx integration
  const graphHub = yield* Hub.bounded<Graph>(16)
  const graphStream = Stream.fromHub(graphHub)

  const getCurrentGraph = Effect.gen(function* () {
    const currentState = yield* Ref.get(state)
    if (currentState.currentIndex === -1) {
      return yield* Effect.fail(new Error("No graph in workspace"))
    }
    const snapshot = Chunk.get(currentState.history, currentState.currentIndex)
    return Option.map(snapshot, (s) => s.graph).pipe(
      Option.getOrElse(() => Effect.die("Invalid state"))
    )
  }).pipe(Effect.flatten)

  const commitGraph = (graph: Graph) =>
    Effect.gen(function* () {
      const now = yield* DateTime.now
      const newSnapshot = new GraphSnapshot({
        graph,
        timestamp: now,
        operation: "transform",
        metadata: {}
      })

      yield* Ref.update(state, (currentState) => {
        // Truncate history if we're not at the end (branching from middle)
        const newHistory =
          currentState.currentIndex === currentState.history.length - 1
            ? Chunk.append(currentState.history, newSnapshot)
            : Chunk.append(
                Chunk.take(currentState.history, currentState.currentIndex + 1),
                newSnapshot
              )

        // Maintain max history size
        const trimmedHistory =
          newHistory.length > currentState.maxHistorySize
            ? Chunk.drop(
                newHistory,
                newHistory.length - currentState.maxHistorySize
              )
            : newHistory

        return new WorkspaceState({
          history: trimmedHistory,
          currentIndex: trimmedHistory.length - 1,
          maxHistorySize: currentState.maxHistorySize
        })
      })

      // Emit the new graph to reactive stream - THIS IS CRITICAL FOR UI
      yield* Hub.publish(graphHub, graph)
      yield* Effect.logInfo("Graph committed to workspace", {
        graphId: graph.id,
        nodeCount: graph.nodes.size
      })
    })

  const undo = Effect.gen(function* () {
    const currentState = yield* Ref.get(state)
    if (currentState.currentIndex <= 0) {
      return Option.none()
    }

    yield* Ref.update(state, (s) => ({
      ...s,
      currentIndex: s.currentIndex - 1
    }))
    const undoGraph = yield* getCurrentGraph
    yield* Hub.publish(graphHub, undoGraph)

    return Option.some(undoGraph)
  })

  const redo = Effect.gen(function* () {
    const currentState = yield* Ref.get(state)
    if (currentState.currentIndex >= currentState.history.length - 1) {
      return Option.none()
    }

    yield* Ref.update(state, (s) => ({
      ...s,
      currentIndex: s.currentIndex + 1
    }))
    const redoGraph = yield* getCurrentGraph
    yield* Hub.publish(graphHub, redoGraph)

    return Option.some(redoGraph)
  })

  return WorkspaceStateService.of({
    currentGraph: getCurrentGraph,
    graphStream,
    commitGraph,
    undo,
    redo,
    getHistory: Ref.get(state).pipe(Effect.map((s) => s.history)),
    canUndo: Ref.get(state).pipe(Effect.map((s) => s.currentIndex > 0)),
    canRedo: Ref.get(state).pipe(
      Effect.map((s) => s.currentIndex < s.history.length - 1)
    )
  })
})

export const WorkspaceStateServiceLive = Layer.effect(
  WorkspaceStateService,
  makeWorkspaceStateService
)
```

---

## **🎯 PRIORITY 2: Simplified AdjointEngine API**

### **UI-Friendly Public Interface**

The engine's primary job is now to **work with the WorkspaceStateService**, not expose complex compilation/execution details.

```typescript
// packages/domain/src/engine/services/AdjointEngine.ts
export class AdjointEngine extends Context.Tag("AdjointEngine")<
  AdjointEngine,
  {
    // PRIMARY UI INTERFACE - single atomic operation
    readonly materialize: (
      transformation: GraphTransformation
    ) => Effect.Effect<JobId, MaterializationError>

    // Job management for long-running operations
    readonly getJobStatus: (
      jobId: JobId
    ) => Effect.Effect<JobStatus, JobNotFoundError>
    readonly subscribeToJob: (
      jobId: JobId
    ) => Stream.Stream<JobUpdate, JobNotFoundError>
    readonly cancelJob: (jobId: JobId) => Effect.Effect<void, JobNotFoundError>

    // Quick operations that don't need job tracking
    readonly previewTransformation: (
      transformation: GraphTransformation
    ) => Effect.Effect<PreviewResult, PreviewError>
  }
>() {}

// Job-based execution model
export type JobId = string & Brand.Brand<"JobId">
export const JobId = Brand.nominal<JobId>()

export class JobStatus extends Data.TaggedEnum<{
  Pending: {}
  Running: { progress: number; currentStep: string }
  Completed: { result: Graph; duration: Duration.Duration }
  Failed: { error: MaterializationError; duration: Duration.Duration }
  Cancelled: { reason: string }
}>() {}

export class JobUpdate extends Data.TaggedEnum<{
  Started: { jobId: JobId; timestamp: DateTime.DateTime }
  Progress: { jobId: JobId; progress: number; message: string }
  Completed: { jobId: JobId; result: Graph }
  Failed: { jobId: JobId; error: MaterializationError }
}>() {}
```

### **Implementation with WorkspaceStateService Integration**

```typescript
const makeAdjointEngine = Effect.gen(function* () {
  const workspaceState = yield* WorkspaceStateService
  const jobRegistry = yield* Ref.make(new Map<JobId, JobStatus>())
  const jobHub = yield* Hub.bounded<JobUpdate>(32)

  const materialize = (transformation: GraphTransformation) =>
    Effect.gen(function* () {
      const jobId = JobId(crypto.randomUUID())

      // Get current graph from workspace
      const currentGraph = yield* workspaceState.currentGraph

      // Register job
      yield* Ref.update(jobRegistry, (registry) =>
        registry.set(jobId, JobStatus.Pending({}))
      )
      yield* Hub.publish(
        jobHub,
        JobUpdate.Started({ jobId, timestamp: yield* DateTime.now })
      )

      // Fork the actual processing
      yield* Effect.fork(
        Effect.gen(function* () {
          yield* Ref.update(jobRegistry, (registry) =>
            registry.set(
              jobId,
              JobStatus.Running({ progress: 0, currentStep: "Compilation" })
            )
          )

          // Apply transformation to current graph
          const newGraph = yield* applyTransformation(
            currentGraph,
            transformation
          )

          yield* Ref.update(jobRegistry, (registry) =>
            registry.set(
              jobId,
              JobStatus.Running({ progress: 50, currentStep: "Validation" })
            )
          )

          // Validate the new graph
          yield* validateGraph(newGraph)

          yield* Ref.update(jobRegistry, (registry) =>
            registry.set(
              jobId,
              JobStatus.Running({ progress: 80, currentStep: "Committing" })
            )
          )

          // Commit back to workspace - THIS IS THE KEY INTEGRATION
          yield* workspaceState.commitGraph(newGraph)

          // Mark complete
          yield* Ref.update(jobRegistry, (registry) =>
            registry.set(
              jobId,
              JobStatus.Completed({
                result: newGraph,
                duration: Duration.seconds(1) // TODO: track actual duration
              })
            )
          )
          yield* Hub.publish(
            jobHub,
            JobUpdate.Completed({ jobId, result: newGraph })
          )
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Ref.update(jobRegistry, (registry) =>
                registry.set(
                  jobId,
                  JobStatus.Failed({
                    error: new MaterializationError({ cause: error }),
                    duration: Duration.seconds(0.5)
                  })
                )
              )
              yield* Hub.publish(jobHub, JobUpdate.Failed({ jobId, error }))
            })
          )
        )
      )

      return jobId
    })

  const previewTransformation = (transformation: GraphTransformation) =>
    Effect.gen(function* () {
      const currentGraph = yield* workspaceState.currentGraph

      // Quick preview without committing to workspace
      const previewGraph = yield* applyTransformation(
        currentGraph,
        transformation
      )
      const sampleResult = yield* extractSampleResult(previewGraph)

      return new PreviewResult({
        transformedNodes: sampleResult.nodes.length,
        sampleOutput: sampleResult.sample,
        estimatedDuration: Duration.millis(500)
      })
    })

  return AdjointEngine.of({
    materialize,
    getJobStatus: (jobId) =>
      Ref.get(jobRegistry).pipe(
        Effect.flatMap((registry) =>
          Option.fromNullable(registry.get(jobId)).pipe(
            Option.match({
              onNone: () => Effect.fail(new JobNotFoundError({ jobId })),
              onSome: (status) => Effect.succeed(status)
            })
          )
        )
      ),
    subscribeToJob: (jobId) =>
      Stream.fromHub(jobHub).pipe(
        Stream.filter((update) => {
          switch (update._tag) {
            case "Started":
            case "Progress":
            case "Completed":
            case "Failed":
              return update.jobId === jobId
          }
        })
      ),
    cancelJob: (jobId) => Effect.succeed(void 0), // TODO: implement cancellation
    previewTransformation
  })
})

export const AdjointEngineLive = Layer.effect(
  AdjointEngine,
  makeAdjointEngine
).pipe(Layer.provide(WorkspaceStateServiceLive))
```

---

## **🎯 PRIORITY 3: Graph Transformation Types**

### **Simple, Composable Transformation API**

```typescript
// packages/domain/src/engine/types/GraphTransformation.ts
export class GraphTransformation extends Data.TaggedEnum<{
  AddNode: { node: Node.AnyNode; position?: { x: number; y: number } }
  RemoveNode: { nodeId: Node.NodeId }
  AddEdge: { edge: Edge.Edge }
  RemoveEdge: { from: Node.NodeId; to: Node.NodeId; type: Edge.EdgeType }
  ApplyAlgebra: {
    algebraNode: Node.AlgebraNode
    targetNodeId: Node.NodeId
    preview?: boolean
  }
  Compose: {
    sourceGraph: Graph
    transformation: Node.StrategyNode
  }
}>() {}

// Helper functions for UI
export const addAlgebraTransformation = (
  prompt: string,
  targetNodeId: Node.NodeId
) =>
  Effect.gen(function* () {
    // Generate algebra node from prompt (this would use AI/NLP)
    const algebraNode = yield* generateAlgebraFromPrompt(prompt)

    return GraphTransformation.ApplyAlgebra({
      algebraNode,
      targetNodeId,
      preview: false
    })
  })

export const composeGraphs = (strategy: Node.StrategyNode) =>
  GraphTransformation.Compose({
    sourceGraph: Graph.empty(), // Will be filled from current workspace
    transformation: strategy
  })
```

---

## **🎯 UI Integration Strategy**

### **effect-rx Integration Points**

```typescript
// packages/web/src/services/GraphWorkspaceRuntime.ts
import { Runtime, ManagedRuntime } from "effect"
import { Rx, RxRef } from "@effect-rx/rx-react"

export class GraphWorkspaceRuntime {
  private runtime = ManagedRuntime.make(
    Layer.mergeAll(WorkspaceStateServiceLive, AdjointEngineLive)
  )

  // The main reactive state for the UI
  readonly currentGraph = Rx.runtime(this.runtime).stream(
    Effect.serviceWithEffect(
      WorkspaceStateService,
      (service) => service.graphStream
    )
  )

  // UI actions
  readonly materializeTransformation = (transformation: GraphTransformation) =>
    this.runtime.runPromise(
      Effect.serviceWithEffect(AdjointEngine, (engine) =>
        engine.materialize(transformation)
      )
    )

  readonly undo = () =>
    this.runtime.runPromise(
      Effect.serviceWithEffect(WorkspaceStateService, (service) => service.undo)
    )

  readonly redo = () =>
    this.runtime.runPromise(
      Effect.serviceWithEffect(WorkspaceStateService, (service) => service.redo)
    )

  async dispose() {
    await this.runtime.dispose()
  }
}
```

### **React Component Integration**

```typescript
// packages/web/src/components/GraphWorkspace.tsx
import { Rx } from "@effect-rx/rx-react"

export const GraphWorkspace = () => {
  const graph = Rx.use(runtime.currentGraph)
  const [selectedNodeId, setSelectedNodeId] = useState<Node.NodeId | null>(null)

  const handleApplyAlgebra = async (prompt: string) => {
    if (!selectedNodeId) return

    const transformation = await addAlgebraTransformation(
      prompt,
      selectedNodeId
    )
    await runtime.materializeTransformation(transformation)
    // UI automatically updates via reactive stream!
  }

  return (
    <div className="graph-workspace">
      <GraphVisualization graph={graph} onNodeSelect={setSelectedNodeId} />
      <ControlPanel
        selectedNodeId={selectedNodeId}
        onApplyAlgebra={handleApplyAlgebra}
      />
      <WorkspaceHistory />
    </div>
  )
}
```

---

## **🏁 Implementation Timeline**

### **Week 1: Foundation (PRIORITY 1)**

- [ ] WorkspaceStateService with reactive streams
- [ ] Basic Graph transformation types
- [ ] Simple in-memory state management
- [ ] Basic undo/redo functionality

### **Week 2: Engine Integration (PRIORITY 4)**

- [ ] Simplified AdjointEngine with job model
- [ ] Graph transformation application logic
- [ ] Job status tracking and updates
- [ ] Preview functionality

### **Week 3: UI Integration**

- [ ] effect-rx runtime integration
- [ ] Basic React components
- [ ] Reactive graph visualization
- [ ] Control panel with algebra input

### **Week 4: Polish & Testing**

- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation

---

## **🎯 Key Success Metrics**

1. **UI Reactivity**: Graph changes trigger immediate UI updates
2. **State Persistence**: Undo/redo works reliably across all operations
3. **Instant Feedback**: Preview shows results in <100ms
4. **Job Management**: Long operations don't block the UI
5. **Composability**: Transformations can be chained and combined

This reprioritized plan puts **UI enablement first**, ensuring we can get to a working interactive interface as quickly as possible while maintaining the solid architectural foundation we've designed.
