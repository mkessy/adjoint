import { Context, Effect, Hub, Layer, Ref, Stream, Chunk, Option, DateTime } from "effect"
import { Graph } from "@adjoint/domain"
import { GraphSnapshot } from "./types.js"

/**
 * Service managing the sequence of immutable Graph states
 */
export class WorkspaceStateService extends Context.Tag("WorkspaceStateService")<
  WorkspaceStateService,
  {
    readonly currentGraph: Effect.Effect<Graph>
    readonly graphStream: Stream.Stream<Graph>
    readonly commitGraph: (graph: Graph) => Effect.Effect<void>
    readonly undo: Effect.Effect<Option.Option<Graph>>
    readonly redo: Effect.Effect<Option.Option<Graph>>
    readonly getHistory: Effect.Effect<Chunk.Chunk<GraphSnapshot>>
    readonly canUndo: Effect.Effect<boolean>
    readonly canRedo: Effect.Effect<boolean>
  }
>() {
  static Default = Layer.succeed(this)({
    currentGraph: Effect.succeed({} as Graph),
    graphStream: Stream.empty,
    commitGraph: () => Effect.unit,
    undo: Effect.succeed(Option.none()),
    redo: Effect.succeed(Option.none()),
    getHistory: Effect.succeed(Chunk.empty()),
    canUndo: Effect.succeed(false),
    canRedo: Effect.succeed(false)
  })
}