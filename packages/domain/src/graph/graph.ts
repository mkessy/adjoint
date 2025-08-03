import type { Brand } from "effect"
import { Chunk, Context, Data, Effect, HashMap, HashSet, Schema as S, Stream } from "effect"

// -----------------------------------------------------------------------------
// # 1. Core Types & Schemas
// -----------------------------------------------------------------------------



/**
 * The `Graph` is a recursive, tree-like data structure.
 * Each graph has a `root` node and an `OrderedHashSet` of `children` graphs.
 * This represents the nested, compositional nature of our computations.
 *
 * We use `S.suspend` because the `Graph` schema refers to itself recursively.
 * @since 1.0.0
 */
export class Graph extends S.Class<{
  root: AnyNode
}>("Graph")({
  root: AnyNode,
  children: S.Array(AnyNode)
}) {
  readonly _A!: {
    root: AnyNode
    children: ReadonlyArray<AnyNode>
  }
  readonly _I!: {
    root: AnyNode
    children: ReadonlyArray<AnyNode>
  }
  // ---------------------------------------------------------------------------
  // # 3. Core Graph Operations (Pipeable Methods)
  // ---------------------------------------------------------------------------

  constructor(props: { root: AnyNode; children: ReadonlyArray<AnyNode> }) {
    super({
      root: props.root,
      children: props.children
    })
  }

  /**
   * Materializes the graph into a stream of its nodes in post-order traversal
   * (children first, then the root). This is a specialized fold.
   * @since 1.0.0
   */
  streamNodes(): Stream.Stream<AnyNode> {
    // We use `Stream.unwrap` because the `fold` returns an `Effect` that
    // *contains* a `Stream`. `unwrap` flattens this structure.
    return Stream.unwrap(
      this.fold<Stream.Stream<AnyNode>, never, never>((node, children) =>
        Effect.succeed(
          // 1. Flatten the streams from all children into a single stream.
          // 2. Concatenate the current node to the end of the children stream.
          Stream.concat(
            Stream.flatten(Stream.fromChunk(children)),
            Stream.succeed(node)
          )
        )
      )
    )
  }
}

/**
 * Adds a child graph to the current graph, returning a new, immutable graph.
 * @since 1.0.0
 */
export const addChild = (graph: Graph, child: AnyNode): Graph => {
  return new Graph({
    root: graph.root,
    children: [...graph.children, child]
  })
}

/**
 * The fundamental recursive operation on a Graph. A catamorphism (fold) that
 * traverses the graph tree from the leaves up to the root.
 *
 * It applies an `algebra` at each step, which combines the result from the
 * current node with the accumulated results from its children.
 *
 * @param algebra A function `(node, children) => Effect<B>` that defines the logic for each step of the fold.
 * @since 1.0.0
 */
export const fold = <B, E, R>(
  algebra: (
    node: AnyNode,
    children: Chunk.Chunk<B>
  ) => Effect.Effect<B, E, R>
): Effect.Effect<B, E, R> =>
  Effect.gen(function*() {
    // 1. Recursively call `fold` on all children. We use `Effect.forEach`
    //    to process them concurrently, which is highly efficient.
    const foldedChildren = yield* Effect.forEach(
      children,
      (child) => fold(algebra, child),
      { concurrency: "unbounded" }
    )

    // 2. Once the children's results are computed, apply the algebra
    //    to the current graph's root node and the children's results.
    return yield* Effect.flatMap(foldedChildren, (processedChildren) => algebra(graph.root, processedChildren))
  })

// -----------------------------------------------------------------------------
// # 2. Fluent API Constructors
// -----------------------------------------------------------------------------

/**
 * Creates a leaf `Graph` from a single `CanonicalEntityNode`.
 * @param schema The Effect.Schema that the entity conforms to.
 * @param properties The properties of the entity.
 * @since 1.0.0
 */
export const fromCanonical = <A extends Record<string, any>, I extends Record<string, any>>(
  schema: S.Schema<A, I>,
  properties: A
): Graph => {
  const schemaId = S.isSchema(schema) ? schema.ast._tag : "unknown"
  const node = new CanonicalEntityNode({
    _tag: "CanonicalEntityNode",
    id: NodeId.make(`${schemaId}-${Data.hash(properties)}`),
    schemaId,
    properties: properties as Record<string, unknown>
  })
  return new Graph({ root: node, children: [] })
}

// -----------------------------------------------------------------------------
// # 4. Example Usage
// -----------------------------------------------------------------------------

/**
 * Let's model a simple data extraction task.
 */
const runExample = () => {
  // 1. Define our target schema using Effect.Schema
  const PersonSchema = S.Struct({
    name: S.String,
    age: S.Number
  })

  // 2. Create leaf nodes of our graph. These represent materialized entities.
  const person1Graph = fromCanonical(PersonSchema, { name: "Alice", age: 30 })
  const person2Graph = fromCanonical(PersonSchema, { name: "Bob", age: 45 })

  // 3. Compose them into a larger graph. This represents a collection or a more complex entity.
  const TeamSchema = S.Struct({ teamName: S.String })
  const teamGraph = fromCanonical(TeamSchema, { teamName: "Adjoint Team" })
    .addChild(person1Graph)
    .addChild(person2Graph)

  // 4. Use the `fold` method to query the graph.
  //    Let's create an algebra to count the number of nodes.
  const countAlgebra = (
    _node: AnyNode,
    children: Chunk.Chunk<number>
  ): Effect.Effect<number> => {
    return Effect.succeed(1 + Chunk.reduce(children, 0, (a, b) => a + b))
  }

  const countEffect = teamGraph.fold(countAlgebra)

  // 5. Materialize the graph into a stream of nodes.
  const nodeStream = teamGraph.streamNodes()

  return Effect.gen(function*($) {
    console.log("--- Graph Structure ---")
    console.log(JSON.stringify(teamGraph.toJSON(), null, 2))

    console.log("\n--- Folding to Count Nodes ---")
    const count = yield* $(countEffect)
    console.log(`Total nodes in graph: ${count}`)

    console.log("\n--- Streaming Nodes (Post-Order) ---")
    const collectedNodes = yield* $(Stream.runCollect(nodeStream))
    console.log(
      Chunk.map(
        collectedNodes,
        (node) => `${node._tag} (id: ${node.id})`
      ).toJSON()
    )
  })
}

// To run the example:
// Effect.runPromise(runExample());```
