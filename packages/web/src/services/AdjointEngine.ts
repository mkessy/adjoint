import { Context, Effect, Layer, Stream } from "effect"
import { 
  GraphTransformation, 
  JobId, 
  JobStatus, 
  JobUpdate,
  MaterializationError,
  PreviewResult,
  PreviewError,
  JobNotFoundError
} from "./types.js"

/**
 * The main engine service for graph transformations
 */
export class AdjointEngine extends Context.Tag("AdjointEngine")<
  AdjointEngine,
  {
    readonly materialize: (
      transformation: GraphTransformation
    ) => Effect.Effect<JobId, MaterializationError>
    
    readonly getJobStatus: (
      jobId: JobId
    ) => Effect.Effect<JobStatus, JobNotFoundError>
    
    readonly subscribeToJob: (
      jobId: JobId
    ) => Stream.Stream<JobUpdate, JobNotFoundError>
    
    readonly cancelJob: (
      jobId: JobId
    ) => Effect.Effect<void, JobNotFoundError>
    
    readonly previewTransformation: (
      transformation: GraphTransformation
    ) => Effect.Effect<PreviewResult, PreviewError>
  }
>() {}

export const AdjointEngineLive = Layer.succeed(AdjointEngine)({
  materialize: () => Effect.succeed(JobId.make()),
  getJobStatus: () => Effect.succeed(JobStatus.Pending({})),
  subscribeToJob: () => Stream.empty,
  cancelJob: () => Effect.unit,
  previewTransformation: () => Effect.fail(new PreviewError({
    message: "Not implemented",
    nodeId: "" as any,
    algebraId: "" as any
  }))
})