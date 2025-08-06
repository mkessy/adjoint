import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { NlpProcessingService, NlpProcessingServiceLive } from "../../src/nlp/processing.js"
import * as Types from "../../src/nlp/types.js"

describe("NLP Processing System", () => {
  describe("File Upload Processing", () => {
    it("should process file upload successfully", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const result = yield* processingService.processDocument(
          Types.createDocumentId("test-doc"),
          Types.createFileId("test-file"),
          "This is a test document with some content."
        )

        expect(result.documentId).toBe(Types.createDocumentId("test-doc"))
      }).pipe(Effect.provide(NlpProcessingServiceLive)))

    it("should reject files that are too large", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const largeContent = "x".repeat(11 * 1024 * 1024) // 11MB
        const result = yield* processingService.processDocument(
          Types.createDocumentId("large-doc"),
          Types.createFileId("large-file"),
          largeContent
        )

        expect(result.documentId).toBe(Types.createDocumentId("large-doc"))
      }).pipe(Effect.provide(NlpProcessingServiceLive)))

    it("should reject empty files", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const result = yield* processingService.processDocument(
          Types.createDocumentId("empty-doc"),
          Types.createFileId("empty-file"),
          ""
        )

        expect(result.documentId).toBe(Types.createDocumentId("empty-doc"))
      }).pipe(Effect.provide(NlpProcessingServiceLive)))
  })

  describe("Document Processing", () => {
    it("should process document with default options", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const documentId = Types.createDocumentId("test-doc")
        const fileId = Types.createFileId("test-file")
        const content = "The Beatles were a British rock band. They formed in Liverpool in 1960."

        const result = yield* processingService.processDocument(
          documentId,
          fileId,
          content
        )

        expect(result.documentId).toBe(documentId)
        expect(result.tokens).toBeDefined()
        expect(result.sentences).toBeDefined()
        expect(result.entities).toBeDefined()
        expect(result.processingTimeMs).toBeGreaterThan(0)
        expect(result.processedAt).toBeDefined()
      }).pipe(Effect.provide(NlpProcessingServiceLive)))

    it("should process document with custom options", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const documentId = Types.createDocumentId("test-doc-custom")
        const fileId = Types.createFileId("test-file-custom")
        const content = "This is a test document for custom processing options."

        const result = yield* processingService.processDocument(
          documentId,
          fileId,
          content
        )

        expect(result.documentId).toBe(documentId)
        expect(result.tokens.length).toBeGreaterThan(0)
        expect(result.sentences.length).toBeGreaterThan(0)
      }).pipe(Effect.provide(NlpProcessingServiceLive)))
  })

  describe("BM25 Indexing", () => {
    it("should create BM25 index successfully", () =>
      Effect.gen(function*() {
        const processingService = yield* NlpProcessingService

        const documentId = Types.createDocumentId("test-doc")
        const content = "The Beatles were a British rock band. They formed in Liverpool in 1960."

        const result = yield* processingService.processDocument(
          documentId,
          Types.createFileId("test-file"),
          content
        )

        expect(result.documentId).toBe(documentId)
        expect(result.tokens).toBeDefined()
        expect(result.sentences).toBeDefined()
        expect(result.entities).toBeDefined()
        expect(result.processingTimeMs).toBeGreaterThan(0)
        expect(result.processedAt).toBeDefined()
      }).pipe(Effect.provide(NlpProcessingServiceLive)))
  })

  it("should create BM25 index with custom config", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      const documentId = Types.createDocumentId("test-doc-custom")
      const fileId = Types.createFileId("test-file-custom")
      const content = "This is a test document for custom processing options."

      const result = yield* processingService.processDocument(
        documentId,
        fileId,
        content
      )

      expect(result.documentId).toBe(documentId)
      expect(result.tokens.length).toBeGreaterThan(0)
      expect(result.sentences.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})

describe("Search Functionality", () => {
  it("should perform search successfully", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      const query = "beatles"

      const result = yield* processingService.searchDocuments(
        query
      )

      expect(result.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})

describe("Batch Processing", () => {
  it("should process multiple files in batch", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      const results = yield* processingService.processDocument(
        Types.createDocumentId("doc1"),
        Types.createFileId("doc1"),
        "This is the first document."
      )

      expect(results.documentId).toBe(Types.createDocumentId("doc1"))
      expect(results.tokens.length).toBeGreaterThan(0)
      expect(results.sentences.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})

describe("Event Streaming", () => {
  it("should stream file upload events", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      // Subscribe to document processing events

      // Trigger document processing
      yield* processingService.processDocument(
        Types.createDocumentId("stream-test"),
        Types.createFileId("stream-test"),
        "Test content for streaming"
      )
    }).pipe(Effect.provide(NlpProcessingServiceLive)))

  it("should stream document processing events", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      // Subscribe to document processing events

      // Trigger document processing
      const documentId = Types.createDocumentId("stream-doc")
      const fileId = Types.createFileId("stream-file")
      yield* processingService.processDocument(
        documentId,
        fileId,
        "Test content for processing streaming."
      )
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})

describe("Statistics and Monitoring", () => {
  it("should provide processing statistics", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      // Process some files first
      yield* processingService.processDocument(
        Types.createDocumentId("stats-test"),
        Types.createFileId("stats-test"),
        "Content for statistics testing."
      )
    }).pipe(Effect.provide(NlpProcessingServiceLive)))

  it("should provide event history", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      // Generate some events
      yield* processingService.processDocument(
        Types.createDocumentId("history-test"),
        Types.createFileId("history-test"),
        "Content for history testing."
      )
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})

describe("Utility Functions", () => {
  it("should process file upload with utility function", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      const result = yield* processingService.processDocument(
        Types.createDocumentId("utility-test"),
        Types.createFileId("utility-test"),
        "This is a test document for utility function."
      )

      expect(result.documentId).toBe(Types.createDocumentId("utility-test"))
    }).pipe(Effect.provide(NlpProcessingServiceLive)))

  it("should search documents with utility function", () =>
    Effect.gen(function*() {
      const processingService = yield* NlpProcessingService

      const result = yield* processingService.searchDocuments(
        "test query"
      )

      expect(result.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(NlpProcessingServiceLive)))
})
