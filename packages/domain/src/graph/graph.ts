import type { Order } from "effect"
import { Chunk, Data, Effect, HashMap, Option, pipe } from "effect"
import { dual } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import type { NodeOrdering, NodePredicate } from "../node/capabilities.js"
import type * as Algebra from "./algebra.js"
import * as Edge from "./edge.js"
import type * as Node from "./node.js"

export class GraphOperationError extends Data.TaggedError("GraphOperationError")<{
  readonly message: string
}> {}

export class FoldResult extends Data.Class<{
  readonly result: Node.AnyNode
  readonly statistics: HashMap.HashMap<string, number>
}> {}

export class Graph extends Data.Class<{
  readonly nodes: HashMap.HashMap<Node.NodeId, Node.AnyNode>
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
    return pipe(this, ...args)
  }
}

// --- Constructors ---
export const empty = (): Graph => new Graph({ nodes: HashMap.empty(), edges: Chunk.empty() })

export const fromNodes = (nodes: Iterable<Node.AnyNode>): Graph =>
  new Graph({
    nodes: HashMap.fromIterable(Array.from(nodes).map((n) => [n.id, n])),
    edges: Chunk.empty()
  })

// --- Operations (Pipeable) ---

/**
 * Adds a node to the graph.
 *
 * @example
 * ```ts
 * // Data-first
 * const newGraph = addNode(graph, node)
 *
 * // Data-last (pipeable)
 * const newGraph = graph.pipe(addNode(node))
 * ```
 */
export const addNode: {
  (node: Node.AnyNode): (self: Graph) => Graph
  (self: Graph, node: Node.AnyNode): Graph
} = dual(2, (self: Graph, node: Node.AnyNode): Graph =>
  new Graph({
    ...self,
    nodes: HashMap.set(self.nodes, node.id, node)
  }))

/**
 * Adds an edge to the graph.
 *
 * @example
 * ```ts
 * // Data-first
 * const newGraph = addEdge(graph, edge)
 *
 * // Data-last (pipeable)
 * const newGraph = graph.pipe(addEdge(edge))
 * ```
 */
export const addEdge: {
  (edge: Edge.Edge): (self: Graph) => Graph
  (self: Graph, edge: Edge.Edge): Graph
} = dual(2, (self: Graph, edge: Edge.Edge): Graph =>
  new Graph({
    ...self,
    edges: Chunk.append(self.edges, edge)
  }))

/**
 * Counts nodes in the graph, optionally filtered by a predicate.
 *
 * @example
 * ```ts
 * // Data-first
 * const count = countNodes(graph)
 * const filteredCount = countNodes(graph, node => Node.isIdentityNode(node))
 *
 * // Data-last (pipeable)
 * const count = graph.pipe(countNodes())
 * const filteredCount = graph.pipe(countNodes(node => Node.isIdentityNode(node)))
 * ```
 */
export const countNodes: {
  (): (self: Graph) => number
  (predicate: (node: Node.AnyNode) => boolean): (self: Graph) => number
  (self: Graph): number
  (self: Graph, predicate: (node: Node.AnyNode) => boolean): number
} = dual(
  (args) => args.length >= 1 && typeof args[0] === "object" && "nodes" in args[0],
  (self: Graph, predicate?: (node: Node.AnyNode) => boolean): number => {
    if (!predicate) {
      return HashMap.size(self.nodes)
    }
    let count = 0
    HashMap.forEach(self.nodes, (node) => {
      if (predicate(node)) {
        count++
      }
    })
    return count
  }
)

const getChildren = (self: Graph, parentId: Node.NodeId): Chunk.Chunk<Node.AnyNode> => {
  const childEdges = Chunk.filter(self.edges, (edge) =>
    Edge.Edge.$match(edge, {
      HAS_CHILD: ({ from }) => from === parentId,
      CONFORMS_TO_SCHEMA: () => false,
      INPUT_TO: () => false,
      PRODUCES: () => false
    }))

  return Chunk.compact(
    Chunk.map(childEdges, (edge) =>
      Edge.Edge.$match(edge, {
        HAS_CHILD: ({ to }) => HashMap.get(self.nodes, to),
        CONFORMS_TO_SCHEMA: () => Option.none<Node.AnyNode>(),
        INPUT_TO: () => Option.none<Node.AnyNode>(),
        PRODUCES: () => Option.none<Node.AnyNode>()
      }))
  )
}

