import { NlpProcessingService, NlpProcessingServiceLive } from "@adjoint/domain/nlp/processing"
import {
  GetNeighborsSuccess,
  NlpWorkerError,
  NlpWorkerRequestSchema,
  NlpWorkerResponse,
  SearchSuccess
} from "@adjoint/domain/nlp/worker-protocol"
import { Effect, Either, ManagedRuntime, Schema } from "effect"

// Create runtime for the worker with the actual NLP service
const runtime = ManagedRuntime.make(NlpProcessingServiceLive)

// Handle incoming messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const handleMessage = Effect.gen(function*() {
    try {
      // Decode the request
      const request = yield* Schema.decodeUnknown(NlpWorkerRequestSchema)(event.data)

      // Get the NLP service from the runtime context
      const service = yield* NlpProcessingService

      let response: NlpWorkerResponse

      // Simple pattern matching based on the class name
      const requestType = request.constructor.name

      if (requestType === "ProcessDocumentRequest") {
        const req = request as any
        const result = yield* service.processDocument(req.documentId, req.fileId, req.content)

        response = new NlpWorkerResponse({
          requestId: req.requestId,
          result: Either.right(result)
        })
      } else if (requestType === "GetNeighborsRequest") {
        const req = request as any
        const result = yield* service.getNeighbors(req.documentId, req.nodeId)

        response = new NlpWorkerResponse({
          requestId: req.requestId,
          result: Either.right(
            new GetNeighborsSuccess({
              nodeId: req.nodeId,
              neighborIds: result
            })
          )
        })
      } else if (requestType === "SearchDocumentsRequest") {
        const req = request as any
        const result = yield* service.searchDocuments(req.query)

        response = new NlpWorkerResponse({
          requestId: req.requestId,
          result: Either.right(
            new SearchSuccess({
              results: result
            })
          )
        })
      } else if (requestType === "CreateBM25IndexRequest") {
        const req = request as any
        const result = yield* service.createBM25Index(req.documentId)

        // Note: BM25IndexSuccess might not be in the union, so handle appropriately
        response = new NlpWorkerResponse({
          requestId: req.requestId,
          result: Either.right(result as any) // Type cast for now
        })
      } else {
        // Unknown request type
        response = new NlpWorkerResponse({
          requestId: "unknown",
          result: Either.left(
            new NlpWorkerError({
              reason: "Unknown request type",
              details: `Unsupported request type: ${requestType}`
            })
          )
        })
      }

      // Send response back to main thread
      self.postMessage(response)
    } catch (error) {
      // Handle any errors
      const errorResponse = new NlpWorkerResponse({
        requestId: "error",
        result: Either.left(
          new NlpWorkerError({
            reason: "Worker error",
            details: error instanceof Error ? error.message : "Unknown error"
          })
        )
      })
      self.postMessage(errorResponse)
    }
  })

  // Run the effect with the runtime
  runtime.runPromise(handleMessage).catch((error) => {
    console.error("Worker error:", error)
  })
}
