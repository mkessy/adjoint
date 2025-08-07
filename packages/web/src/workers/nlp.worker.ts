// Web Worker for NLP Processing
// This worker handles NLP operations in a separate thread to avoid blocking the main UI

import { NlpProcessingServiceLive } from "@adjoint/domain/nlp/worker"
import { Effect, Layer } from "effect"

// Create the NLP service layer for the worker context
const WorkerLayer = Layer.mergeAll(
  NlpProcessingServiceLive
)

// Handle messages from the main thread
self.onmessage = async (event) => {
  try {
    const request = event.data

    // Process the request using the NLP service
    const program = Effect.gen(function*() {
      // The worker will handle different types of NLP processing requests
      // This is a placeholder - the actual implementation would dispatch
      // based on the request type to the appropriate NLP service method
      return { success: true, requestId: request.requestId }
    })

    // Run the Effect program with the worker layer
    const result = await Effect.runPromise(program.pipe(
      Effect.provide(WorkerLayer)
    ))

    // Send the result back to the main thread
    self.postMessage({
      requestId: request.requestId,
      result: { _tag: "Success", value: result }
    })
  } catch (error) {
    // Send error back to the main thread
    self.postMessage({
      requestId: event.data.requestId,
      result: { _tag: "Failure", error }
    })
  }
}

// Worker is ready
self.postMessage({ type: "ready" })
