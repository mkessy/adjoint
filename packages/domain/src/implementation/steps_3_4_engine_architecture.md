# Adjoint Engine Architecture Plan: Steps 3 & 4

## Service Layer Composition and Execution Engine Implementation

This document outlines the comprehensive architecture plan for implementing Steps 3 and 4 of the Adjoint Graph Engine, focusing on creating a production-ready service layer composition and execution engine based on Effect's patterns.

---

## **Executive Summary**

We will implement a multi-layered architecture that separates concerns between:

1. **Engine Service**: Core compilation and execution coordination
2. **Execution Service**: On-demand node processing with memoization
3. **Metrics Service**: Performance monitoring and observability
4. **Resource Management**: Stream lifecycle and cleanup
5. **Error Handling**: Structured error propagation and recovery

The architecture follows Effect's service-layer patterns with proper dependency injection, resource management, and observability.

---

## **1. Architecture Overview**

### **1.1 Core Service Dependencies**

```
┌─────────────────────────────────────────────────────────────┐
│                     AdjointEngine                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│ │ Execution   │ │   Metrics   │ │  Sampling   │ │  Cache  ││
│ │  Service    │ │   Service   │ │   Service   │ │ Service ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Platform Services                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│ │   Logger    │ │   Tracer    │ │   Clock     │ │ Random  ││
│ │   Service   │ │   Service   │ │   Service   │ │ Service ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────┘
```

### **1.2 Data Flow Architecture**

```
Graph Blueprint → Compilation → ExecutionPlan → Execution → Stream<Target>
      ↓              ↓             ↓              ↓
   Validation   Topological   Node Cache    Resource Mgmt
                  Sort        Memoization    + Cleanup
```

---

## **2. Service Definitions and Tags**

### **2.1 Core Engine Services**

```typescript
// packages/domain/src/engine/services/AdjointEngine.ts
import { Context, Effect, Stream, Cache, Data } from "effect"
import type { Graph } from "../graph/graph.js"
import type * as Node from "../graph/node.js"

export class AdjointEngine extends Context.Tag("AdjointEngine")<
  AdjointEngine,
  {
    readonly compile: (
      graph: Graph
    ) => Effect.Effect<ExecutionPlan, CompilationError>
    readonly execute: <Target>(
      plan: ExecutionPlan
    ) => Stream.Stream<Target, ExecutionError>
    readonly materialize: <Target>(
      graph: Graph
    ) => Stream.Stream<Target, CompilationError | ExecutionError>
  }
>() {}

export class ExecutionService extends Context.Tag("ExecutionService")<
  ExecutionService,
  {
    readonly processNode: (
      nodeId: Node.NodeId
    ) => Effect.Effect<unknown, ExecutionError>
    readonly getNodeResult: (
      nodeId: Node.NodeId
    ) => Effect.Effect<Option.Option<unknown>, never>
    readonly invalidateNode: (nodeId: Node.NodeId) => Effect.Effect<void, never>
    readonly getExecutionStats: Effect.Effect<ExecutionStats, never>
  }
>() {}

export class MetricsService extends Context.Tag("MetricsService")<
  MetricsService,
  {
    readonly nodeExecutionTimer: Metric.Metric.Histogram<Metric.MetricKeyType.Histogram>
    readonly compilationTimer: Metric.Metric.Histogram<Metric.MetricKeyType.Histogram>
    readonly cacheHitCounter: Metric.Metric.Counter<number>
    readonly errorCounter: Metric.Metric.Frequency<string>
    readonly activeNodesGauge: Metric.Metric.Gauge<number>
  }
>() {}

export class SamplingService extends Context.Tag("SamplingService")<
  SamplingService,
  {
    readonly previewAlgebra: (
      algebraNode: Node.AlgebraNode,
      sampleData: Chunk.Chunk<unknown>
    ) => Effect.Effect<Chunk.Chunk<unknown>, SamplingError>
    readonly getVerificationSample: (
      strategy: Node.StrategyNode
    ) => Effect.Effect<VerificationSample, SamplingError>
  }
>() {}
```

### **2.2 Data Types and Errors**

