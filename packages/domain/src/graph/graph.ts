import { Chunk, Data, Effect, HashMap, Option, pipe } from "effect"
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
}> {}

// --- Constructors ---
export const empty = (): Graph => new Graph({ nodes: HashMap.empty(), edges: Chunk.empty() })

export const fromNodes = (nodes: Iterable<Node.AnyNode>): Graph =>
  new Graph({
    nodes: HashMap.fromIterable(Array.from(nodes).map((n) => [n.id, n])),
    edges: Chunk.empty()
  })

// --- Operations (Pipeable) ---

export const addNode = (node: Node.AnyNode) => (self: Graph): Graph =>
  new Graph({
    ...self,
    nodes: HashMap.set(self.nodes, node.id, node)
  })

export const addEdge = (edge: Edge.Edge) => (self: Graph): Graph =>
  new Graph({
    ...self,
    edges: Chunk.append(self.edges, edge)
  })

export const countNodes = (predicate?: (node: Node.AnyNode) => boolean) => (self: Graph): number => {
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

export const cata = <A, E, R>(
  algebra: Algebra.CataAlgebra<A, E, R>,
  root: Node.NodeId
) =>
(self: Graph): Effect.Effect<A, E | GraphOperationError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() => new GraphOperationError({ message: `Root node ${root} not found in graph` }))
  )

  return cataRecursive(self, algebra, HashMap.empty(), startNode).pipe(
    Effect.map(([result, _]) => result)
  )
}
