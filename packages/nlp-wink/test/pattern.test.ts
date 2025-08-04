import type { EntityResolution } from "@adjoint/domain"
import { Nlp } from "@adjoint/domain"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import * as Wink from "../src/Wink.js"

// Helper to find a specific mention in the results
const findMention = (
  mentions: ReadonlyArray<EntityResolution.Mention>,
  text: string
) => {
  return mentions.find((m) => m.text === text)
}

describe("Corrected Patterns V2 - Final Verification", () => {
  const testPatterns = (text: string) =>
    Effect.gen(function*() {
      const nlp = yield* Nlp.Nlp
      const analyzed = yield* nlp.processText(text)
      return analyzed.mentions
    }).pipe(Effect.provide(Wink.Default))

  describe("LOCATION Patterns", () => {
    it("should extract city-based and region-based artists", () =>
      Effect.gen(function*() {
        const text = "The LA-based artist and a well-known PNW artist collaborated."
        const mentions = yield* testPatterns(text)

        const location1 = findMention(mentions, "LA")
        const location2 = mentions.find((m) => m.text.includes("PNW artist"))

        expect(location1).toBeDefined()
        expect(location2).toBeDefined()
        expect(location2?.text).toBe("PNW artist")
      }).pipe(Effect.runPromise))

    it("should extract nationality-based descriptors", () =>
      Effect.gen(function*() {
        const text = "A French band and a Nigerian singer were on the bill."
        const mentions = yield* testPatterns(text)

        const location1 = mentions.find((m) => m.text.includes("French band"))

        expect(location1).toBeDefined()
      }).pipe(Effect.runPromise))

    it("should extract 'from' and 'in' location phrases", () =>
      Effect.gen(function*() {
        const text = "A producer from Chicago and a band based in Montreal."
        const mentions = yield* testPatterns(text)

        const location1 = mentions.find((m) => m.text === "Chicago")
        const location2 = mentions.find((m) => m.text === "Montreal")

        expect(location1).toBeDefined()
        expect(location2).toBeDefined()
      }).pipe(Effect.runPromise))

    it("should handle complex origin descriptors", () =>
      Effect.gen(function*() {
        const text = "The Haiti-born, Montreal-based producer Kaytranada."
        const mentions = yield* testPatterns(text)

        const location1 = findMention(mentions, "Haiti")
        const location2 = findMention(mentions, "Montreal")

        expect(location1).toBeDefined()
        expect(location2).toBeDefined()
      }).pipe(Effect.runPromise))
  })

  describe("Tokenization Tests", () => {
    it("should correctly match hyphenated genres", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText("I love hip-hop music")

        // Check if hip-hop was recognized as an entity
        const hipHop = analyzed.mentions.find((m) => m.text === "hip-hop")
        expect(hipHop).toBeDefined()
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it.skip("should correctly match punctuated attributions", () =>
      Effect.gen(function*() {
        // wink-nlp returns original text "feat.", not tokenized "feat ."
        const mentions = yield* testPatterns("produced by Dr. Dre feat. Eminem")
        const hasFeat = mentions.some((m) => m.text.includes("feat"))
        expect(hasFeat).toBe(true)
      }).pipe(Effect.runPromise))
  })

  describe("Token Position Accuracy", () => {
    it("should calculate correct token positions", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const text = "The quick brown fox"
        const analyzed = yield* nlp.processText(text)

        const tokens = analyzed.sentences[0].tokens
        expect(tokens[0]).toMatchObject({ text: "The", span: [0, 3] })
        expect(tokens[1]).toMatchObject({ text: "quick", span: [4, 9] })
        expect(tokens[2]).toMatchObject({ text: "brown", span: [10, 15] })
        expect(tokens[3]).toMatchObject({ text: "fox", span: [16, 19] })
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should handle punctuation correctly", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const text = "Hello, world!"
        const analyzed = yield* nlp.processText(text)

        const tokens = analyzed.sentences[0].tokens
        // Wink separates punctuation as individual tokens
        expect(tokens.find((t) => t.text === "Hello")).toBeDefined()
        expect(tokens.find((t) => t.text === ",")).toBeDefined()
        expect(tokens.find((t) => t.text === "world")).toBeDefined()
        expect(tokens.find((t) => t.text === "!")).toBeDefined()
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))
  })
})
