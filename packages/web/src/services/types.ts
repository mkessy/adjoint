import type { Graph } from "@adjoint/domain"
import type { DateTime, Duration } from "effect"
import { Data, Schema } from "effect"

/**
 * Snapshot of graph state with metadata
 */
export class GraphSnapshot extends Data.TaggedClass("GraphSnapshot")<{
  readonly graph: Graph.Graph.Graph
  readonly timestamp: DateTime.DateTime
  readonly operation: "initial" | "transform" | "compose" | "undo" | "redo"
  readonly metadata: Record<string, unknown>
}> {}

/**
 * Graph transformation operations
 */
export type GraphTransformation = Data.TaggedEnum<{
  AddNode: {
    node: Graph.Node.AnyNode
    position?: { x: number; y: number }
  }
  RemoveNode: {
    nodeId: Graph.Node.NodeId
  }
  AddEdge: {
    edge: Graph.Edge.Edge
  }
  RemoveEdge: {
    from: Graph.Node.NodeId
    to: Graph.Node.NodeId
    type: string
  }
  ApplyAlgebra: {
    algebraNode: any
    targetNodeId: Graph.Node.NodeId
    preview?: boolean
  }
  Compose: {
    sourceGraph: Graph.Graph.Graph
    transformation: any
  }
}>

export const GraphTransformation = Data.taggedEnum<GraphTransformation>()

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
export type JobStatus = Data.TaggedEnum<{
  Pending: object
  Running: {
    progress: number
    currentStep: string
  }
  Completed: {
    result: Graph.Graph.Graph
    duration: Duration.Duration
  }
  Failed: {
    error: MaterializationError
    duration: Duration.Duration
  }
  Cancelled: {
    reason: string
  }
}>

export const JobStatus = Data.taggedEnum<JobStatus>()

/**
 * Job update events
 */
export type JobUpdate = Data.TaggedEnum<{
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
    result: Graph.Graph.Graph
  }
  Failed: {
    jobId: JobId
    error: MaterializationError
  }
}>

export const JobUpdate = Data.taggedEnum<JobUpdate>()

/**
 * Errors
 */
export class MaterializationError extends Schema.TaggedError<MaterializationError>()(
  "MaterializationError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

export class PreviewError extends Schema.TaggedError<PreviewError>()(
  "PreviewError",
  {
    message: Schema.String,
    nodeId: Schema.String,
    algebraId: Schema.String
  }
) {}

export class JobNotFoundError extends Schema.TaggedError<JobNotFoundError>()(
  "JobNotFoundError",
  {
    jobId: Schema.String
  }
) {}

/**
 * Preview result
 */
export class PreviewResult extends Data.Class<{
  transformedNodes: number
  sampleOutput: unknown
  estimatedDuration: Duration.Duration
}> {}
