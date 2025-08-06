import { Schema } from "effect"
import * as Types from "./types.js"

// --- Request Messages ---

export class ProcessDocumentRequest extends Schema.Class<ProcessDocumentRequest>("ProcessDocumentRequest")({
  requestId: Schema.String,
  documentId: Types.DocumentId,
  fileId: Types.FileId,
  content: Schema.String
}) {}

export class CreateBM25IndexRequest extends Schema.Class<CreateBM25IndexRequest>("CreateBM25IndexRequest")({
  requestId: Schema.String,
  documentId: Types.DocumentId
}) {}

export class SearchDocumentsRequest extends Schema.Class<SearchDocumentsRequest>("SearchDocumentsRequest")({
  requestId: Schema.String,
  query: Schema.String
}) {}

export class GetNeighborsRequest extends Schema.Class<GetNeighborsRequest>("GetNeighborsRequest")({
  requestId: Schema.String,
  documentId: Types.DocumentId,
  nodeId: Schema.Number,
  edgeType: Schema.optional(Schema.Number)
}) {}

export const NlpWorkerRequestSchema = Schema.Union(
  ProcessDocumentRequest,
  GetNeighborsRequest,
  CreateBM25IndexRequest,
  SearchDocumentsRequest
)

export type NlpWorkerRequest = Schema.Schema.Type<typeof NlpWorkerRequestSchema>

// --- Response Payload Schemas ---

export const TokenSchema = Schema.Struct({
  id: Types.TokenId,
  documentId: Types.DocumentId,
  value: Schema.String,
  pos: Schema.String, // Simplified for protocol
  stopWordFlag: Schema.Boolean,
  negationFlag: Schema.Boolean,
  position: Schema.Struct({
    start: Schema.Number,
    end: Schema.Number
  }),
  sentenceId: Schema.optional(Types.SentenceId)
})

const SentenceSchema = Schema.Struct({
  id: Types.SentenceId,
  documentId: Types.DocumentId,
  text: Schema.String,
  tokens: Schema.Array(Types.TokenId),
  sentiment: Schema.Any, // Simplified for protocol
  position: Schema.Struct({
    start: Schema.Number,
    end: Schema.Number
  }),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

const EntitySchema = Schema.Struct({
  id: Schema.String,
  documentId: Types.DocumentId,
  value: Schema.String,
  type: Schema.String, // Simplified for protocol
  tokens: Schema.Array(Types.TokenId),
  position: Schema.Struct({
    start: Schema.Number,
    end: Schema.Number
  }),
  confidence: Schema.Number,
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

export class SearchSuccess extends Schema.Class<SearchSuccess>("SearchSuccess")({
  results: Schema.Array(
    Schema.Struct({
      documentId: Types.DocumentId,
      score: Schema.Number
    })
  )
}) {}

export class DocumentProcessingSuccess extends Schema.Class<DocumentProcessingSuccess>("DocumentProcessingSuccess")({
  documentId: Types.DocumentId,
  tokens: Schema.Array(TokenSchema),
  sentences: Schema.Array(SentenceSchema),
  entities: Schema.Array(EntitySchema),
  processingTimeMs: Schema.Number,
  processedAt: Schema.DateFromSelf
}) {}

export class GetNeighborsSuccess extends Schema.Class<GetNeighborsSuccess>("GetNeighborsSuccess")({
  nodeId: Schema.Number,
  // We send back a plain array of numbers, not a TypedArray
  neighborIds: Schema.Array(Schema.Number)
}) {}

// --- Error Payloads ---

export class NlpWorkerError extends Schema.Class<NlpWorkerError>("NlpWorkerError")({
  reason: Schema.String,
  details: Schema.optional(Schema.String)
}) {}

// --- General Response Wrapper ---

export const NlpWorkerSuccessResultSchema = Schema.Union(
  DocumentProcessingSuccess,
  GetNeighborsSuccess,
  SearchSuccess
)
export type NlpWorkerSuccessResult = Schema.Schema.Type<typeof NlpWorkerSuccessResultSchema>

export class NlpWorkerResponse extends Schema.Class<NlpWorkerResponse>("NlpWorkerResponse")({
  requestId: Schema.String,
  result: Schema.Either({ right: NlpWorkerSuccessResultSchema, left: NlpWorkerError })
}) {}