```typescript
// packages/domain/src/engine/types/ExecutionPlan.ts
export class ExecutionPlan extends Data.TaggedClass("ExecutionPlan")<{
  readonly id: ExecutionPlanId
  readonly nodes: ReadonlyArray<Node.NodeId>
  readonly dependencies: ReadonlyMap<Node.NodeId, ReadonlySet<Node.NodeId>>
  readonly compiledAt: DateTime.DateTime
}> {}

// packages/domain/src/engine/types/Errors.ts
export class CompilationError extends Data.TaggedError("CompilationError")<{
  readonly cause: CycleDetectedError | SchemaNotFoundError | GraphStructureError
  readonly graphId: string
  readonly context: Record<string, unknown>
}> {}

export class ExecutionError extends Data.TaggedError("ExecutionError")<{
  readonly cause: AlgebraError | DataSourceError | NodeNotFoundError
  readonly nodeId: Node.NodeId
  readonly executionPlanId: ExecutionPlanId
  readonly context: Record<string, unknown>
}> {}

export class CycleDetectedError extends Data.TaggedError("CycleDetectedError")<{
  readonly cycle: ReadonlyArray<Node.NodeId>
  readonly graphSnapshot: Graph
}> {}

export class AlgebraError extends Data.TaggedError("AlgebraError")<{
  readonly algebraId: string
  readonly input: unknown
  readonly cause: unknown
}> {}
```

---

## **3. Implementation Strategy**

### **3.1 Refactored `cataRecursive` as ExecutionService**

The current `cataRecursive` function needs to be transformed into a service-based, cached execution engine:

```typescript
// packages/domain/src/engine/services/ExecutionService.ts
import { Effect, Cache, Context, HashMap, Option, Duration } from "effect"

const makeExecutionService = Effect.gen(function* () {
  // Create the execution cache with TTL and capacity limits
  const executionCache = yield* Cache.make({
    capacity: 1000,
    timeToLive: Duration.minutes(60),
    lookup: (nodeId: Node.NodeId) => processNodeUncached(nodeId)
  })

  const processNodeUncached = (
    nodeId: Node.NodeId
  ): Effect.Effect<unknown, ExecutionError> =>
    Effect.gen(function* () {
      const node = yield* getNodeFromGraph(nodeId)

      yield* Effect.withSpan(`Adjoint.Engine.executeNode`, {
        attributes: { nodeId: node.id }
      })

      return yield* Node.match(node, {
        SourceDataNode: (sourceNode) =>
          yield* processSourceDataNode(sourceNode),

        AlgebraNode: (algebraNode) => yield* processAlgebraNode(algebraNode),

        SchemaNode: (schemaNode) => yield* processSchemaNode(schemaNode),

        _: () =>
          Effect.fail(
            new ExecutionError({
              cause: new NodeNotFoundError({ nodeId }),
              nodeId,
              executionPlanId: "current", // Get from context
              context: {}
            })
          )
      })
    })

  const processAlgebraNode = (node: Node.AlgebraNode) =>
    Effect.gen(function* () {
      // Process dependencies first (recursive)
      const dependencies = yield* getDependencyNodes(node.id)
      const dependencyResults = yield* Effect.all(
        dependencies.map((depId) => executionCache.get(depId)),
        { concurrency: "unbounded" }
      )

      // Apply the algebra
      yield* Effect.withSpan(`Adjoint.Algebra.${node.strategyName}`)

      const result = yield* Effect.try({
        try: () => node.logic(dependencyResults),
        catch: (error) =>
          new AlgebraError({
            algebraId: node.id,
            input: dependencyResults,
            cause: error
          })
      })

      return result
    })

  return ExecutionService.of({
    processNode: (nodeId) => executionCache.get(nodeId),
    getNodeResult: (nodeId) => executionCache.get(nodeId).pipe(Effect.option),
    invalidateNode: (nodeId) => executionCache.invalidate(nodeId),
    getExecutionStats: Effect.gen(function* () {
      const stats = yield* executionCache.cacheStats
      return new ExecutionStats({
        cacheSize: stats.size,
        hitRate: stats.hits / (stats.hits + stats.misses),
        totalExecutions: stats.hits + stats.misses
      })
    })
  })
})

export const ExecutionServiceLive = Layer.effect(
  ExecutionService,
  makeExecutionService
)
```

