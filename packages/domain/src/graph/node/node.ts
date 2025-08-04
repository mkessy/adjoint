import type { ParseResult } from "effect"
import {
  Arbitrary,
  Chunk,
  Context,
  Data,
  DateTime,
  Effect,
  Equal,
  FastCheck,
  JSONSchema,
  Layer,
  Match,
  Ref,
  Schema,
  Stream
} from "effect"

//
// Brands and Branded Types
//

export const NodeId = Schema.String.pipe(
  Schema.brand("NodeId"),
  Schema.annotations({
    description: "A unique identifier for a node in the graph.",
    title: "NodeId"
  })
)
export type NodeId = Schema.Schema.Type<typeof NodeId>

export const SchemaId = Schema.String.pipe(
  Schema.brand("SchemaId"),
  Schema.annotations({
    description: "A unique identifier for a schema.",
    title: "SchemaId"
  })
)
export type SchemaId = Schema.Schema.Type<typeof SchemaId>

//
// Errors

//

export class NodeValidationError extends Data.TaggedError("NodeValidationError")<{
  readonly error: ParseResult.ParseError
}> {}

export class NodeCreationError extends Data.TaggedError("NodeCreationError")<{
  readonly message: string
  readonly tag?: string
}> {}

export class NodeMatchError extends Data.TaggedError("NodeMatchError")<{
  readonly message: string
  readonly tag: string
}> {}

//
// Base Node Schema Fields
//

const BaseNodeFields = {
  id: NodeId,
  createdAt: Schema.DateTimeUtc.pipe(
    Schema.annotations({
      description: "The UTC timestamp when the node was created."
    })
  ),
  lastSeenBy: NodeId.pipe(
    Schema.annotations({
      description: "The ID of the node that last referenced this node."
    })
  )
}

//
// Concrete Node Implementations
//

export class CanonicalEntityNode extends Schema.TaggedClass<CanonicalEntityNode>()(
  "CanonicalEntityNode",
  {
    ...BaseNodeFields,
    schemaId: Schema.String.pipe(
      Schema.annotations({
        description: "The identifier for the schema this entity's properties conform to."
      })
    ),
    value: Schema.Unknown.pipe(
      Schema.annotations({
        description: "The entity data that conforms to the specified schema"
      })
    )
  }
) {}

export class IdentityNode extends Schema.TaggedClass<IdentityNode>()(
  "IdentityNode",
  BaseNodeFields
) {}

export class SourceDataNode extends Schema.TaggedClass<SourceDataNode>()(
  "SourceDataNode",
  {
    ...BaseNodeFields,
    sourceUri: Schema.String.pipe(
      Schema.annotations({
        description: "The URI of the source data."
      })
    )
  }
) {}

export class SchemaNode extends Schema.TaggedClass<SchemaNode>()(
  "SchemaNode",
  {
    ...BaseNodeFields,
    schemaId: SchemaId,
    definition: Schema.Any.pipe(
      Schema.annotations({
        description: "The effect schema definition."
      })
    )
  }
) {
}

export const RecursionScheme = Schema.Literal(
  "Catamorphism",
  "Zygomorphism",
  "Histomorphism",
  "Paramorphism",
  "Functor"
)
export type RecursionScheme = Schema.Schema.Type<typeof RecursionScheme>

export class StrategyNode extends Schema.TaggedClass<StrategyNode>()(
  "StrategyNode",
  {
    ...BaseNodeFields,
    name: Schema.String,
    recursionScheme: RecursionScheme,
    inputSchema: Schema.Any.pipe(
      Schema.annotations({
        description: "A schema that describes the shape of the data and context (L(in))"
      })
    ),
    outputSchema: Schema.Any.pipe(
      Schema.annotations({
        description: "A schema that describes the output shape"
      })
    ),
    logic: Schema.Any.pipe(
      Schema.annotations({
        description: "The algebra 'b' as a serializable transformation"
      })
    )
  }
) {}

//
// Graph Node Union and Schema
//

export const GraphNode = Schema.Union(
  CanonicalEntityNode,
  IdentityNode,
  SourceDataNode,
  SchemaNode,
  StrategyNode
).pipe(
  Schema.annotations({
    identifier: "GraphNode",
    title: "Graph Node",
    description: "A union of all possible node types in the graph"
  })
)

export type GraphNodeEncoded = Schema.Schema.Encoded<typeof GraphNode>

//
// Public API Types
//

export type AnyNode = Schema.Schema.Type<typeof GraphNode>
export type AnyTag = AnyNode["_tag"]
export type AnyEncoded = GraphNodeEncoded

//
// Schema Operations
//

const GraphNodeFromString = Schema.parseJson(GraphNode)

