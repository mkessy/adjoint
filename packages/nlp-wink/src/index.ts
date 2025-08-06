// Main exports for @adjoint/nlp-wink package

// Type declarations for wink utilities
declare const winkDistance: {
  bow: {
    cosine: (vec1: Array<number>, vec2: Array<number>) => number
  }
}

declare const BM25VectorizerImpl: () => {
  learn: (tokens: Array<string>) => void
  bowOf: (tokens: Array<string>) => Array<number>
  doc: (index: number) => { out: (its: any) => Array<number> }
}

// Re-export wink-distance bow utilities
const winkDistanceImport = require("wink-distance")

// Re-export BM25Vectorizer utility
const BM25VectorizerImport = require("wink-nlp/utilities/bm25-vectorizer")

// Export the specific utilities needed by domain layer
export const winkDistanceBow: typeof winkDistance = winkDistanceImport
export const BM25Vectorizer: typeof BM25VectorizerImpl = BM25VectorizerImport
