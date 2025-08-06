import { Context, Data, Effect, Layer, Ref } from "effect"
import { NlpGraph } from "../../nlp/NlpGraph.js"
import { GraphId } from "../graph.js"

export class GraphNotFoundError extends Data.TaggedError("GraphNotFoundError")<{
  readonly graphId: GraphId
  readonly reason: "GraphNotFound"
}> {}

export class GraphStateService extends Context.Tag("GraphStateService")<
  GraphStateService,
  {
    readonly createGraph: () => Effect.Effect<{ graphId: GraphId; graph: NlpGraph }>
    readonly getGraph: (graphId: GraphId) => Effect.Effect<NlpGraph, GraphNotFoundError>
    readonly updateGraph: (
      graphId: GraphId,
      f: (graph: NlpGraph) => NlpGraph
    ) => Effect.Effect<void, GraphNotFoundError>
    readonly listGraphs: Effect.Effect<ReadonlyArray<{ graphId: GraphId }>>
  }
>() {}

export const GraphStateServiceLive = Layer.effect(
  GraphStateService,
  Effect.gen(function*() {
    const graphs = yield* Ref.make<Map<GraphId, NlpGraph>>(new Map())

    const createGraph = () =>
      Effect.gen(function*() {
        const graphId = GraphId.make(`graph-${crypto.randomUUID()}`)
        const graph = new NlpGraph()
        yield* Ref.update(graphs, (map) => map.set(graphId, graph))
        return { graphId, graph }
      })

    const getGraph = (graphId: GraphId) =>
      Ref.get(graphs).pipe(
        Effect.map((map) => map.get(graphId) as NlpGraph | undefined),
        Effect.flatMap((graph) =>
          graph ? Effect.succeed(graph) : Effect.fail(new GraphNotFoundError({ graphId, reason: "GraphNotFound" }))
        )
      )

    const updateGraph = (
      graphId: GraphId,
      f: (graph: NlpGraph) => NlpGraph
    ) =>
      getGraph(graphId).pipe(
        Effect.flatMap((graph) => Ref.update(graphs, (map) => map.set(graphId, f(graph))))
      )

    const listGraphs = Ref.get(graphs).pipe(
      Effect.map((map) => Array.from(map.keys()).map((graphId) => ({ graphId })))
    )

    return GraphStateService.of({
      createGraph,
      getGraph,
      updateGraph,
      listGraphs
    })
  })
)