//
// Factory Functions using Effect Pattern
//

/**
 * Creates a CanonicalEntityNode with proper timestamp and error handling
 */
export const createCanonicalEntityNode = (props: {
  readonly id: NodeId
  readonly schemaId: string
  readonly value: unknown
  readonly lastSeenBy: NodeId
}): Effect.Effect<CanonicalEntityNode, NodeCreationError> =>
  Effect.gen(function*() {
    const createdAt = yield* DateTime.now
    try {
      return new CanonicalEntityNode({
        ...props,
        createdAt
      })
    } catch (error) {
      return yield* Effect.fail(
        new NodeCreationError({
          message: `Failed to create CanonicalEntityNode: ${error}`,
          tag: "CanonicalEntityNode"
        })
      )
    }
  }).pipe(
    Effect.tap((node) =>
      Effect.logInfo("CanonicalEntityNode created").pipe(
        Effect.annotateLogs({
          nodeId: node.id,
          nodeType: node._tag
        })
      )
    )
  )

/**
 * Creates an IdentityNode with proper timestamp and error handling
 */
export const createIdentityNode = (props: {
  readonly id: NodeId
  readonly lastSeenBy: NodeId
}): Effect.Effect<IdentityNode, NodeCreationError> =>
  Effect.gen(function*() {
    const createdAt = yield* DateTime.now
    try {
      return new IdentityNode({
        ...props,
        createdAt
      })
    } catch (error) {
      return yield* Effect.fail(
        new NodeCreationError({
          message: `Failed to create IdentityNode: ${error}`,
          tag: "IdentityNode"
        })
      )
    }
  }).pipe(
    Effect.tap((node) =>
      Effect.logInfo("IdentityNode created").pipe(
        Effect.annotateLogs({
          nodeId: node.id,
          nodeType: node._tag
        })
      )
    )
  )

/**
 * Creates a SourceDataNode with proper timestamp and error handling
 */
export const createSourceDataNode = (props: {
  readonly id: NodeId
  readonly sourceUri: string
  readonly lastSeenBy: NodeId
}): Effect.Effect<SourceDataNode, NodeCreationError> =>
  Effect.gen(function*() {
    const createdAt = yield* DateTime.now
    try {
      return new SourceDataNode({
        ...props,
        createdAt
      })
    } catch (error) {
      return yield* Effect.fail(
        new NodeCreationError({
          message: `Failed to create SourceDataNode: ${error}`,
          tag: "SourceDataNode"
        })
      )
    }
  }).pipe(
    Effect.tap((node) =>
      Effect.logInfo("SourceDataNode created").pipe(
        Effect.annotateLogs({
          nodeId: node.id,
          nodeType: node._tag
        })
      )
    )
  )

/**
 * Creates a SchemaNode with proper timestamp and error handling
 */
export const createSchemaNode = <A, I, R>(props: {
  readonly id: NodeId
  readonly schemaId: SchemaId
  readonly definition: Schema.Schema<A, I, R>
  readonly lastSeenBy: NodeId
}): Effect.Effect<SchemaNode, NodeCreationError> =>
  Effect.gen(function*() {
    const createdAt = yield* DateTime.now
    try {
      return new SchemaNode({
        ...props,
        createdAt
      })
    } catch (error) {
      return yield* Effect.fail(
        new NodeCreationError({
          message: `Failed to create SchemaNode: ${error}`,
          tag: "SchemaNode"
        })
      )
    }
  }).pipe(
    Effect.tap((node) =>
      Effect.logInfo("SchemaNode created").pipe(
        Effect.annotateLogs({
          nodeId: node.id,
          nodeType: node._tag
        })
      )
    )
  )

/**
 * Creates a StrategyNode with proper timestamp and error handling
 */
export const createStrategyNode = (props: {
  readonly id: NodeId
  readonly name: string
  readonly recursionScheme: RecursionScheme
  readonly inputSchema: Schema.Schema<any, any, any>
  readonly outputSchema: Schema.Schema<any, any, any>
  readonly logic: Schema.Schema<any, any, any>
  readonly lastSeenBy: NodeId
}): Effect.Effect<StrategyNode, NodeCreationError> =>
  Effect.gen(function*() {
    const createdAt = yield* DateTime.now
    try {
      return new StrategyNode({
        ...props,
        createdAt
      })
    } catch (error) {
      return yield* Effect.fail(
        new NodeCreationError({
          message: `Failed to create StrategyNode: ${error}`,
          tag: "StrategyNode"
        })
      )
    }
  }).pipe(
    Effect.tap((node) =>
      Effect.logInfo("StrategyNode created").pipe(
        Effect.annotateLogs({
          nodeId: node.id,
          nodeType: node._tag
        })
      )
    )
  )

