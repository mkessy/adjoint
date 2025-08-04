import { Cause, Data, Effect, Option } from "effect"

// --- Base Error Types ---

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
  readonly details?: unknown
}> {}

export class CompilationError extends Data.TaggedError("CompilationError")<{
  readonly message: string
  readonly details?: unknown
}> {}

export class ExecutionError extends Data.TaggedError("ExecutionError")<{
  readonly message: string
  readonly details?: unknown
}> {}

export class InternalError extends Data.TaggedError("InternalError")<{
  readonly message: string
  readonly defect: unknown
}> {}

// --- Type union of all possible user-facing errors ---
// Using a discriminated union based on the _tag property
export type AdjointError = ValidationError | CompilationError | ExecutionError | InternalError

/**
 * A reusable Effect operator that catches unexpected defects (die),
 * logs them as fatal errors, and maps them to a user-friendly
 * `InternalError` for safe propagation.
 */
export const handleDefects = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Effect.Effect<A, E | InternalError, R> =>
  self.pipe(
    Effect.catchAllCause((cause): Effect.Effect<never, E | InternalError, never> => {
      if (Cause.isDie(cause)) {
        // Extract the defect from the Die cause
        const defect = Option.getOrElse(
          Cause.dieOption(cause),
          () => "Unknown defect"
        )

        // This is a bug in our code. Log it with full details.
        return Effect.logFatal(
          "An unrecoverable defect was caught in the engine.",
          cause
        ).pipe(
          // Then, fail with a generic error so we don't expose the defect to the user.
          Effect.flatMap(() =>
            Effect.fail(
              new InternalError({
                message: "An internal error occurred. Please check the logs for a defect report.",
                defect
              })
            )
          )
        )
      }
      // This was an expected failure (Fail), so we just propagate it.
      return Effect.failCause(cause)
    })
  )
