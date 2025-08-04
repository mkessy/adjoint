# Graph API Implementation Plan (v0)

## 1. Introduction & Goals

This document outlines a detailed plan to refactor and implement the core Graph API located in `@packages/domain/src/graph/graph.ts`. The primary goal is to establish a clean, robust, and idiomatic foundation for all graph-based operations, adhering strictly to the principles of the Effect ecosystem.

The new API will be:
- **Data-First & Pipeable**: All operations will be designed for composition using `flow` and `pipe`, following Effect best practices.
- **Immutable**: The core `Graph` structure will be immutable. All operations will return a new, modified instance of the graph.
- **Recursion-Scheme Ready**: The design will be centered around a powerful `fold` operation, which will serve as the fundamental mechanism for all graph queries and "algebras".
- **Type-Safe**: Leveraging `Schema` for contracts and `Data.TaggedEnum` for variants to ensure maximum type safety.

This plan is based on a thorough review of the project's documentation, including `data.md`, `schema.md`, and the general `effect_rules.md`.

## 2. Core Data Structures

We will define three primary data structures: `Edge`, `Graph`, and `FoldResult`.

### 2.1. Edge Type

As per the guidance in `data.md` on modeling variants, we will define `Edge` as a `Data.TaggedEnum`. This provides ergonomic constructors and matchers.

```typescript
// In packages/domain/src/graph/edge.ts
import { Data, Schema } from "effect";
import * as Node from "./node";

export type Edge = Data.TaggedEnum<{
  CONFORMS_TO_SCHEMA: { from: Node.NodeId, to: Node.SchemaId };
  INPUT_TO: { from: Node.NodeId, to: Node.NodeId };
  PRODUCES: { from: Node.NodeId, to: Node.NodeId };
  HAS_CHILD: { from: Node.NodeId, to: Node.NodeId };
}>;

export const Edge = Data.taggedEnum<Edge>();

// Corresponding Schema for validation and serialization
export const EdgeSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("CONFORMS_TO_SCHEMA"), from: Node.NodeId, to: Node.SchemaId }),
  Schema.Struct({ _tag: Schema.Literal("INPUT_TO"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("PRODUCES"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("HAS_CHILD"), from: Node.NodeId, to: Node.NodeId })
);
```

### 2.2. Graph Type

The `Graph` will be an immutable `Data.Class`, containing `HashMap` for nodes (for efficient lookups) and `Chunk` for edges (for efficient appends). This aligns with the "Immutability is Law" heuristic.

```typescript
// In packages/domain/src/graph/graph.ts
import { Data, HashMap, Chunk, Effect } from "effect";
import * as Node from "./node";
import * as Edge from "./edge";

export class Graph extends Data.Class<{
  readonly nodes: HashMap.HashMap<Node.NodeId, Node.AnyNode>;
  readonly edges: Chunk.Chunk<Edge.Edge>;
}> {
  // Methods for the pipeable API will be added here
}
```

### 2.3. FoldResult Interface

The result of a `fold` operation will be a structured data object containing the primary result and operational statistics.

```typescript
// In packages/domain/src/graph/graph.ts
import { Data, HashMap } from "effect";
import * as Node from "./node";

export class FoldResult extends Data.Class<{
  readonly result: Node.AnyNode;
  readonly statistics: HashMap.HashMap<string, number>;
}> {}
```

## 3. Pipeable API Design

The API will consist of data-first, pipeable functions. The core `Graph` class will be the data, and the functions will be the operations.

### 3.1. Core Functions

```typescript
// In packages/domain/src/graph/graph.ts

// --- Constructors ---
export const empty: () => Graph;
export const fromNodes: (nodes: Iterable<Node.AnyNode>) => Graph;

// --- Operations (Pipeable) ---

/**
 * Adds a node to the graph.
 */
export const addNode: (
  node: Node.AnyNode
) => (self: Graph) => Graph;

/**
 * Adds an edge to the graph.
 */
export const addEdge: (
  edge: Edge.Edge
) => (self: Graph) => Graph;

/**
 * A simple algebra to count nodes, optionally matching a predicate.
 */
export const countNodes: (
  predicate?: (node: Node.AnyNode) => boolean
) => (self: Graph) => number;
```

