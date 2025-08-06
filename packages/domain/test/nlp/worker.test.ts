import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { WinkNlpService } from "../../src/nlp/nlp.js"
import * as Types from "../../src/nlp/types.js"
import { WinkNlpServiceLive } from "../../src/nlp/WinkNlpService.js"
import { WorkerServiceLive } from "../../src/workers/WorkerService.js"

describe("NLP Worker", () => {
  describe("Text Processing", () => {
    it("should process simple text", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          "Hello world. This is a test."
        )

        expect(result.tokens).toBeDefined()
        expect(result.sentences).toHaveLength(2)
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))

    it("should handle empty text", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          ""
        )

        expect(result.tokens).toBeDefined()
        expect(result.sentences).toHaveLength(0) // Empty string has no sentences
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))

    it("should extract sentences correctly", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const text =
          "The Beatles were a British rock band. They formed in Liverpool in 1960. John Lennon and Paul McCartney were the main songwriters."
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          text
        )

        expect(result.tokens).toBeDefined()
        expect(result.sentences).toHaveLength(3)
        expect(result.sentences[0]).toBe("The Beatles were a British rock band")
        expect(result.sentences[1]).toBe(" They formed in Liverpool in 1960")
        expect(result.sentences[2]).toBe(" John Lennon and Paul McCartney were the main songwriters")
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))
  })

  describe("Error Handling", () => {
    it("should handle processing errors gracefully", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService

        // Test with very long string
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          "A".repeat(10000)
        )

        expect(result.tokens).toBeDefined()
        expect(result.sentences).toBeDefined()
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))

    it("should handle special characters", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const text = "Special chars: @#$%^&*()_+-=[]{}|;':\",./<>?"
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          text
        )

        expect(result.tokens).toBeDefined()
        // The text contains a colon which might be treated as a sentence boundary
        expect(result.sentences.length).toBeGreaterThan(0)
        expect(result.sentences.length).toBeLessThanOrEqual(2)
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))
  })

  describe("Performance", () => {
    it("should process large text efficiently", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const largeText = "This is a test sentence. ".repeat(100) // 100 sentences
        const result = yield* nlp.process(
          Types.createDocumentId("test-doc"),
          largeText
        )

        expect(result.tokens).toBeDefined()
        expect(result.sentences).toHaveLength(100)
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))

    it("should handle concurrent processing", () =>
      Effect.gen(function*() {
        const nlp = yield* WinkNlpService
        const texts = [
          "First sentence.",
          "Second sentence.",
          "Third sentence.",
          "Fourth sentence.",
          "Fifth sentence."
        ]

        const results = yield* Effect.all(
          texts.map((text) => nlp.process(Types.createDocumentId("test-doc"), text)),
          { concurrency: 3 }
        )

        expect(results).toHaveLength(5)
        results.forEach((result) => {
          expect(result.tokens).toBeDefined()
          expect(result.sentences).toHaveLength(1)
        })
      }).pipe(Effect.provide(WinkNlpServiceLive.pipe(Layer.provide(WorkerServiceLive))), Effect.scoped))
  })
})
