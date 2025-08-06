import type { NlpProcessingError } from "@adjoint/domain/nlp/processing"
import { NlpProcessingService } from "@adjoint/domain/nlp/processing"
import * as Types from "@adjoint/domain/nlp/types"
import type { DocumentProcessingSuccess } from "@adjoint/domain/nlp/worker-protocol"
import {
  CreateBM25IndexRequest,
  GetNeighborsRequest,
  ProcessDocumentRequest,
  SearchDocumentsRequest
} from "@adjoint/domain/nlp/worker-protocol"
import { Deferred, Effect, Layer, Ref } from "effect"

export const NlpProcessingServiceProxyLive = Layer.effect(
  NlpProcessingService,
  Effect.gen(function*() {
    const worker = new Worker(new URL("../../../../../web/src/workers/nlp.worker.ts", import.meta.url), {
      type: "module"
    })

    const pending = yield* Ref.make<Map<string, Deferred.Deferred<any, any>>>(new Map())

    worker.onmessage = (event) => {
      const response = event.data
      Ref.get(pending).pipe(
        Effect.flatMap((map) =>
          Effect.sync(() => {
            const deferred = map.get(response.requestId)
            if (deferred) {
              if (response.result._tag === "Success") {
                Deferred.succeed(deferred, response.result.value)
              } else {
                Deferred.fail(deferred, response.result.error)
              }
              map.delete(response.requestId)
            }
          })
        ),
        Effect.runFork
      )
    }

    const processDocument = (documentId: Types.DocumentId, fileId: Types.FileId, content: string) =>
      Effect.gen(function*() {
        const requestId = Types.generateTaskId()
        const deferred = yield* Deferred.make<DocumentProcessingSuccess, NlpProcessingError>()
        yield* Ref.update(pending, (map) => map.set(requestId, deferred))

        const request = new ProcessDocumentRequest({
          requestId,
          fileId,
          documentId,
          content
        })

        worker.postMessage(request)

        return yield* Deferred.await(deferred)
      })

    const getNeighbors = (documentId: Types.DocumentId, nodeId: number) =>
      Effect.gen(function*() {
        const requestId = Types.generateTaskId()
        const deferred = yield* Deferred.make<any, any>()
        yield* Ref.update(pending, (map) => map.set(requestId, deferred))

        const request = new GetNeighborsRequest({
          requestId,
          documentId,
          nodeId
        })

        worker.postMessage(request)

        return yield* Deferred.await(deferred)
      })

    const createBM25Index = (documentId: Types.DocumentId) =>
      Effect.gen(function*() {
        const requestId = Types.generateTaskId()
        const deferred = yield* Deferred.make<any, any>()
        yield* Ref.update(pending, (map) => map.set(requestId, deferred))

        const request = new CreateBM25IndexRequest({
          requestId,
          documentId
        })

        worker.postMessage(request)

        return yield* Deferred.await(deferred)
      })

    const searchDocuments = (query: string) =>
      Effect.gen(function*() {
        const requestId = Types.generateTaskId()
        const deferred = yield* Deferred.make<any, any>()
        yield* Ref.update(pending, (map) => map.set(requestId, deferred))

        const request = new SearchDocumentsRequest({
          requestId,
          query
        })

        worker.postMessage(request)

        return yield* Deferred.await(deferred)
      })

    const finalizeIndex = () =>
      Effect.gen(function*() {
        const requestId = Types.generateTaskId()
        const deferred = yield* Deferred.make<any, any>()
        yield* Ref.update(pending, (map) => map.set(requestId, deferred))
      })

    return NlpProcessingService.of({
      processDocument,
      getNeighbors,
      createBM25Index,
      finalizeIndex,
      searchDocuments
    })
  })
)