const cataRecursive = <A, E, R>(
  graph: Graph,
  algebra: Algebra.CataAlgebra<A, E, R>,
  memo: HashMap.HashMap<Node.NodeId, A>,
  node: Node.AnyNode
): Effect.Effect<[A, HashMap.HashMap<Node.NodeId, A>], E | GraphOperationError, R> => {
  return pipe(
    Effect.succeed(memo),
    Effect.flatMap((memo) => {
      if (HashMap.has(memo, node.id)) {
        return Effect.succeed(
          [HashMap.get(memo, node.id).pipe(Option.getOrThrow), memo] as [A, HashMap.HashMap<Node.NodeId, A>]
        )
      }

      const children = getChildren(graph, node.id)

      return pipe(
        Effect.reduce(
          children,
          [Chunk.empty<A>(), memo] as [Chunk.Chunk<A>, HashMap.HashMap<Node.NodeId, A>],
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

/**
 * Performs a catamorphism (fold) over the graph starting from a root node.
 *
 * @example
 * ```ts
 * // Data-first
 * const result = await Effect.runPromise(cata(graph, algebra, rootId))
 *
 * // Data-last (pipeable)
 * const result = await Effect.runPromise(graph.pipe(cata(algebra, rootId)))
 * ```
 */
export const cata: {
  <A, E, R>(
    algebra: Algebra.CataAlgebra<A, E, R>,
    root: Node.NodeId
  ): (self: Graph) => Effect.Effect<A, E | GraphOperationError, R>
  <A, E, R>(
    self: Graph,
    algebra: Algebra.CataAlgebra<A, E, R>,
    root: Node.NodeId
  ): Effect.Effect<A, E | GraphOperationError, R>
} = dual(3, <A, E, R>(
  self: Graph,
  algebra: Algebra.CataAlgebra<A, E, R>,
  root: Node.NodeId
): Effect.Effect<A, E | GraphOperationError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() => new GraphOperationError({ message: `Root node ${root} not found in graph` }))
  )

  return cataRecursive(self, algebra, HashMap.empty(), startNode).pipe(
    Effect.map(([result, _]) => result)
  )
})

/**
 * Filters the graph, returning a new graph containing only the nodes
 * that satisfy the given predicate.
 *
 * @example
 * ```ts
 * // Data-first
 * const filtered = filter(graph, predicate)
 *
 * // Data-last (pipeable)
 * const filtered = graph.pipe(filter(predicate))
 * ```
 */
export const filter: {
  <A extends Node.AnyNode>(predicate: NodePredicate<A>): (self: Graph) => Graph
  <A extends Node.AnyNode>(self: Graph, predicate: NodePredicate<A>): Graph
} = dual(2, <A extends Node.AnyNode>(self: Graph, predicate: NodePredicate<A>): Graph => {
  const newNodes = HashMap.filter(self.nodes, (node) => predicate.evaluate(node as A))
  // A more robust implementation would also filter edges that no longer connect to any nodes.
  return new Graph({ nodes: newNodes, edges: self.edges })
})

/**
 * Finds the first node in the graph that satisfies the predicate.
 *
 * @example
 * ```ts
 * // Data-first
 * const found = await Effect.runPromise(find(graph, predicate))
 *
 * // Data-last (pipeable)
 * const found = await Effect.runPromise(graph.pipe(find(predicate)))
 * ```
 */
export const find: {
  <A extends Node.AnyNode>(predicate: NodePredicate<A>): (self: Graph) => Effect.Effect<Option.Option<A>>
  <A extends Node.AnyNode>(self: Graph, predicate: NodePredicate<A>): Effect.Effect<Option.Option<A>>
} = dual(2, <A extends Node.AnyNode>(self: Graph, predicate: NodePredicate<A>): Effect.Effect<Option.Option<A>> => {
  return Effect.sync(() => {
    const nodes = Array.from(HashMap.values(self.nodes))
    const found = nodes.find((node) => predicate.evaluate(node as A))
    return found ? Option.some(found as A) : Option.none()
  })
})

/**
 * Sorts the nodes in the graph according to the given ordering.
 *
 * @example
 * ```ts
 * // Data-first
 * const sorted = sort(graph, ordering)
 *
 * // Data-last (pipeable)
 * const sorted = graph.pipe(sort(ordering))
 * ```
 */
export const sort: {
  <A extends Node.AnyNode>(ordering: NodeOrdering<A>): (self: Graph) => Chunk.Chunk<Node.AnyNode>
  <A extends Node.AnyNode>(self: Graph, ordering: NodeOrdering<A>): Chunk.Chunk<Node.AnyNode>
} = dual(2, <A extends Node.AnyNode>(self: Graph, ordering: NodeOrdering<A>): Chunk.Chunk<Node.AnyNode> => {
  const nodes = Array.from(HashMap.values(self.nodes))
  const effectOrder: Order.Order<Node.AnyNode> = (self, that) => ordering.compare(self as A, that as A)
  return Chunk.fromIterable(nodes).pipe(Chunk.sort(effectOrder))
})