### 3.2. The `fold` Operation

The `fold` operation is the cornerstone of this design. It will be a powerful tool for running arbitrary computations over the graph.

```typescript
// In packages/domain/src/graph/graph.ts

export class GraphOperationError extends Data.TaggedError("GraphOperationError")<{ 
  readonly message: string;
}> {}

/**
 * Performs a recursive fold over the graph's nodes.
 * For the initial implementation, this will be a simple iteration over the nodes map.
 * A true edge-based traversal will be implemented in a future version.
 */
export const fold: <A>(
  // The "algebra" to apply at each step
  algebra: (state: A, node: Node.AnyNode) => A,
  // The initial state
  initialState: A
) => (self: Graph) => Effect.Effect<A, GraphOperationError>;
```

## 4. Initial `fold` Implementation Plan

The first implementation of `fold` will be used to satisfy the user request of "counting nodes and returning the result as a `CanonicalEntityNode`".

1.  **Define the Algebra**: The algebra will simply increment a counter.
2.  **Define the Initial State**: The initial state will be `0`.
3.  **Execute the Fold**: The `fold` function will be called with the counting algebra.
4.  **Construct the `FoldResult`**:
    *   The final count from the fold will be used to create a new `CanonicalEntityNode`. The schema for this node will be a simple `Schema.Number`.
    *   Statistics will be gathered during the fold (e.g., `nodesVisited`).
    *   A `FoldResult` object will be constructed with the new node and the statistics.

### Example Usage (Illustrative)

```typescript
import { pipe } from "effect";
import * as Graph from "./graph";
import * as Node from "./node";

const myGraph = Graph.empty(); // Assume graph is populated

const countAlgebra = (count: number, _: Node.AnyNode) => count + 1;

const program = pipe(
  myGraph,
  Graph.fold(countAlgebra, 0),
  Effect.flatMap((nodeCount) => {
    // Create a result node
    const resultNode = Node.createCanonicalEntityNode({
      id: Node.NodeId("fold-result-1"),
      schemaId: "NodeCount",
      value: nodeCount,
      lastSeenBy: Node.NodeId("system")
    });

    // Create the FoldResult
    const foldResult = new Graph.FoldResult({
      result: resultNode,
      statistics: HashMap.make([["nodesVisited", nodeCount]])
    });

    return Effect.succeed(foldResult);
  })
);
```

## 5. Summary

This plan establishes a solid, idiomatic, and extensible foundation for the Graph API. It prioritizes a clean, pipeable interface and correctly uses Effect's core data structures (`Data.Class`, `HashMap`, `Chunk`, `Data.TaggedEnum`). The `fold` operation is designed to be the central point for future, more complex graph algorithms ("algebras"), including those that will return a `Stream` as per the original request.

---

## 6. Implementation Progress & Learnings (v0.1)

This section details the progress made during the initial implementation phase and key learnings about the Effect ecosystem.

### 6.1. Progress Notes

- **Module Creation**: Successfully created the initial versions of `graph.ts`, `edge.ts`, and `algebra.ts`.
- **Node Extensions**: The core `node.ts` file was extended to include `SchemaNode`, `SourceDataNode`, and `StrategyNode`, aligning the codebase with the white paper's specifications.
- **Core API Implemented**: The `Graph` data structure and its basic pipeable API (`empty`, `addNode`, `addEdge`) have been implemented.
- **Algebraic Foundation**: The `algebra.ts` module was created to define the core `CataAlgebra` and `ParaAlgebra` interfaces. Concrete algebras like `count` and `drawTree` were implemented as examples.
- **Catamorphism Operator**: A `cata` (catamorphism) operator was added to `graph.ts`. This is the first recursive graph operator and serves as the foundation for executing algebras.
- **Testing**: Initial tests for the `Graph` and `Algebra` modules have been created and are now passing after several corrections.

### 6.2. Learned Effect APIs & Patterns