### **3.2 AdjointEngine Implementation**

```typescript
// packages/domain/src/engine/services/AdjointEngine.ts
const makeAdjointEngine = Effect.gen(function* () {
  const executionService = yield* ExecutionService
  const metricsService = yield* MetricsService

  const compile = (
    graph: Graph
  ): Effect.Effect<ExecutionPlan, CompilationError> =>
    Effect.gen(function* () {
      yield* Effect.withSpan("Adjoint.Engine.compile")
      yield* Effect.logInfo("Starting graph compilation")

      // Perform topological sort
      const sortResult = yield* Effect.try({
        try: () => Graph.topologicalSort(graph),
        catch: (error) =>
          new CompilationError({
            cause:
              error instanceof CycleError
                ? new CycleDetectedError({
                    cycle: error.cycle,
                    graphSnapshot: graph
                  })
                : new GraphStructureError({ message: String(error) }),
            graphId: graph.id,
            context: { nodeCount: graph.nodes.size }
          })
      })

      const plan = new ExecutionPlan({
        id: ExecutionPlanId.generate(),
        nodes: sortResult,
        dependencies: Graph.getDependencyMap(graph),
        compiledAt: yield* DateTime.now
      })

      yield* Effect.logInfo("Compilation successful", {
        executionPlanId: plan.id
      })
      yield* metricsService.compilationTimer(Effect.succeed(1))

      return plan
    })

  const execute = <Target>(
    plan: ExecutionPlan
  ): Stream.Stream<Target, ExecutionError> =>
    Stream.gen(function* () {
      yield* Effect.withSpan("Adjoint.Engine.execute")
      yield* Effect.logInfo("Starting execution", { planId: plan.id })

      // Execute nodes in topological order, but allow for parallel execution
      // where dependencies permit
      const finalNodeId = plan.nodes[plan.nodes.length - 1]

      const result = yield* executionService.processNode(finalNodeId)
      yield* Stream.fromEffect(Effect.succeed(result as Target))
    })

  const materialize = <Target>(
    graph: Graph
  ): Stream.Stream<Target, CompilationError | ExecutionError> =>
    Stream.gen(function* () {
      const plan = yield* Stream.fromEffect(compile(graph))
      yield* execute<Target>(plan)
    })

  return AdjointEngine.of({
    compile,
    execute,
    materialize
  })
})

export const AdjointEngineLive = Layer.effect(
  AdjointEngine,
  makeAdjointEngine
).pipe(Layer.provide(ExecutionServiceLive), Layer.provide(MetricsServiceLive))
```

---

## **4. Metrics and Observability Implementation**

### **4.1 Comprehensive Metrics Service**

```typescript
// packages/domain/src/engine/services/MetricsService.ts
const makeMetricsService = Effect.gen(function* () {
  // Define all metrics with proper boundaries and descriptions
  const nodeExecutionTimer = Metric.timerWithBoundaries(
    "adjoint_node_execution_duration",
    MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 }),
    "Time taken to execute individual nodes in milliseconds"
  )

  const compilationTimer = Metric.timerWithBoundaries(
    "adjoint_compilation_duration",
    MetricBoundaries.linear({ start: 0, width: 100, count: 20 }),
    "Time taken to compile graph blueprints in milliseconds"
  )

  const cacheHitCounter = Metric.counter("adjoint_cache_hits_total", {
    description: "Total number of execution cache hits"
  })

  const errorCounter = Metric.frequency("adjoint_errors", {
    description: "Frequency of different error types"
  })

  const activeNodesGauge = Metric.gauge("adjoint_active_nodes", {
    description: "Number of nodes currently being executed"
  })

  // Derived metrics for advanced monitoring
  const throughputSummary = Metric.summary({
    name: "adjoint_throughput",
    maxAge: "5 minutes",
    maxSize: 1000,
    error: 0.01,
    quantiles: [0.5, 0.75, 0.95, 0.99],
    description: "Node execution throughput distribution"
  })

  return MetricsService.of({
    nodeExecutionTimer,
    compilationTimer,
    cacheHitCounter,
    errorCounter,
    activeNodesGauge,
    // Additional utility functions
    recordNodeExecution: (nodeId: Node.NodeId, duration: Duration.Duration) =>
      Effect.all([
        nodeExecutionTimer(Effect.succeed(Duration.toMillis(duration))),
        throughputSummary(Effect.succeed(1))
      ]).pipe(Effect.asVoid),

    recordError: (error: ExecutionError | CompilationError) =>
      errorCounter(Effect.succeed(error._tag)),

    getHealthMetrics: Effect.gen(function* () {
      const cacheStats = yield* Metric.value(cacheHitCounter)
      const errorStats = yield* Metric.value(errorCounter)
      const activeNodes = yield* Metric.value(activeNodesGauge)

      return {
        cacheHitRate: cacheStats.count,
        errorFrequency: errorStats.occurrences,
        activeExecutions: activeNodes.value,
        timestamp: yield* DateTime.now
      }
    })
  })
})

export const MetricsServiceLive = Layer.effect(
  MetricsService,
  makeMetricsService
)
```

