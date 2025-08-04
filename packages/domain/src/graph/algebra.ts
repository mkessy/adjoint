import { Chunk, Effect } from "effect"
import type * as Node from "./node/index.js"

/**
 * An Algebra is a function that defines one step of a recursive computation.
 * It takes a node and the results already computed for its children (`F<A>`)
 * and produces a new result (`A`).
 *
 * This file defines the interfaces for different kinds of algebras, corresponding
 * to different structural recursion schemes.
 */

/**
 * A Catamorphism is a standard fold. The algebra for a catamorphism
 * only has access to the results of its children.
 *
 * @param A The carrier type for the result of the fold.
 * @param E The error type of the algebra.
 * @param R The context required by the algebra.
 */
export interface CataAlgebra<A, E, R> {
  (node: Node.AnyNode, children: Chunk.Chunk<A>): Effect.Effect<A, E, R>
}

/**
 * A Paramorphism is a fold that has access to both the original child nodes
 * and the results of folding over them.g
 *
 * @param A The carrier type for the result of the fold.
 * @param E The error type of the algebra.
 * @param R The context required by the algebra.
 */
export interface ParaAlgebra<A, E, R> {
  (
    node: Node.AnyNode,
    children: Chunk.Chunk<[A, Node.NodePredicate<Node.AnyNode>]>
  ): Effect.Effect<A, E, R>
}

//
// MARK: Concrete Algebra Implementations
//

/**
 * A catamorphism algebra to count all nodes in a graph structure.
 */
export const count = (
  predicate?: Node.NodePredicate<Node.AnyNode>
): CataAlgebra<number, never, never> =>
(node, children) => {
  const childrenCount = Chunk.reduce(children, 0, (sum, count) => sum + count)
  const selfCount = predicate ? (predicate.evaluate(node) ? 1 : 0) : 1
  return Effect.succeed(selfCount + childrenCount)
}

/**
 * A catamorphism algebra to collect all node IDs into a Chunk.
 */
export const collectIds: CataAlgebra<Chunk.Chunk<Node.NodeId>, never, never> = (
  node,
  children
) => {
  const childIds = Chunk.flatten(children)
  return Effect.succeed(Chunk.append(childIds, node.id))
}

/**
 * A paramorphism algebra that builds a string representation of the graph tree.
 */
export const drawTree: ParaAlgebra<string, never, never> = (
  node,
  children
) => {
  if (Chunk.isEmpty(children)) {
    return Effect.succeed(node.id)
  }
  const childrenStrings = Chunk.map(children, ([childString, _]) => childString)
  const indented = Chunk.map(childrenStrings, (s) => s.split("\n").map((l) => `  ${l}`).join("\n")).pipe(
    Chunk.join("\n")
  )

  return Effect.succeed(`${node.id}\n${indented}`)
}
