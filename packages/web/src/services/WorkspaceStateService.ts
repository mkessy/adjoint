import type * as Graph from "@adjoint/domain/graph/graph"
import {WorkSpace}
import { Chunk, Context, Effect, Layer, Option, Stream } from "effect"
import type { GraphSnapshot } from "./types.js"

/**
 * Service managing the sequence of immutable Graph states
 */
export class WorkspaceStateService extends Context.Tag("WorkspaceStateService")<
  WorkspaceStateService,
  {
    readonly currentGraph: Effect.Effect<Graph.Graph>
    readonly graphStream: Stream.Stream<Graph.Graph>
    readonly commitGraph: (graph: Graph.Graph) => Effect.Effect<void>
    readonly undo: Effect.Effect<Option.Option<Graph.Graph>>
    readonly redo: Effect.Effect<Option.Option<Graph.Graph>>
    readonly getHistory: Effect.Effect<Chunk.Chunk<GraphSnapshot>>
    readonly canUndo: Effect.Effect<boolean>
    readonly canRedo: Effect.Effect<boolean>
  }
>() {
  static Default = Layer.succeed(this)({
    currentGraph: Effect.succeed({} as Graph.Graph),
    graphStream: Stream.empty,
    commitGraph: () => Effect.succeed(undefined),
    undo: Effect.succeed(Option.none()),
    redo: Effect.succeed(Option.none()),
    getHistory: Effect.succeed(Chunk.empty()),
    canUndo: Effect.succeed(false),
    canRedo: Effect.succeed(false)
  })
}