- **`Schema.TaggedClass` Constructors**: A critical learning was that the default constructor for a `Schema.TaggedClass` (e.g., `new IdentityNode(...)`) performs validation against the *encoded* type. If a schema field expects a complex type like `Schema.DateTimeUtc`, passing a raw `Date` object will fail parsing. The schema expects a serialized representation.

- **Effect-based Factories**: The correct and idiomatic pattern for creating instances of complex `Schema.TaggedClass` objects is to use an Effect-based factory function. The `createIdentityNode` function in `node.ts` is a perfect example. It uses `Effect.gen` and `DateTime.now` to correctly construct the object within an `Effect`, ensuring all fields are properly initialized before validation. This pattern was applied to fix all test failures.

- **Branded Type Instantiation**: The initial attempt to create branded IDs using a function-like syntax (`Node.NodeId("1")`) was incorrect and caused a `TypeError`. The correct method is a simple, zero-cost type cast: `"1" as Node.NodeId`. This is a powerful feature for enhancing type safety without runtime overhead.

- **Pattern Matching for Constructors**: The refactored `edge.ts` now uses a `create` function based on `Match.tuple`. This is a highly effective pattern for creating type-safe, variant-based objects. It centralizes creation logic and uses TypeScript's type guards to enforce valid connections (e.g., a `StrategyNode` `PRODUCES` a `SchemaNode`), making illegal states unrepresentable at the type level.

### 6.3. Implementation Details & Corrections

#### Correcting Test Failures

The initial tests failed due to incorrect instantiation of `Node` objects. They were corrected by replacing direct constructor calls with the effectful factory functions.

**Original Failing Test Code:**
```typescript
const node1 = new Node.IdentityNode({ id: Node.NodeId("1"), createdAt: new Date(), ... });
```

**Corrected Test Code:**
```typescript
// In algebra.test.ts
it("should perform a catamorphism to count nodes", () =>
  Effect.gen(function*() {
    const node1 = yield* Node.createIdentityNode({ id: "1" as Node.NodeId, ... });
    const node2 = yield* Node.createIdentityNode({ id: "2" as Node.NodeId, ... });
    // ... test logic ...
  })
);
```

#### Type-Safe Edge Creation

The `edge.ts` module was significantly improved by introducing a pattern-matching constructor. This ensures that edge creation is not only fluent but also structurally correct by design.

**Final `Edge.create` Implementation:**
```typescript
// In packages/domain/src/graph/edge.ts
export const create = (
  from: Node.AnyNode,
  to: Node.AnyNode
): Edge =>
  Match.tuple(from, to).pipe(
    Match.when(
      [Node.isStrategyNode, Node.isSchemaNode],
      ([from, to]) => Edge.PRODUCES({ from: from.id, to: to.id })
    ),
    Match.when(
      [Node.isCanonicalEntityNode, Node.isSchemaNode],
      ([from, to]) => Edge.CONFORMS_TO_SCHEMA({ from: from.id, to: to.schemaId })
    ),
    Match.when(
      [Node.isGraphNode, Node.isStrategyNode],
      ([from, to]) => Edge.INPUT_TO({ from: from.id, to: to.id })
    ),
    Match.orElse(([from, to]) => Edge.HAS_CHILD({ from: from.id, to: to.id }))
  )
```

#### Catamorphism (`cata`) Implementation

The `cata` function in `graph.ts` was implemented using a memoized, post-order traversal. This ensures that each node is processed only once and that an algebra is only executed after the results for all its children are available.

**Final `cata` Implementation:**
```typescript
// In packages/domain/src/graph/graph.ts
const cataRecursive = <A, E, R>(
  // ... implementation with memoization map ...
)

export const cata = <A, E, R>(
  algebra: Algebra.CataAlgebra<A, E, R>,
  root: Node.NodeId
) => (self: Graph): Effect.Effect<A, E | GraphOperationError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() => new GraphOperationError({ message: `Root node ${root} not found in graph` }))
  )

  return cataRecursive(self, algebra, HashMap.empty(), startNode).pipe(
    Effect.map(([result, _]) => result)
  )
}
```