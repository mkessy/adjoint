import { describe, expect, it } from "vitest"
import { BM25Vectorizer, winkDistanceBow } from "../src/index.js"

describe("Wink Utilities", () => {
  describe("Distance Utilities", () => {
    it("should export wink distance bow utilities", () => {
      expect(winkDistanceBow).toBeDefined()
      expect(winkDistanceBow.bow).toBeDefined()
      expect(winkDistanceBow.bow.cosine).toBeInstanceOf(Function)
    })

    it("should calculate cosine similarity", () => {
      const { cosine } = winkDistanceBow.bow

      // Test with simple vectors
      const vec1 = [1, 0, 1]
      const vec2 = [1, 1, 0]

      const similarity = cosine(vec1, vec2)
      expect(typeof similarity).toBe("number")
      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
    })
  })

  describe("BM25 Vectorizer", () => {
    it("should export BM25Vectorizer function", () => {
      expect(BM25Vectorizer).toBeInstanceOf(Function)
    })

    it("should create BM25 vectorizer instance", () => {
      const bm25 = BM25Vectorizer()
      expect(bm25).toBeDefined()
      expect(typeof bm25.learn).toBe("function")
      expect(typeof bm25.vectorOf).toBe("function")
    })
  })
})