/**
 * Pattern-matched factory for creating any GraphNode type
 */
export const createNode = (
  tag: AnyTag,
  props: any
): Effect.Effect<AnyNode, NodeCreationError> =>
  Match.value(tag).pipe(
    Match.when("CanonicalEntityNode", () => createCanonicalEntityNode(props)),
    Match.when("IdentityNode", () => createIdentityNode(props)),
    Match.when("SourceDataNode", () => createSourceDataNode(props)),
    Match.when("SchemaNode", () => createSchemaNode(props)),
    Match.when("StrategyNode", () => createStrategyNode(props)),
    Match.exhaustive
  )

//
// Pattern Matching Utilities
//

/**
 * Pattern match on a GraphNode value
 */
export const matchNode = <R>(node: AnyNode) =>
  Match.value(node).pipe(
    Match.tag("CanonicalEntityNode", (entity): R => entity as R),
    Match.tag("IdentityNode", (identity): R => identity as R),
    Match.tag("SourceDataNode", (source): R => source as R),
    Match.tag("SchemaNode", (schema): R => schema as R),
    Match.tag("StrategyNode", (strategy): R => strategy as R),
    Match.exhaustive
  )

/**
 * Create a pattern matcher for GraphNode types
 */
export const createNodeMatcher = <R>() =>
  Match.type<AnyNode>().pipe(
    Match.tag("CanonicalEntityNode", (entity): R => entity as R),
    Match.tag("IdentityNode", (identity): R => identity as R),
    Match.tag("SourceDataNode", (source): R => source as R),
    Match.tag("SchemaNode", (schema): R => schema as R),
    Match.tag("StrategyNode", (strategy): R => strategy as R)
  )

//
// Schema-based Operations
//

/**
 * Decodes an unknown value into a GraphNode
 */
export const fromUnknown = (value: unknown): Effect.Effect<AnyNode, NodeValidationError> =>
  Schema.decodeUnknown(GraphNode)(value).pipe(
    Effect.mapError((error) => new NodeValidationError({ error }))
  )

/**
 * Decodes an unknown value into a GraphNode using Either
 */
export const fromUnknownEither = Schema.decodeUnknownEither(GraphNode)

/**
 * Decodes an unknown value into a GraphNode synchronously
 */
export const fromUnknownSync = Schema.decodeUnknownSync(GraphNode)

/**
 * Encodes a GraphNode into its plain object representation
 */
export const encode = (node: AnyNode): Effect.Effect<GraphNodeEncoded, NodeValidationError> =>
  Schema.encode(GraphNode)(node).pipe(
    Effect.mapError((error) => new NodeValidationError({ error }))
  )

/**
 * Encodes a GraphNode using Either
 */
export const encodeEither = Schema.encodeEither(GraphNode)

/**
 * Encodes a GraphNode synchronously
 */
export const encodeSync = Schema.encodeSync(GraphNode)

//
// JSON Operations
//

/**
 * Serializes a GraphNode to a JSON string
 */
export const toJsonString = (node: AnyNode): Effect.Effect<string, NodeValidationError> =>
  Schema.encode(GraphNodeFromString)(node).pipe(
    Effect.mapError((error) => new NodeValidationError({ error }))
  )

/**
 * Serializes a GraphNode to JSON string using Either
 */
export const toJsonStringEither = Schema.encodeEither(GraphNodeFromString)

/**
 * Serializes a GraphNode to JSON string synchronously
 */
export const toJsonStringSync = Schema.encodeSync(GraphNodeFromString)

/**
 * Parses a GraphNode from a JSON string
 */
export const fromJsonString = (json: string): Effect.Effect<AnyNode, NodeValidationError> =>
  Schema.decodeUnknown(GraphNodeFromString)(json).pipe(
    Effect.mapError((error) => new NodeValidationError({ error }))
  )

/**
 * Parses a GraphNode from JSON string using Either
 */
export const fromJsonStringEither = Schema.decodeUnknownEither(GraphNodeFromString)

/**
 * Parses a GraphNode from JSON string synchronously
 */
export const fromJsonStringSync = Schema.decodeUnknownSync(GraphNodeFromString)

//
// Schema Generation
//

/**
 * Generates a JSON Schema document for the GraphNode union type
 */
export const toJsonSchema = (): JSONSchema.JsonSchema7Root => JSONSchema.make(GraphNode)

//
// Type Guards
//

/**
 * Type guard to check if a value is a CanonicalEntityNode
 */
export const isCanonicalEntityNode = Schema.is(CanonicalEntityNode)

/**
 * Type guard to check if a value is an IdentityNode
 */
