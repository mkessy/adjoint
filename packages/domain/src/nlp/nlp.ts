import type { Effect } from "effect"
import { Context, Data, Schema } from "effect"
import type * as Types from "./types.js"

// Section: Error Types

export class NlpError extends Data.TaggedError("NlpError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// Section: Schema

export const WinkDocSchema = Schema.Struct({
  text: Schema.String,
  entities: Schema.Array(
    Schema.Struct({
      value: Schema.String,
      type: Schema.String
    })
  ),
  sentences: Schema.Array(Schema.String)
})

export type WinkDoc = Schema.Schema.Type<typeof WinkDocSchema>

// Section: Service

export class WinkNlpService extends Context.Tag("WinkNlpService")<
  WinkNlpService,
  {
    readonly process: (
      documentId: Types.DocumentId,
      text: string
    ) => Effect.Effect<Types.NlpDocumentSchema, NlpError>
  }
>() {}
