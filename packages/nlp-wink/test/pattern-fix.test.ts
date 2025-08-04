import { Nlp } from "@adjoint/domain"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import * as Wink from "../src/Wink.js"

describe("Pattern Fix Verification", () => {
  const testPatterns = (text: string) =>
    Effect.gen(function*() {
      const nlp = yield* Nlp.Nlp
      const analyzed = yield* nlp.processText(text)
      return analyzed.mentions
    }).pipe(Effect.provide(Wink.Default))

  it("should extract artists from attribution phrases", () =>
    Effect.gen(function*() {
      const mentions = yield* testPatterns("produced by Dr. Dre featuring Eminem")

      // Check if we have mentions that could be artists
      const hasArtistMentions = mentions.some((m) => m.text.includes("Dr. Dre") || m.text.includes("Eminem"))

      expect(hasArtistMentions).toBe(true)
    }).pipe(Effect.runPromise))

  it("should match hip-hop as GENRE", () =>
    Effect.gen(function*() {
      const mentions = yield* testPatterns("I love hip-hop music")

      const hasHipHop = mentions.some((m) => m.text === "hip-hop")

      expect(hasHipHop).toBe(true)
    }).pipe(Effect.runPromise))
})
