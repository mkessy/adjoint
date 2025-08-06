import { Brand, Data, Schema as S } from "effect"

// Branded types for type safety
export type FileId = string & Brand.Brand<"FileId">
export const FileId = S.String.pipe(S.brand("FileId"))

export type DocumentId = string & Brand.Brand<"DocumentId">
export const DocumentId = S.String.pipe(S.brand("DocumentId"))

export type TokenId = string & Brand.Brand<"TokenId">
export const TokenId = S.String.pipe(S.brand("TokenId"))

export type SentenceId = string & Brand.Brand<"SentenceId">
export const SentenceId = S.String.pipe(S.brand("SentenceId"))

export type IndexId = string & Brand.Brand<"IndexId">
export const IndexId = S.String.pipe(S.brand("IndexId"))

export type PipelineId = string & Brand.Brand<"PipelineId">
export const PipelineId = S.String.pipe(S.brand("PipelineId"))

export type TaskId = string & Brand.Brand<"TaskId">
const TaskIdBrand = Brand.nominal<TaskId>()
export const TaskIdSchema = S.String.pipe(S.brand("TaskId"))

export type WorkerId = string & Brand.Brand<"WorkerId">
const WorkerIdBrand = Brand.nominal<WorkerId>()
export const WorkerIdSchema = S.String.pipe(S.brand("WorkerId"))

// Core NLP Domain Types
/* export class NlpDocument extends Data.TaggedClass("NlpDocument")<{
  readonly id: DocumentId
  readonly fileName: string
  readonly content: string
  readonly mimeType: string
  readonly fileSize: number
  readonly uploadedAt: Date
  readonly tokens: ReadonlyArray<Token>
  readonly sentences: Array<Sentence>
  readonly entities: Array<Entity>
  readonly sentiment?: SentimentAnalysis
  readonly processedAt?: Date
}> {} */

// Processing Errors
export class NlpProcessingError extends Data.TaggedError("NlpProcessingError")<{
  readonly documentId: DocumentId
  readonly operation: "upload" | "tokenize" | "sentiment" | "entities"
  readonly message: string
  readonly cause?: unknown
}> {}

// Processing Options - Simplified
export class ProcessingOptions extends Data.TaggedClass("ProcessingOptions")<{
  readonly enableSentiment: boolean
  readonly enableEntities: boolean
}> {}

export const defaultProcessingOptions = (): ProcessingOptions =>
  new ProcessingOptions({
    enableSentiment: true,
    enableEntities: true
  })

export class SentimentAnalysis extends Data.TaggedClass("SentimentAnalysis")<{
  readonly documentScore: SentimentScore
  readonly overallSentiment: "positive" | "negative" | "neutral"
  readonly confidence: number
}> {}

// Token Types
export class Token extends Data.TaggedClass("Token")<{
  readonly id: TokenId
  readonly documentId: DocumentId
  readonly value: string
  readonly pos: PartOfSpeech
  readonly stopWordFlag: boolean
  readonly negationFlag: boolean
  readonly position: {
    readonly start: number
    readonly end: number
  }
  readonly sentenceId?: SentenceId
}> {}

export type PartOfSpeech =
  | "NOUN"
  | "VERB"
  | "ADJ"
  | "ADV"
  | "PRON"
  | "DET"
  | "PREP"
  | "CONJ"
  | "INTJ"
  | "AUX"
  | "NUM"
  | "PUNCT"
  | "SYM"
  | "X"
  | "SPACE"

// Sentence Types
export class Sentence extends Data.TaggedClass("Sentence")<{
  readonly id: SentenceId
  readonly documentId: DocumentId
  readonly text: string
  readonly tokens: Array<TokenId>
  readonly sentiment: SentimentScore
  readonly position: {
    readonly start: number
    readonly end: number
  }
  readonly metadata: Record<string, unknown>
}> {}

export const SentenceSchema = S.Struct({
  id: SentenceId,
  documentId: DocumentId,
  text: S.String,
  tokens: S.Array(TokenId),
  sentiment: S.Unknown as S.Schema<SentimentScore>, // Placeholder, define SentimentScoreSchema if needed
  position: S.Struct({
    start: S.Number,
    end: S.Number
  }),
  metadata: S.Unknown
})

export class SentimentScore extends Data.TaggedClass("SentimentScore")<{
  readonly score: number // -1 to 1
  readonly confidence: number // 0 to 1
  readonly positive: number
  readonly negative: number
  readonly neutral: number
}> {}

// Entity Types
export class Entity extends Data.TaggedClass("Entity")<{
  readonly id: string
  readonly documentId: DocumentId
  readonly value: string
  readonly type: EntityType
  readonly tokens: Array<TokenId>
  readonly position: {
    readonly start: number
    readonly end: number
  }
  readonly confidence: number
  readonly metadata: Record<string, unknown>
}> {}

