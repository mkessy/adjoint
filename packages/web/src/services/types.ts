import { Data, DateTime, Duration, Schema } from "effect"
import { Graph, Node, NodeId } from "@adjoint/domain"

/**
 * Snapshot of graph state with metadata
 */
export class GraphSnapshot extends Data.TaggedClass("GraphSnapshot")<{
  readonly graph: Graph
  readonly timestamp: DateTime.DateTime
  readonly operation: "initial" | "transform" | "compose" | "undo" | "redo"
  readonly metadata: Record<string, unknown>
}> {}

/**
 * Graph transformation operations
 */
export class GraphTransformation extends Data.TaggedEnum<{
  AddNode: { 
    node: Node.AnyNode
    position?: { x: number; y: number } 
  }
  RemoveNode: { 
    nodeId: NodeId 
  }
  AddEdge: { 
    edge: Edge.Edge 
  }
  RemoveEdge: { 
    from: NodeId
    to: NodeId
    type: Edge.EdgeType 
  }
  ApplyAlgebra: {
    algebraNode: Node.AlgebraNode
    targetNodeId: NodeId
    preview?: boolean
  }
  Compose: {
    sourceGraph: Graph
    transformation: Node.StrategyNode
  }
}>() {}

/**
 * Job identifier
 */
export type JobId = string & { readonly _brand: unique symbol }
export const JobId = {
  make: (): JobId => crypto.randomUUID() as JobId
}

/**
 * Job execution status
 */
export class JobStatus extends Data.TaggedEnum<{
  Pending: {}
  Running: { 
    progress: number
    currentStep: string 
  }
  Completed: { 
    result: Graph
    duration: Duration.Duration 
  }
  Failed: { 
    error: MaterializationError
    duration: Duration.Duration 
  }
  Cancelled: { 
    reason: string 
  }
}>() {}

/**
 * Job update events
 */
export class JobUpdate extends Data.TaggedEnum<{
  Started: { 
    jobId: JobId
    timestamp: DateTime.DateTime 
  }
  Progress: { 
    jobId: JobId
    progress: number
    message: string 
  }
  Completed: { 
    jobId: JobId
    result: Graph 
  }
  Failed: { 
    jobId: JobId
    error: MaterializationError 
  }
}>() {}

/**
 * Errors
 */
export class MaterializationError extends Schema.TaggedError<MaterializationError>(
  "MaterializationError"
)({
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class PreviewError extends Schema.TaggedError<PreviewError>(
  "PreviewError"  
)({
  message: Schema.String,
  nodeId: NodeId,
  algebraId: NodeId
}) {}

export class JobNotFoundError extends Schema.TaggedError<JobNotFoundError>(
  "JobNotFoundError"
)({
  jobId: Schema.String
}) {}

/**
 * Preview result
 */
export class PreviewResult extends Data.Class<{
  transformedNodes: number
  sampleOutput: unknown
  estimatedDuration: Duration.Duration
}> {}