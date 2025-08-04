# Adjoint Engine: Observability Strategy (Errors, Logging, and Tracing)

## 1. Core Principles

This document outlines a unified strategy for error handling, logging, and tracing within the Adjoint engine. Our approach is guided by the core principles of the Effect ecosystem:

1.  **Errors are Values**: All known failure modes are modeled as type-safe, serializable `Data.TaggedError` classes. This allows us to handle failures programmatically and provides rich, structured information about what went wrong.
2.  **Logs are Structured Data**: Logs are not just strings. We will use `Effect.log` with annotations to produce structured (JSON) logs, enabling powerful filtering, searching, and automated analysis.
3.  **Context is King**: We will leverage Effect's `FiberRef`s and `Logger.withContext` to automatically attach contextual information (like `correlationId`, `graphId`, `nodeId`) to all logs and errors, providing a clear, traceable narrative for every operation.
4.  **Spans Define Boundaries**: We will use `Effect.withSpan` to define logical units of work (e.g., `compile`, `executeNode`). This automatically provides timing information and hierarchical context for tracing.

## 2. Error Management Strategy

We will establish a clear hierarchy and boundaries for all error types within the engine.

### 2.1. Error Catalog & Boundaries

This table defines our tagged errors, where they originate, and how they should be handled.

| Error Class             | Module Origin          | Boundary & Meaning                                                                                                    | Handling Strategy                                                                  |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `NodeCreationError`     | `node.ts`              | **Programmer Error**. Occurs if a node is constructed with invalid properties. Should not happen in normal operation. | Fail fast. Log as a `defect` at the creation site.                                 |
| `NodeValidationError`   | `node.ts`              | **Data Validation Error**. Occurs when decoding unknown data into a node schema fails.                                | Catch and transform into a user-facing validation error.                           |
| `GraphOperationError`   | `graph.ts`             | **Programmer Error**. A core graph invariant was violated (e.g., root node not found for `cata`).                     | Fail fast. Log as a `defect`.                                                      |
| `GraphCompositionError` | `Composition.ts`       | **User/Programmer Error**. The user attempts to compose a graph in an invalid way (e.g., no unique target schema).    | Catch in the `AdjointEngine`, log, and surface as a structured error to the UI.    |
| `CompilationError`      | `engine/Engine.ts`     | **Compilation Failure**. The graph blueprint is invalid. A union of `CycleDetectedError`, `SchemaNotFoundError`, etc. | Catch in the `AdjointEngine`, log, and surface to the UI.                          |
| `ExecutionError`        | `engine/Engine.ts`     | **Execution Failure**. An error occurred while running a valid plan. Wraps more specific errors.                      | Catch at the top level of `execute`, log, and surface to the UI.                   |
| `AlgebraError`          | `engine/Executor.ts`   | **Runtime Logic Error**. An error occurred inside the `logic` of a `StrategyNode`.                                    | Catch within the node execution logic, wrap in an `ExecutionError`, and propagate. |
| `DataSourceError`       | `engine/DataSource.ts` | **External System Failure**. A data source (file, API, DB) is unavailable or returned an error.                       | Retryable. Use `Effect.retry` with a `Schedule`. If retries fail, propagate.       |

### 2.2. Error Handling Patterns

- **For Expected Failures** (e.g., `CompilationError`, `DataSourceError`): We will use `Effect.catchTag` to handle specific, known error types and apply recovery logic (like retries) or transform them into user-friendly UI messages.

- **For Unexpected Defects** (e.g., `GraphOperationError`): These represent bugs. We will use `Effect.catchAllCause` to inspect the `Cause` of the failure. If `Cause.isDie(cause)` is true, we will log it as a `FATAL` error with a full stack trace, but still present a generic "Internal Server Error" to the user to avoid exposing implementation details.

- **For Validation** (e.g., `Schema.decode`): We will use `Effect.either` or `Schema.decodeUnknownEither` to accumulate multiple validation errors, as per the `accumulate-multiple-errors-with-either` pattern. This allows us to present a complete list of issues to the user at once.

## 3. Structured Logging & Tracing Strategy

### 3.1. Log Namespaces (Spans)

We will use hierarchical span names to create logical namespaces for our logs. This allows for easy filtering and analysis.

- `Adjoint.Engine`: The root span for any top-level engine operation.
  - `Adjoint.Engine.compile`: A span for the graph compilation phase.
  - `Adjoint.Engine.execute`: A span for the execution phase.
    - `Adjoint.Engine.executeNode`: A sub-span for the execution of each individual node in the plan.
      - `Adjoint.Algebra.{strategy_name}`: A sub-span within `executeNode` specifically for the execution of a strategy's algebra.
- `Adjoint.Composition`: Spans for the graph composition API (`from`, `transform`).

### 3.2. Log Levels

- **`DEBUG`**: Verbose information for internal state. Examples: "Entering `cataRecursive` for node {nodeId}", "Cache miss for node {nodeId}", "Generated execution plan: {plan}".
- **`INFO`**: High-level lifecycle events. Examples: "Engine starting compilation for graph {graphId}", "Compilation successful", "Execution of plan {planId} complete".
- **`WARN`**: Recoverable issues or potential problems. Examples: "Data source for {sourceUri} is flaky, retrying (2/5)", "Cache capacity is at 95%".
- **`ERROR`**: Handled, unrecoverable errors. Examples: "Compilation failed: Cycle detected in graph", "Execution failed for node {nodeId}: {error}".
- **`FATAL`**: Unhandled defects (`Die`) or catastrophic failures. Example: "Caught unexpected defect in engine executor".

