import type { Order } from "effect"
import { Chunk, Data, Effect, HashMap, Option, pipe, Schema } from "effect"
import { dual } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import type * as Algebra from "./algebra.js"
import * as Edge from "./edge.js"
import * as AdjointError from "./error.js"
import type { AnyNode, NodeId, NodeOrdering, NodePredicate } from "./node/index.js"

// --- Graph ID Brand ---

export const GraphId = Schema.String.pipe(
  Schema.brand("GraphId"),
  Schema.annotations({
    description: "A unique identifier for a graph.",
    title: "GraphId"
  })
)
export type GraphId = Schema.Schema.Type<typeof GraphId>

export class FoldResult extends Data.Class<{
  readonly result: AnyNode
  readonly statistics: HashMap.HashMap<string, number>
}> {}

export class Graph extends Data.TaggedClass("Graph")<{
  readonly id: GraphId
  readonly nodes: HashMap.HashMap<NodeId, AnyNode>
  readonly edges: Chunk.Chunk<Edge.Edge>
}> implements Pipeable {
  pipe(): Graph
  pipe<A>(ab: (self: Graph) => A): A
  pipe<A, B>(ab: (self: Graph) => A, bc: (a: A) => B): B
  pipe<A, B, C>(ab: (self: Graph) => A, bc: (a: A) => B, cd: (b: B) => C): C
  pipe<A, B, C, D>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D
  ): D
  pipe<A, B, C, D, E>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E
  ): E
  pipe<A, B, C, D, E, F>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E,
    fg: (e: E) => F
  ): F
  pipe<A, B, C, D, E, F, G>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E,
    fg: (e: E) => F,
    gh: (f: F) => G
  ): G
  pipe<A, B, C, D, E, F, G, H>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E,
    fg: (e: E) => F,
    gh: (f: F) => G,
    hi: (g: G) => H
  ): H
  pipe<A, B, C, D, E, F, G, H, I>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E,
    fg: (e: E) => F,
    gh: (f: F) => G,
    hi: (g: G) => H,
    ij: (h: H) => I
  ): I
  pipe<A, B, C, D, E, F, G, H, I, J>(
    ab: (self: Graph) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => E,
    fg: (e: E) => F,
    gh: (f: F) => G,
    hi: (g: G) => H,
    ij: (h: H) => I,
    jk: (i: I) => J
  ): J
  pipe(
    ...args: ReadonlyArray<(a: any) => any>
  ): any {
    return (pipe as any)(this, ...args)
  }
}

// --- Constructors ---

/** Generate a new unique GraphId */
export const generateGraphId = (): GraphId => GraphId.make(`graph-${crypto.randomUUID()}`)

/** Create a GraphId from a string (useful for testing) */
export const makeGraphId = (id: string): GraphId => GraphId.make(id)

export const empty = (id?: GraphId): Graph =>
  new Graph({
    id: id ?? generateGraphId(),
    nodes: HashMap.empty(),
    edges: Chunk.empty()
  })

export const fromNodes = (nodes: Iterable<AnyNode>, id?: GraphId): Graph =>
  new Graph({
    id: id ?? generateGraphId(),
    nodes: HashMap.fromIterable(Array.from(nodes).map((n) => [n.id, n])),
    edges: Chunk.empty()
  })

// --- Operations (Pipeable) ---

export const addNode: {
  (node: AnyNode): (self: Graph) => Graph
  (self: Graph, node: AnyNode): Graph
} = dual(2, (self: Graph, node: AnyNode): Graph =>
  new Graph({
    id: self.id,
    nodes: HashMap.set(self.nodes, node.id, node),
    edges: self.edges
  }))

export const addEdge: {
  (edge: Edge.Edge): (self: Graph) => Graph
  (self: Graph, edge: Edge.Edge): Graph
} = dual(2, (self: Graph, edge: Edge.Edge): Graph =>
  new Graph({
    id: self.id,
    nodes: self.nodes,
    edges: Chunk.append(self.edges, edge)
  }))

