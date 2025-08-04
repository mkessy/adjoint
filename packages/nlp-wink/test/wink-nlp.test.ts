import { Nlp } from "@adjoint/domain"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import * as Wink from "../src/Wink.js"

describe("Wink NLP Service", () => {
  const testText = "Nirvana released Nevermind in 1991. Kurt Cobain was the lead singer."

  describe("Core Functionality", () => {
    it("should create service with default config", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        expect(nlp.processText).toBeInstanceOf(Function)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should process text and return complete AnalyzedText", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText(testText)

        expect(analyzed).toBeInstanceOf(Nlp.AnalyzedText)
        expect(analyzed.id).toBeDefined()
        expect(analyzed.rawText).toBe(testText)
        expect(analyzed.sentences.length).toBe(2)
        expect(analyzed.mentions.length).toBeGreaterThan(0)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should extract tokens within sentences", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText(testText)

        // Check first sentence
        const firstSentence = analyzed.sentences[0]
        expect(firstSentence.text).toBe("Nirvana released Nevermind in 1991.")
        expect(firstSentence.tokens.length).toBeGreaterThan(0)

        // Check first token
        const firstToken = firstSentence.tokens[0]
        expect(firstToken).toBeInstanceOf(Nlp.Token)
        expect(firstToken.text).toBe("Nirvana")
        expect(firstToken.span[0]).toBe(0)
        expect(firstToken.span[1]).toBe(7)
        expect(firstToken.sentenceIndex).toBe(0)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should extract entities as mentions", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText(testText)

        expect(analyzed.mentions.length).toBeGreaterThan(0)
        expect(analyzed.mentions.some((m) => m.text.includes("Nirvana") || m.text.includes("Kurt"))).toBe(true)

        // Check mention structure
        const firstMention = analyzed.mentions[0]
        expect(firstMention.id).toBeDefined()
        expect(firstMention.text).toBeDefined()
        expect(firstMention.span).toBeDefined()
        expect(firstMention.status).toBeDefined()
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should work with custom entities", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText(testText)

        expect(analyzed.mentions.length).toBeGreaterThan(0)
      }).pipe(
        Effect.provide(Wink.Make({
          includeCustomEntities: true,
          customEntities: [
            { name: "BAND", patterns: ["Nirvana"] },
            { name: "PERSON", patterns: ["Kurt Cobain"] }
          ]
        })),
        Effect.runPromise
      ))
  })

  describe("Configuration", () => {
    it("should work with custom entities disabled", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText(testText)

        expect(Array.isArray(analyzed.mentions)).toBe(true)
      }).pipe(
        Effect.provide(Wink.Make({ includeCustomEntities: false, customEntities: [] })),
        Effect.runPromise
      ))
  })

  describe("Performance", () => {
    it("should handle empty input efficiently", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const analyzed = yield* nlp.processText("")

        expect(analyzed.sentences.length).toBe(1)
        expect(analyzed.mentions.length).toBe(0)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should process multiple texts efficiently", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const texts = [
          "The Beatles released Abbey Road.",
          "Led Zeppelin played rock music.",
          "Pink Floyd created progressive music."
        ]

        const results = yield* Effect.forEach(texts, (text) => nlp.processText(text))

        expect(results.every((analyzed) => analyzed.sentences.length > 0)).toBe(true)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))

    it("should extract from a paragraph", () =>
      Effect.gen(function*() {
        const nlp = yield* Nlp.Nlp
        const text =
          `It's almost impossible to talk about the renewed interest in Japanese music in the West without invoking the YouTube algorithm. The meteoric rise of city pop, as well as the ambient music that's come to be known as environmental music, seems propelled by its musical merit and the allure of its imagery in equal parts.`

        const analyzed = yield* nlp.processText(text)
        expect(analyzed.sentences.length).toBeGreaterThan(0)
        expect(analyzed.mentions.length).toBeGreaterThan(0)
      }).pipe(Effect.provide(Wink.Default), Effect.runPromise))
  })
})