### 3.3. Standard Log Annotations

Every log message will be automatically annotated with the following context using a custom logger layer:

- `correlationId`: A unique ID for the entire end-to-end operation (e.g., a single user query).
- `graphId`: An ID representing the specific graph blueprint being processed.
- `executionPlanId`: An ID for the generated execution plan.
- `nodeId`: The ID of the specific node being processed (when applicable).
- `fiberId`: Automatically added by Effect for tracing concurrent operations.

## 4. End-to-End Observability Workflow Example

This illustrates the flow for a single `engine.materialize(graph)` call.

1.  **Entry Point**: A `correlationId` is generated.
2.  **Root Span**: The entire operation is wrapped in an `Effect.withSpan("Adjoint.Engine")` and a logger scoped with the `correlationId`.
3.  **Compilation**:
    - The `compile` method is wrapped in `Effect.withSpan("Adjoint.Engine.compile")`.
    - It logs an `INFO` message: "Starting compilation".
    - If compilation fails with a `CycleDetectedError`, it logs an `ERROR` message with the structured error and the `graphId`.
    - On success, it logs an `INFO` message: "Compilation successful" with the `executionPlanId`.
4.  **Execution**:
    - The `execute` method is wrapped in `Effect.withSpan("Adjoint.Engine.execute")`.
    - For each node in the `ExecutionPlan`:
      - A new span is created: `Effect.withSpan("Adjoint.Engine.executeNode", { attributes: { nodeId: ... } })`.
      - The logger is further scoped: `Logger.withContext({ nodeId: ... })`.
      - A `DEBUG` log indicates entry: "Executing node {nodeId}".
      - If the node is a `StrategyNode`, its algebra is wrapped in `Effect.withSpan("Adjoint.Algebra.{strategy_name}")`.
      - If the algebra fails, the `AlgebraError` is caught, logged as an `ERROR`, and wrapped in an `ExecutionError`.
5.  **Result**: The final result (or error) is returned. The root span closes, and its total duration is automatically logged.

## 5. Surfacing Information to the UI

A key requirement is providing rich feedback to the user.

- **Errors**: Because our errors are structured `Data.TaggedError` classes, they can be serialized and sent directly to the UI. The UI can then use a TypeScript `switch` or pattern match on the `_tag` to render a specific, user-friendly component for each error type (e.g., a cycle visualization for `CycleDetectedError`, a schema mismatch diff for `SchemaValidationError`).

- **Logs & Traces**: For the interactive UI, we can implement a special `LogSink` that collects all logs associated with a specific `correlationId` into a `Ref<Chunk<LogEntry>>`. The `Effect` that returns the final result to the UI can be modified to also return the chunk of collected logs. The UI can then display these in a dedicated "Logs" panel, providing a complete, filterable trace of the operation that just occurred.

## 6. Advanced Observability Considerations for Steps 3 & 4

### 6.1 Service Layer Metrics Integration

Building on the comprehensive architecture plan, our observability strategy must account for the multi-layered service architecture:

- **Service Health Monitoring**: Each service (AdjointEngine, ExecutionService, MetricsService, SamplingService) should expose health check endpoints that can be aggregated into a unified health status.
- **Inter-Service Communication Tracing**: Use Effect's tracing to follow requests as they flow between services, creating a complete picture of the execution pipeline.
- **Resource Pool Monitoring**: Track cache utilization, active stream counts, and memory pressure across all services.

### 6.2 Dynamic Metrics Configuration

The metrics service should support runtime configuration changes:

```typescript
// Dynamic metrics configuration
export const configureMetrics = (config: MetricsConfig) =>
  Effect.gen(function* () {
    const metrics = yield* MetricsService

    // Adjust cache TTL based on load
    if (config.highLoad) {
      yield* metrics.adjustCacheConfig({
        timeToLive: Duration.minutes(30),
        capacity: 2000
      })
    }

    // Enable verbose logging for specific node types
    if (config.debugNodeTypes.length > 0) {
      yield* Effect.tagMetrics("debug_mode", "enabled")
    }
  })
```

### 6.3 Predictive Performance Monitoring

Implement predictive metrics that can identify potential performance issues:

- **Execution Time Trend Analysis**: Track moving averages of node execution times to detect performance degradation
- **Cache Hit Rate Predictions**: Use historical data to predict when cache performance might degrade
- **Memory Pressure Forecasting**: Monitor memory allocation patterns to predict potential out-of-memory conditions

### 6.4 Business-Level Observability

Beyond technical metrics, expose business-relevant observability:

- **Graph Complexity Metrics**: Track the complexity of compiled graphs (node count, depth, branching factor)
- **User Journey Tracing**: Follow specific user interactions through the entire execution pipeline
- **Feature Usage Analytics**: Monitor which algebra operations and node types are most commonly used

### 6.5 Real-Time Observability Dashboard

Design a real-time dashboard that integrates with the web UI:

```typescript
// Real-time metrics streaming for UI
export const createMetricsStream = Effect.gen(function* () {
  const metrics = yield* MetricsService

  return Stream.repeatEffectWithSchedule(
    metrics.getHealthMetrics,
    Schedule.spaced(Duration.seconds(1))
  ).pipe(
    Stream.map((healthData) => ({
      timestamp: Date.now(),
      ...healthData,
      trend: calculateTrend(healthData)
    }))
  )
})
```

This enables the UI to display live performance data, cache hit rates, error frequencies, and execution trends directly in the user interface.
