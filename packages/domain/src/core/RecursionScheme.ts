import { Schema as S } from "effect"

// Recursion schemes as defined in the proposal
export const RecursionScheme = S.Literal(
  "Catamorphism",
  "Anamorphism",
  "Hylomorphism",
  "Zygomorphism",
  "Histomorphism",
  "Paramorphism",
  "Functor"
).pipe(
  S.brand("RecursionScheme")
)

export type RecursionScheme = S.Schema.Type<typeof RecursionScheme>

// Type-safe helpers for each recursion scheme
export const RecursionSchemes = {
  Catamorphism: "Catamorphism" as const,
  Anamorphism: "Anamorphism" as const,
  Hylomorphism: "Hylomorphism" as const,
  Zygomorphism: "Zygomorphism" as const,
  Histomorphism: "Histomorphism" as const,
  Paramorphism: "Paramorphism" as const,
  Functor: "Functor" as const
} as const