---

## **5. Resource Management and Stream Lifecycle**

### **5.1 Scoped Resource Management**

```typescript
// packages/domain/src/engine/resources/StreamManager.ts
export const makeStreamManager = Effect.gen(function* () {
  const scope = yield* Scope.make()
  const activeStreams = yield* Ref.make(new Set<string>())

  const createManagedStream = <A, E>(
    streamId: string,
    stream: Stream.Stream<A, E>
  ): Effect.Effect<Stream.Stream<A, E>, never, Scope.Scope> =>
    Effect.gen(function* () {
      yield* Ref.update(activeStreams, (set) => set.add(streamId))

      yield* Scope.addFinalizer(
        scope,
        Effect.gen(function* () {
          yield* Effect.logDebug(`Cleaning up stream: ${streamId}`)
          yield* Ref.update(activeStreams, (set) => {
            set.delete(streamId)
            return set
          })
        })
      )

      return stream.pipe(
        Stream.ensuring(Effect.logDebug(`Stream ${streamId} completed`))
      )
    })

  return { createManagedStream, activeStreams }
})
```

---

## **6. Layer Composition Strategy**

### **6.1 Main Application Layer**

```typescript
// packages/domain/src/engine/layers/MainLive.ts
export const MainLive = Layer.mergeAll(
  AdjointEngineLive,
  ExecutionServiceLive,
  MetricsServiceLive,
  SamplingServiceLive
).pipe(
  // Provide platform services
  Layer.provide(Layer.mergeAll(Logger.pretty, Tracer.live, MetricRegistry.live))
)

// For testing
export const TestLive = Layer.mergeAll(
  AdjointEngineTest,
  ExecutionServiceTest,
  MetricsServiceTest,
  SamplingServiceTest
).pipe(Layer.provide(Layer.mergeAll(Logger.test, Tracer.test, TestClock.live)))
```

### **6.2 Dynamic Layer Composition**

```typescript
// For advanced scenarios where we need dynamic service composition
export const makeDynamicEngine = (config: EngineConfig) =>
  Effect.gen(function* () {
    const baseLayer = Layer.mergeAll(ExecutionServiceLive, MetricsServiceLive)

    const configuredLayer = config.enableSampling
      ? Layer.merge(baseLayer, SamplingServiceLive)
      : baseLayer

    const finalLayer = config.cacheConfig
      ? Layer.provide(configuredLayer, makeCacheLayer(config.cacheConfig))
      : configuredLayer

    return Layer.merge(AdjointEngineLive, finalLayer)
  })
```

---

## **7. Error Handling Strategy**

### **7.1 Structured Error Propagation**

