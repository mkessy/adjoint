import { Result, Rx } from "@effect-rx/rx"
import { Effect } from "effect"
import type * as Types from "../../nlp/types.js"
import { NlpProcessingService } from "../../nlp/worker.js"
import { NlpProcessingServiceProxyLive } from "./NlpProcessingServiceProxy.js"

/**
 * Integration Layer: Effect-RX Runtime for NLP Processing
 * Uses the worker proxy to bridge domain services to reactive UI patterns
 */
export const NlpRxRuntime = Rx.runtime(NlpProcessingServiceProxyLive)

// --- Reactive Values ---

export const processedDocumentsRx = Rx.make<
  Result.Result<Array<{ documentId: Types.DocumentId; fileName: string }>, unknown>
>(Result.initial())

export const searchResultsRx = Rx.make<Array<{ documentId: Types.DocumentId; score: number }>>([])

// --- Action Functions ---

export const nlpActionsRx = {
  processDocument: NlpRxRuntime.fn(
    Effect.fnUntraced(function*(params: {
      documentId: Types.DocumentId
      fileId: Types.FileId
      content: string
    }) {
      const service = yield* NlpProcessingService
      return yield* service.processDocument(
        params.documentId,
        params.fileId,
        params.content
      )
    })
  ),

  createBM25Index: NlpRxRuntime.fn(
    Effect.fnUntraced(function*(documentId: Types.DocumentId) {
      const service = yield* NlpProcessingService
      return yield* service.createBM25Index(documentId)
    })
  ),

  searchDocuments: NlpRxRuntime.fn(
    Effect.fnUntraced(function*(query: string) {
      const service = yield* NlpProcessingService
      return yield* service.searchDocuments(query)
    })
  ),

  finalizeIndex: NlpRxRuntime.fn(
    Effect.fnUntraced(function*() {
      const service = yield* NlpProcessingService
      return yield* service.finalizeIndex()
    })
  )
}

// Export the runtime for advanced usage
export { NlpRxRuntime as NlpRuntime }
