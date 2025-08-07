import { Context, Effect, Layer, Pool } from "effect"
import model from "wink-eng-lite-web-model"
import winkNlp from "wink-nlp"
import { SentimentScore } from "../nlp/types.js"
import * as Types from "../nlp/types.js"

const nlp = winkNlp(model)
const its = nlp.its

export class WorkerService extends Context.Tag("WorkerService")<
  WorkerService,
  {
    readonly submitTask: (
      task: Types.WorkerTask
    ) => Effect.Effect<Types.WorkerResult, Types.WorkerError>
  }
>() {}

const processTokenization = (documentId: Types.DocumentId, input: unknown) =>
  Effect.gen(function*() {
    if (typeof input !== "string") {
      return yield* Effect.fail(new Error("Input must be string for tokenization"))
    }

    const doc = nlp.readDoc(input)
    const sentencesRaw = doc.sentences().out()
    const tokens: Array<Types.Token> = []
    const sentences: Array<Types.Sentence> = []

    doc.tokens().each((t: any, i: any) => {
      tokens.push(
        new Types.Token({
          id: Types.createTokenId(`${documentId}-t${i}`),
          documentId,
          value: t.out(),
          pos: t.out(its.pos) as Types.PartOfSpeech,
          stopWordFlag: t.out(its.stopWordFlag) as boolean,
          negationFlag: t.out(its.negationFlag) as boolean,
          position: { start: t.index(), end: t.index() + t.out().length },
          sentenceId: undefined as unknown as Types.SentenceId // Will be set later
        })
      )
    })

    sentencesRaw.forEach((s: any, i: any) => {
      const sentenceId = Types.createSentenceId(`${documentId}-s${i}`)
      const sentenceTokens = doc
        .sentences()
        .itemAt(i)
        .tokens()

      sentences.push(
        new Types.Sentence({
          id: sentenceId,
          documentId,
          text: s,
          tokens: sentenceTokens.out().map((t) => Types.createTokenId(t)),
          sentiment: new SentimentScore({
            score: 0,
            confidence: 0,
            positive: 0, // TODO: Implement sentiment analysis
            negative: 0, // TODO: Implement sentiment analysis
            neutral: 0 // TODO: Implement sentiment analysis
            // TODO: Implement sentiment analysis
            // TODO: Implement sentiment analysis
            // TODO: Implement sentiment analysis
          }),
          position: { start: 0, end: 0 },
          metadata: {}
        })
      )
    })

    return { tokens, sentences }
  })

const processWorkerTask = (task: Types.WorkerTask) =>
  Effect.gen(function*() {
    const startTime = Date.now()
    const workerId = Types.generateWorkerId()

    yield* Effect.logDebug("Processing worker task", {
      taskId: task.id,
      operation: task.operation,
      workerId
    })

    const output = yield* Effect.match(Effect.succeed(task), {
      onFailure: (error: unknown) => {
        return Effect.fail(
          new Types.WorkerError({
            taskId: task.id,
            operation: task.operation,
            message: error instanceof Error ? error.message : "Task processing failed",
            cause: error,
            workerId: Types.generateWorkerId(),
            timestamp: new Date()
          })
        )
      },
      onSuccess: (task) => {
        return Effect.match(Effect.succeed(task), {
          onSuccess: (task) => {
            return processTokenization(task.documentId, task.input as string)
          },
          onFailure: (error: unknown) => {
            return Effect.fail(error as Types.WorkerError)
          }
        })
      }
    })

    const result = new Types.WorkerResult({
      taskId: task.id,
      operation: task.operation,
      output,
      processingTimeMs: Date.now() - startTime,
      completedAt: new Date(),
      workerId
    })

    yield* Effect.logDebug("Worker task completed", {
      taskId: task.id,
      processingTimeMs: result.processingTimeMs,
      workerId
    })

    return result
  }).pipe(
    Effect.timeout("60 seconds"),
    Effect.catchAll((error) =>
      Effect.fail(
        new Types.WorkerError({
          taskId: task.id,
          operation: task.operation,
          message: error instanceof Error ? error.message : "Task processing failed",
          cause: error,
          workerId: Types.generateWorkerId(),
          timestamp: new Date()
        })
      )
    )
  )

export const WorkerServiceLive = Layer.effect(
  WorkerService,
  Effect.gen(function*() {
    const pool = yield* Pool.make({
      acquire: Effect.succeed(1), // Fake worker, real work is sync
      size: navigator.hardwareConcurrency || 4
    })

    const submitTask = (task: Types.WorkerTask) =>
      Effect.scoped(
        Pool.get(pool).pipe(
          Effect.flatMap(() => processWorkerTask(task))
        )
      )

    return WorkerService.of({
      submitTask: submitTask as (task: Types.WorkerTask) => Effect.Effect<Types.WorkerResult, Types.WorkerError, never>
    })
  })
)

export const createTokenizationTask = (
  documentId: Types.DocumentId,
  content: string,
  priority: number = 5
): Types.WorkerTask =>
  new Types.WorkerTask({
    operation: "tokenize" as const,
    id: Types.generateTaskId(),
    input: content,
    documentId,
    priority,
    createdAt: new Date(),
    timeout: "60 seconds"
  })
