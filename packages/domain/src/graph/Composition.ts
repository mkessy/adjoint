import type { Brand } from "effect"
import { Chunk, DateTime, HashMap, Option, pipe } from "effect"
import { dual } from "effect/Function"
import type { Pipeable } from "effect/Pipeable"
import * as Edge from "./edge.js"
import * as Graph from "./graph.js"
import * as Node from "./node.js"

// A branded type for a declarative computation graph
// It represents a morphism from a Source type to a Target type
export type Composition<Source, Target> = Graph.Graph & Brand.Brand<"Composition"> & Pipeable & {
  _Source: Source
  _Target: Target
}

/**
 * Creates a new computational graph starting from a source schema.
 * This represents the identity morphism on the source object.
 */
export const from = <A>(source: Node.SchemaNode): Composition<A, A> => {
  const g = Graph.fromNodes([source])
  return g as Composition<A, A>
}

/**
 * Applies a transformation strategy to the graph. This is function composition.
 * Given a graph representing a function `f: A -> B`, and a strategy for `g: B -> C`,
 * this returns a new graph representing `g . f: A -> C`.
 *
 * This function PURELY manipulates the graph blueprint. No computation is run.
 *
 * @example
 * ```ts
 * // Data-first
 * const newComposition = transform(composition, strategy)
 *
 * // Data-last (pipeable)
 * const newComposition = composition.pipe(transform(strategy))
 * ```
 */
export const transform: {
  <A, B, C>(strategy: Node.StrategyNode): (self: Composition<A, B>) => Composition<A, C>
  <A, B, C>(self: Composition<A, B>, strategy: Node.StrategyNode): Composition<A, C>
} = dual(2, <A, B, C>(self: Composition<A, B>, strategy: Node.StrategyNode): Composition<A, C> => {
  // 1. Find the current target SchemaNode in the graph (the schema for B).
  // We do this by finding the SchemaNode that is not providing input to any strategy.
  const inputToEdges = Chunk.filter(self.edges, (e) => e._tag === "INPUT_TO")
  const sourceNodeIds = new Set(Chunk.map(inputToEdges, (e) => e.from))

  const targetSchemaNode = pipe(
    HashMap.values(self.nodes),
    Chunk.fromIterable,
    Chunk.findFirst(
      (node) => Node.isSchemaNode(node) && !sourceNodeIds.has(node.id)
    )
  )

  if (Option.isNone(targetSchemaNode)) {
    // This case should ideally be a compilation error.
    // For now, we return the graph unmodified.
    return self as unknown as Composition<A, C>
  }

  // 2. The strategy's output schema becomes the new target.
  // We must create a new SchemaNode for it.
  const createdAt = DateTime.unsafeNow()
  const newTargetSchemaNode = new Node.SchemaNode({
    id: strategy.outputSchema.ast.annotations._tag as unknown as Node.NodeId, // Generate proper ID
    schemaId: strategy.outputSchema.ast.annotations._tag as unknown as Node.SchemaId,
    definition: strategy.outputSchema,
    createdAt,
    lastSeenBy: strategy.id
  })

  // 3. Add the new nodes and edges to form the new composition
  const newGraph = pipe(
    self,
    Graph.addNode(strategy),
    Graph.addNode(newTargetSchemaNode),
    Graph.addEdge(Edge.create(targetSchemaNode.value, strategy)),
    Graph.addEdge(Edge.create(strategy, newTargetSchemaNode))
  )

  return newGraph as unknown as Composition<A, C>
})