export const countNodes: {
  (): (self: Graph) => number
  <A extends AnyNode>(predicate: NodePredicate<A>): (self: Graph) => number
  (self: Graph): number
  <A extends AnyNode>(self: Graph, predicate: NodePredicate<A>): number
} = dual(
  (args) => args.length >= 1 && typeof args[0] === "object" && "nodes" in args[0],
  <A extends AnyNode>(self: Graph, predicate?: NodePredicate<A>): number => {
    if (!predicate) {
      return HashMap.size(self.nodes)
    }
    return HashMap.size(HashMap.filter(self.nodes, (node) => predicate.evaluate(node as A)))
  }
)

const getChildren = (self: Graph, parentId: NodeId): Chunk.Chunk<AnyNode> => {
  const childEdges = Chunk.filter(self.edges, (edge) =>
    Edge.Edge.$match(edge, {
      HAS_CHILD: ({ from }) => from === parentId,
      PRODUCES: ({ from }) => from === parentId, // Include PRODUCES edges
      CONFORMS_TO_SCHEMA: () => false,
      INPUT_TO: () => false
    }))

  return Chunk.compact(
    Chunk.map(childEdges, (edge) =>
      Edge.Edge.$match(edge, {
        HAS_CHILD: ({ to }) => HashMap.get(self.nodes, to),
        PRODUCES: ({ to }) => HashMap.get(self.nodes, to), // Get 'to' node for PRODUCES
        CONFORMS_TO_SCHEMA: () => Option.none<AnyNode>(),
        INPUT_TO: () => Option.none<AnyNode>()
      }))
  )
}

const cataRecursive = <A, E, R>(
  graph: Graph,
  algebra: Algebra.CataAlgebra<A, E, R>,
  memo: HashMap.HashMap<NodeId, A>,
  node: AnyNode
): Effect.Effect<[A, HashMap.HashMap<NodeId, A>], E | AdjointError.InternalError, R> => {
  return pipe(
    Effect.succeed(memo),
    Effect.flatMap((memo) => {
      if (HashMap.has(memo, node.id)) {
        return Effect.succeed(
          [HashMap.get(memo, node.id).pipe(Option.getOrThrow), memo] as [A, HashMap.HashMap<NodeId, A>]
        )
      }

      const children = getChildren(graph, node.id)

      return pipe(
        Effect.reduce(
          children,
          [Chunk.empty<A>(), memo] as [Chunk.Chunk<A>, HashMap.HashMap<NodeId, A>],
          ([childResults, currentMemo], childNode) =>
            pipe(
              cataRecursive(graph, algebra, currentMemo, childNode),
              Effect.map(([result, nextMemo]) => [
                Chunk.append(childResults, result),
                nextMemo
              ])
            )
        ),
        Effect.flatMap(([childrenResults, nextMemo]) =>
          pipe(
            algebra(node, childrenResults),
            Effect.map((result) => [result, HashMap.set(nextMemo, node.id, result)])
          )
        )
      )
    })
  )
}

export const cata: {
  <A, E, R>(
    algebra: Algebra.CataAlgebra<A, E, R>,
    root: NodeId
  ): (self: Graph) => Effect.Effect<A, E | AdjointError.InternalError, R>
  <A, E, R>(
    self: Graph,
    algebra: Algebra.CataAlgebra<A, E, R>,
    root: NodeId
  ): Effect.Effect<A, E | AdjointError.InternalError, R>
} = dual(3, <A, E, R>(
  self: Graph,
  algebra: Algebra.CataAlgebra<A, E, R>,
  root: NodeId
): Effect.Effect<A, E | AdjointError.InternalError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() =>
      new AdjointError.InternalError({ message: `Root node ${root} not found in graph`, defect: new Error() })
    )
  )

  return cataRecursive(self, algebra, HashMap.empty(), startNode).pipe(
    Effect.map(([result, _]) => result)
  )
})

// Paramorphism recursive helper
const paraRecursive = <A, E, R>(
  self: Graph,
  algebra: Algebra.ParaAlgebra<A, E, R>,
  visited: HashMap.HashMap<NodeId, [A, NodePredicate<AnyNode>]>,
  node: AnyNode
): Effect.Effect<
  [[A, NodePredicate<AnyNode>], HashMap.HashMap<NodeId, [A, NodePredicate<AnyNode>]>],
  E | AdjointError.InternalError,
  R