export const isIdentityNode = Schema.is(IdentityNode)

/**
 * Type guard to check if a value is a SourceDataNode
 */
export const isSourceDataNode = Schema.is(SourceDataNode)

/**
 * Type guard to check if a value is a SchemaNode
 */
export const isSchemaNode = Schema.is(SchemaNode)

/**
 * Type guard to check if a value is a StrategyNode
 */
export const isStrategyNode = Schema.is(StrategyNode)

/**
 * Type guard to check if an unknown value is any valid GraphNode
 */
export const isGraphNode = Schema.is(GraphNode)

//
// Utility Functions
//

/**
 * Performs a deep, structural equality check between two nodes
 */
export const equals = (a: AnyNode, b: AnyNode): boolean => Equal.equals(a, b)

//
// Arbitrary Generation for Testing
//

/**
 * Returns an Arbitrary instance for generating GraphNode values
 */
export const arbitrary = Arbitrary.make(GraphNode)

/**
 * Returns an Effect that generates a single random GraphNode
 */
export const generate = (options?: { seed?: number }): Effect.Effect<AnyNode> =>
  Effect.sync(() => {
    const arb = arbitrary
    return options?.seed
      ? FastCheck.sample(arb, { numRuns: 1, seed: options.seed })[0]
      : FastCheck.sample(arb, { numRuns: 1 })[0]
  })

/**
 * Returns a Stream that emits chunks of random GraphNode values
 */
export const generateStream = (options: {
  count: number
  chunkSize: number
  seed?: number
}): Stream.Stream<Chunk.Chunk<AnyNode>> =>
  Stream.repeatEffect(generate(options)).pipe(
    Stream.take(options.count),
    Stream.grouped(options.chunkSize)
  )

/**
 * Generates a batch of nodes with specific distribution
 */
export const generateBatch = (options: {
  canonicalEntityCount: number
  identityCount: number
  seed?: number
}): Effect.Effect<Chunk.Chunk<AnyNode>> =>
  Effect.gen(function*() {
    const canonicalNodes = yield* Effect.all(
      Array.from({ length: options.canonicalEntityCount }, () =>
        generate(options.seed ? { seed: options.seed } : undefined))
    )

    const identityNodes = yield* Effect.all(
      Array.from({ length: options.identityCount }, () =>
        generate(options.seed ? { seed: options.seed } : undefined))
    )

    return Chunk.fromIterable([...canonicalNodes, ...identityNodes])
  })

// --- Capability Interfaces ---

export interface NodePredicate<A extends AnyNode> {
  readonly _id: symbol
  readonly evaluate: (node: A) => boolean
}

export interface NodeEquivalence<A extends AnyNode> {
  readonly _id: symbol
  readonly equals: (self: A, that: A) => boolean
}

export interface NodeOrdering<A extends AnyNode> {
  readonly _id: symbol
  readonly compare: (self: A, that: A) => -1 | 0 | 1
}

// --- Capability Registry Service ---

export class CapabilityRegistry extends Context.Tag("CapabilityRegistry")<
  CapabilityRegistry,
  {
    readonly registerPredicate: <A extends AnyNode>(
      predicate: NodePredicate<A>
    ) => Effect.Effect<void>
    readonly getPredicate: <A extends AnyNode>(
      id: symbol
    ) => Effect.Effect<NodePredicate<A>>
  }
>() {}

// --- Live Implementation ---

export const CapabilityRegistryLive = Layer.effect(
  CapabilityRegistry,
  Effect.gen(function*() {
    const registry = yield* Ref.make(new Map<symbol, unknown>())
    return CapabilityRegistry.of({
      registerPredicate: (p) => Ref.update(registry, (m) => m.set(p._id, p)),
      getPredicate: (id) => Ref.get(registry).pipe(Effect.map((m) => m.get(id) as any))
    })
  })
)

// --- Capability Interfaces ---

export interface NodePredicate<A extends AnyNode> {
  readonly _id: symbol
  readonly evaluate: (node: A) => boolean
}

export interface NodeEquivalence<A extends AnyNode> {
  readonly _id: symbol
  readonly equals: (self: A, that: A) => boolean
}

export interface NodeOrdering<A extends AnyNode> {
  readonly _id: symbol
  readonly compare: (self: A, that: A) => -1 | 0 | 1
}

export const and = <A extends AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`and(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) && right.evaluate(node as A)
})

export const or = <A extends AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`or(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) || right.evaluate(node as A)
})

export const not = <A extends AnyNode>(
  self: NodePredicate<A>
): NodePredicate<A> => ({
  _id: Symbol.for(`not(${String(self._id)})`),
  evaluate: (node) => !self.evaluate(node as A)
})
