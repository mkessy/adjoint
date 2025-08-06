import { Effect, Layer, Schema } from "effect"
import { createTokenizationTask, WorkerService } from "../workers/WorkerService.js"
import { NlpError, WinkNlpService } from "./nlp.js"
import * as Types from "./types.js"

export const WinkNlpServiceLive = Layer.effect(
  WinkNlpService,
  Effect.gen(function*() {
    const workerService = yield* WorkerService

    const process = (
      documentId: Types.DocumentId,
      text: string
    ): Effect.Effect<
      Types.NlpDocumentSchema,
      NlpError,
      never
    > =>
      Effect.gen(function*() {
        const task = createTokenizationTask(documentId, text)
        const result = yield* workerService.submitTask(task)

        // The worker returns an unknown output, so we need to decode it
        const decoded = yield* Schema.decodeUnknown(Types.NlpDocumentSchema)(result)
        return decoded
      }).pipe(
        Effect.mapError((error) =>
          new NlpError({
            message: "Error processing text in worker",
            cause: error
          })
        )
      )

    return WinkNlpService.of({ process })
  })
)