```typescript
// packages/domain/src/engine/errors/ErrorHandler.ts
export const handleExecutionError = (error: ExecutionError) =>
  Effect.gen(function* () {
    // Log the error with full context
    yield* Effect.logError("Execution failed", {
      nodeId: error.nodeId,
      executionPlanId: error.executionPlanId,
      errorType: error.cause._tag,
      context: error.context
    })

    // Record metrics
    yield* Effect.serviceWithEffect(MetricsService, (metrics) =>
      metrics.recordError(error)
    )

    // Determine recovery strategy based on error type
    return yield* Match.value(error.cause).pipe(
      Match.tag("AlgebraError", (algebraError) =>
        // Try to recover with default value or retry
        recoverFromAlgebraError(algebraError)
      ),
      Match.tag("DataSourceError", (sourceError) =>
        // Retry with exponential backoff
        retryDataSource(sourceError)
      ),
      Match.orElse(() => Effect.fail(error))
    )
  })

const recoverFromAlgebraError = (error: AlgebraError) =>
  Effect.gen(function* () {
    yield* Effect.logWarn("Attempting algebra error recovery", {
      algebraId: error.algebraId
    })

    // Could implement fallback logic here
    // For now, just re-throw
    return yield* Effect.fail(error)
  })
```

---

## **8. Testing Strategy**

### **8.1 Service Testing with TestLayers**

```typescript
// packages/domain/test/engine/ExecutionService.test.ts
describe("ExecutionService", () => {
  it("should memoize node execution results", () =>
    Effect.gen(function* () {
      const service = yield* ExecutionService
      const nodeId = Node.NodeId.make("test-node")

      // First execution
      const result1 = yield* service.processNode(nodeId)

      // Second execution should be cached
      const result2 = yield* service.processNode(nodeId)

      expect(result1).toEqual(result2)

      // Verify cache hit metrics
      const stats = yield* service.getExecutionStats
      expect(stats.hitRate).toBeGreaterThan(0)
    }).pipe(Effect.provide(TestLive), Effect.runPromise))
})
```

---

## **9. Integration with Web Package**

### **9.1 Public API Surface**

```typescript
// packages/domain/src/index.ts - Main export for web package
export {
  AdjointEngine,
  ExecutionService,
  MetricsService,
  SamplingService
} from "./engine/services/index.js"
export { MainLive, TestLive } from "./engine/layers/index.js"
export type {
  ExecutionPlan,
  ExecutionStats,
  VerificationSample
} from "./engine/types/index.js"
export {
  CompilationError,
  ExecutionError,
  CycleDetectedError,
  AlgebraError
} from "./engine/errors/index.js"
```

### **9.2 Runtime Integration**

```typescript
// packages/web/src/services/GraphRuntime.ts
import { Effect, ManagedRuntime } from "effect"
import { MainLive, AdjointEngine } from "@adjoint/domain"

export class GraphRuntime {
  private runtime = ManagedRuntime.make(MainLive)

  async materializeGraph<T>(graph: Graph): Promise<Stream<T>> {
    return this.runtime.runPromise(
      Effect.gen(function* () {
        const engine = yield* AdjointEngine
        return yield* engine.materialize<T>(graph)
      })
    )
  }

  async dispose() {
    await this.runtime.dispose()
  }
}
```

---

## **10. Implementation Timeline**

### **Phase 1: Core Services (Week 1)**

- [ ] ExecutionPlan and error types
- [ ] ExecutionService with caching
- [ ] Basic AdjointEngine implementation
- [ ] Unit tests for core functionality

### **Phase 2: Metrics and Observability (Week 2)**

- [ ] MetricsService implementation
- [ ] Logging and tracing integration
- [ ] Error handling and recovery
- [ ] Performance benchmarks

### **Phase 3: Resource Management (Week 3)**

- [ ] Stream lifecycle management
- [ ] Resource cleanup and finalization
- [ ] Memory management optimization
- [ ] Integration tests

### **Phase 4: Advanced Features (Week 4)**

- [ ] SamplingService for UI previews
- [ ] Dynamic layer composition
- [ ] Web package integration
- [ ] End-to-end testing

---

## **Conclusion**

This architecture provides a robust, scalable foundation for the Adjoint Graph Engine that follows Effect's best practices for service composition, error handling, and resource management. The modular design enables easy testing, monitoring, and future extensions while maintaining type safety and compositionality throughout the system.

The implementation prioritizes:

- **Separation of Concerns**: Each service has a clear, focused responsibility
- **Resource Safety**: Proper cleanup and lifecycle management
- **Observability**: Comprehensive metrics and structured logging
- **Testability**: Clean dependency injection and mocking capabilities
- **Performance**: Efficient caching and concurrent execution
- **Maintainability**: Clear interfaces and predictable behavior