export type EntityType =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "DATE"
  | "TIME"
  | "MONEY"
  | "PERCENT"
  | "QUANTITY"
  | "ORDINAL"
  | "CARDINAL"
  | "EVENT"
  | "WORK_OF_ART"
  | "LAW"
  | "LANGUAGE"
  | "NATIONALITY"
  | "RELIGION"
  | "IDEOLOGY"
  | "PROFESSION"

export type PipelineStage = "tokenization" | "sbd" | "pos" | "ner" | "sentiment" | "bm25"

// Essential Document Processing Types
export type ContentHash = string & Brand.Brand<"ContentHash">
export const ContentHash = S.String.pipe(
  S.pattern(/^[a-f0-9]{64}$/), // SHA-256 hash
  S.brand("ContentHash"),
  S.annotations({ description: "SHA-256 hash of document content" })
)

// Essential Worker Types
export type WorkerOperation = "tokenize" | "processGraph" | "computeHash"
export type TokenizeInput = {
  readonly documentId: DocumentId
  readonly content: string
}

export class WorkerTask extends Data.TaggedClass("WorkerTask")<{
  readonly id: TaskId
  readonly operation: WorkerOperation
  readonly input: unknown
  readonly priority: number
  readonly createdAt: Date
  readonly timeout?: string
  readonly documentId: DocumentId // Added for tokenization context
}> {}

export class WorkerResult extends S.Class<WorkerResult>("WorkerResult")({
  taskId: TaskIdSchema,
  operation: S.Literal("tokenize", "processGraph", "computeHash"),
  output: S.Unknown,
  processingTimeMs: S.Number.pipe(S.nonNegative()),
  completedAt: S.Date,
  workerId: WorkerIdSchema
}) {}

export class WorkerError extends S.TaggedError<WorkerError>()("WorkerError", {
  taskId: TaskIdSchema,
  operation: S.Literal("tokenize", "processGraph", "computeHash"),
  message: S.String,
  cause: S.optional(S.Unknown),
  workerId: WorkerIdSchema,
  timestamp: S.Date
}) {}

// Essential Processing Events
export type ProcessingEvent =
  | {
    readonly _tag: "FileUploadStarted"
    readonly fileId: FileId
    readonly fileName: string
    readonly contentHash: ContentHash
  }
  | { readonly _tag: "FileProcessingCompleted"; readonly document: NlpDocumentSchema; readonly fromCache: boolean }
  | { readonly _tag: "FileProcessingFailed"; readonly error: NlpProcessingError }
  | { readonly _tag: "WorkerTaskStarted"; readonly taskId: TaskId; readonly workerId: WorkerId }
  | { readonly _tag: "WorkerTaskCompleted"; readonly result: WorkerResult }
  | { readonly _tag: "WorkerTaskFailed"; readonly error: WorkerError }

// Schema definitions for serialization
export type NlpDocumentSchema = S.Schema.Type<typeof NlpDocumentSchema>
export const NlpDocumentSchema = S.Struct({
  _tag: S.Literal("NlpDocument"),
  id: DocumentId,
  fileName: S.String,
  content: S.String,
  mimeType: S.String,
  fileSize: S.Number,
  uploadedAt: S.Date,
  tokens: S.Array(S.Struct({
    id: TokenId,
    documentId: DocumentId,
    value: S.String,
    lemma: S.String,
    pos: S.String,
    position: S.Struct({ start: S.Number, end: S.Number })
  })),
  sentences: S.Array(S.Struct({
    id: SentenceId,
    text: S.String,
    position: S.Struct({ start: S.Number, end: S.Number })
  })),
  entities: S.Array(S.Struct({
    id: S.String,
    value: S.String,
    type: S.String,
    confidence: S.Number,
    position: S.Struct({ start: S.Number, end: S.Number })
  })),
  processedAt: S.optional(S.String)
})

// Utility functions
export const createFileId = (id: string): FileId => id as FileId
export const createDocumentId = (id: string): DocumentId => id as DocumentId
export const createTokenId = (id: string): TokenId => id as TokenId
export const createSentenceId = (id: string): SentenceId => id as SentenceId
export const createIndexId = (id: string): IndexId => id as IndexId
export const createPipelineId = (id: string): PipelineId => id as PipelineId

// Generate unique IDs
export const generateDocumentId = (): DocumentId =>
  createDocumentId(`doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

export const generateFileId = (): FileId =>
  createFileId(`file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

export const generateTaskId = (): TaskId => TaskIdBrand(`task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

export const generateWorkerId = (): WorkerId =>
  WorkerIdBrand(
    `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  )
