/* eslint-disable @typescript-eslint/no-require-imports */
import type { Option } from "effect"
import { Context, Data, Effect, Layer, Ref } from "effect"
import model from "wink-eng-lite-web-model"
import winkNlp from "wink-nlp"
import type { GraphNotFoundError } from "../graph/services/state.js"
import { GraphStateService, GraphStateServiceLive } from "../graph/services/state.js"

import { NodeType } from "./NlpGraph.js"
import * as Types from "./types.js"
import { DocumentProcessingSuccess } from "./worker-protocol.js"

// Import wink utilities directly
const winkDistance = require("wink-distance")
const BM25VectorizerImpl = require("wink-nlp/utilities/bm25-vectorizer")

const { cosine } = winkDistance.bow
const BM25Vectorizer = BM25VectorizerImpl

const nlp = winkNlp(model)
const its = nlp.its

export class NlpProcessingError extends Data.TaggedError("NlpProcessingError")<{
  readonly reason: "SizeLimitExceeded" | "InvalidFormat" | "ProcessingFailed" | "DocumentNotFound"
  readonly fileId?: Types.FileId
  readonly documentId?: Types.DocumentId
  readonly details?: unknown
}> {}

export class BM25IndexSuccess extends Data.TaggedClass("BM25IndexSuccess")<{
  readonly indexId: Types.IndexId
  readonly documentId: Types.DocumentId
  readonly termFrequencies: ReadonlyMap<string, number>
  readonly documentLength: number
  readonly processingTimeMs: number
}> {}

export class ProcessingPipeline extends Data.TaggedClass("ProcessingPipeline")<{
  readonly id: Types.PipelineId
  readonly name: string
  readonly stages: ReadonlyArray<Types.PipelineStage>
  readonly config: {
    readonly stages: ReadonlyArray<Types.PipelineStage>
  }
}> {}

export class ProcessingStats extends Data.TaggedClass("ProcessingStats")<{
  readonly totalFilesProcessed: number
  readonly totalDocumentsProcessed: number
  readonly averageProcessingTime: number
  readonly successRate: number
  readonly lastProcessedAt: Option.Option<Date>
}> {}

export class NlpProcessingService extends Context.Tag("NlpProcessingService")<
  NlpProcessingService,
  {
    readonly processDocument: (
      documentId: Types.DocumentId,
      fileId: Types.FileId,
      content: string
    ) => Effect.Effect<DocumentProcessingSuccess, NlpProcessingError>

    readonly getNeighbors: (
      documentId: Types.DocumentId,
      nodeId: number
    ) => Effect.Effect<ReadonlyArray<number>, GraphNotFoundError>

    readonly createBM25Index: (
      documentId: Types.DocumentId
    ) => Effect.Effect<BM25IndexSuccess, NlpProcessingError>

    readonly searchDocuments: (
      query: string
    ) => Effect.Effect<ReadonlyArray<{ documentId: Types.DocumentId; score: number }>, NlpProcessingError>

    readonly finalizeIndex: () => Effect.Effect<void, NlpProcessingError>
  }
>() {}

export const NlpProcessingServiceLive = Layer.effect(
  NlpProcessingService,
  Effect.gen(function*() {
    const graphState = yield* GraphStateService
    const tokenStore = yield* Ref.make<Map<Types.DocumentId, Array<string>>>(new Map())
    const learnedDocs = yield* Ref.make<Array<Types.DocumentId>>([])
    const bm25 = BM25Vectorizer()

    const processDocument = (
      documentId: Types.DocumentId,
      _fileId: Types.FileId,
      content: string
    ) =>
      Effect.gen(function*() {
        const start = Date.now()
        const doc = nlp.readDoc(content)
        const { graph, graphId } = yield* graphState.createGraph()
        yield* graphState.updateGraph(graphId, () => graph)

        const tokens: Array<Types.Token> = []

        const normalizedTokens = doc.tokens().out(its.normal)
        yield* Ref.update(tokenStore, (map) => map.set(documentId, normalizedTokens))

        for (let i = 0; i < doc.sentences().length(); i++) {
          const s = doc.sentences().itemAt(i)
          const sentenceNodeId = graph.addNode(NodeType.Sentence, i, -1)
          const sentenceTokens = s.tokens()

          for (let j = 0; j < sentenceTokens.length(); j++) {
            const t = sentenceTokens.itemAt(j)
            graph.addNode(NodeType.Token, j, sentenceNodeId)
            tokens.push(
              new Types.Token({
                id: Types.createTokenId(`${documentId}-t${j}`),
                documentId,
                value: t.out(),
                pos: t.out(its.pos) as Types.PartOfSpeech,
                stopWordFlag: t.out(its.stopWordFlag) as boolean,
                negationFlag: t.out(its.negationFlag) as boolean,
                position: { start: t.index(), end: t.index() + t.out().length },
                sentenceId: Types.createSentenceId(`${documentId}-s${i}`)
              })
            )
          }
        }

        const processingTimeMs = Date.now() - start

        return new DocumentProcessingSuccess({
          documentId,
          tokens,
          sentences: [],
          entities: [],
          processingTimeMs,
          processedAt: new Date()
        })
      }).pipe(
        Effect.catchAll((err) =>
          Effect.fail(
            new NlpProcessingError({
              reason: "ProcessingFailed",
              documentId,
              details: err
            })
          )
        )
      )

    const getNeighbors = (documentId: Types.DocumentId, nodeId: number) =>
      Effect.gen(function*() {
        const graph = yield* graphState.getGraph(documentId as any)
        return Array.from(graph.getNeighbors(nodeId))
      })

    const createBM25Index = (documentId: Types.DocumentId) =>
      Effect.gen(function*() {
        const allTokens = yield* Ref.get(tokenStore)
        const docTokens = allTokens.get(documentId)
        if (!docTokens) {
          return yield* Effect.fail(
            new NlpProcessingError({
              reason: "ProcessingFailed"
            })
          )
        }

        const start = Date.now()
        bm25.learn(docTokens)
        yield* Ref.update(learnedDocs, (docs) => [...docs, documentId])
        const processingTimeMs = Date.now() - start
        const indexId = Types.createIndexId(`bm25-global`)

        return new BM25IndexSuccess({
          indexId,
          documentId,
          termFrequencies: new Map(),
          documentLength: docTokens.length,
          processingTimeMs
        })
      })

    const searchDocuments = (query: string) =>
      Effect.gen(function*() {
        const queryTokens = nlp.readDoc(query).tokens().out(its.normal)
        const queryBOW = bm25.bowOf(queryTokens)
        const docIds = yield* Ref.get(learnedDocs)

        const results = docIds.map((docId, i) => {
          const docBOW = bm25.doc(i).out(its.bow)
          const distance = cosine(queryBOW, docBOW)
          const score = 1 - distance
          return { documentId: docId, score }
        })

        return results
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
      })

    const finalizeIndex = () =>
      Effect.sync(() => {
        bm25.out(its.docTermMatrix)
      })

    return NlpProcessingService.of({
      processDocument,
      getNeighbors,
      createBM25Index,
      searchDocuments,
      finalizeIndex
    })
  })
).pipe(Layer.provide(GraphStateServiceLive))