> => {
  return Effect.gen(function*() {
    const nodeId = node.id

    // Check if we've already computed this node
    const existing = HashMap.get(visited, nodeId)
    if (Option.isSome(existing)) {
      return [existing.value as [A, NodePredicate<AnyNode>], visited]
    }

    // Get children of current node
    const children = getChildren(self, nodeId)

    // Recursively compute children with paramorphism
    let currentVisited = visited
    const childResults: Array<[A, NodePredicate<AnyNode>]> = []

    for (const child of children) {
      const [[childResult, childNode], newVisited] = yield* paraRecursive(
        self,
        algebra,
        currentVisited,
        child
      )
      childResults.push([childResult, childNode])
      currentVisited = newVisited
    }

    // Apply algebra to current node with child results
    const result = yield* algebra(node, Chunk.fromIterable(childResults))
    const nodeResult: [A, NodePredicate<AnyNode>] = [result, node as unknown as NodePredicate<AnyNode>]
    const updatedVisited = HashMap.set(currentVisited, nodeId, nodeResult)

    return [nodeResult, updatedVisited]
  })
}

export const para: {
  <A, E, R>(
    algebra: Algebra.ParaAlgebra<A, E, R>,
    root: NodeId
  ): (self: Graph) => Effect.Effect<A, E | AdjointError.InternalError, R>
  <A, E, R>(
    self: Graph,
    algebra: Algebra.ParaAlgebra<A, E, R>,
    root: NodeId
  ): Effect.Effect<A, E | AdjointError.InternalError, R>
} = dual(3, <A, E, R>(
  self: Graph,
  algebra: Algebra.ParaAlgebra<A, E, R>,
  root: NodeId
): Effect.Effect<A, E | AdjointError.InternalError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() =>
      new AdjointError.InternalError({ message: `Root node ${root} not found in graph`, defect: new Error() })
    )
  )

  return paraRecursive(self, algebra, HashMap.empty(), startNode).pipe(
    Effect.map(([[result, _], _visited]) => result)
  )
})

export const filter: {
  <A extends AnyNode>(predicate: NodePredicate<A>): (self: Graph) => Graph
  <A extends AnyNode>(self: Graph, predicate: NodePredicate<A>): Graph
} = dual(2, <A extends AnyNode>(self: Graph, predicate: NodePredicate<A>): Graph => {
  const newNodes = HashMap.filter(self.nodes, (node) => predicate.evaluate(node as A))
  return new Graph({ id: self.id, nodes: newNodes, edges: self.edges })
})

export const find: {
  <A extends AnyNode>(
    predicate: NodePredicate<A>
  ): (self: Graph) => Effect.Effect<Option.Option<A>>
  <A extends AnyNode>(
    self: Graph,
    predicate: NodePredicate<A>
  ): Effect.Effect<Option.Option<A>>
} = dual(
  2,
  <A extends AnyNode>(
    self: Graph,
    predicate: NodePredicate<A>
  ): Effect.Effect<Option.Option<A>> => {
    return Effect.sync(() => {
      const nodes = Array.from(HashMap.values(self.nodes))
      const found = nodes.find((node) => predicate.evaluate(node as A))
      return found ? Option.some(found as A) : Option.none()
    })
  }
)

export const sort: {
  <A extends AnyNode>(
    ordering: NodeOrdering<A>
  ): (self: Graph) => Chunk.Chunk<AnyNode>
  <A extends AnyNode>(
    self: Graph,
    ordering: NodeOrdering<A>
  ): Chunk.Chunk<AnyNode>
} = dual(
  2,
  <A extends AnyNode>(
    self: Graph,
    ordering: NodeOrdering<A>
  ): Chunk.Chunk<AnyNode> => {
    const nodes = Array.from(HashMap.values(self.nodes))
    const effectOrder: Order.Order<AnyNode> = (self, that) => ordering.compare(self as A, that as A)
    return Chunk.fromIterable(nodes).pipe(Chunk.sort(effectOrder))
  }
)
