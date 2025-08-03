Excellent. This detailed specification and the focus on separating the declarative graph from the materialization engine provide the necessary clarity. The core idea is to build a fluent, type-safe API for constructing a _program-as-a-graph_, which is then interpreted by a runtime. This aligns perfectly with the principles of category theory and functional programming.

Here is the refined technical white paper and the corresponding `Adjoint` library API, which directly models these advanced concepts.

---

## White Paper: The Algebraic Knowledge Engine

### A System for Verifiable, Compositional, and AI-Driven Knowledge Synthesis

**Author:** Gemini Engineering
**Version:** 2.0
**Date:** August 2, 2025

### **Abstract**

This document specifies the technical foundations for the Adjoint Knowledge Engine, a next-generation system for data extraction, integration, and analysis. Traditional data processing pipelines are often brittle, non-compositional, and lack formal guarantees of correctness. This system proposes a paradigm shift: by modeling all computation as a verifiable, graph-to-graph transformation, we construct a system that is not only robust and scalable but also capable of dynamic, AI-driven discovery. The core of the engine is a practical implementation of the **adjoint fold**, a powerful recursion scheme from category theory. By representing all artifacts—data, schemas, processing logic, and even statistical models—within a single, universal algebraic property graph, we create a system where the process of knowledge acquisition is as important, verifiable, and composable as the knowledge itself.

---

### **1. The Technical Foundation: From Pipeline to Topos**

The fundamental flaw of traditional data systems is their treatment of computation as a linear sequence of steps. Our system is built on a different foundation: the entire universe of our knowledge exists as a single, unified mathematical object—a **topos of graphs**. [cite_start]A topos is a category that behaves like the category of sets, equipped with its own powerful internal logic[cite: 1]. [end_cite] This perspective provides profound practical benefits.

#### **1.1. The Universal Primitive: The `CanonicalGraph` Schema**

Instead of defining dozens of bespoke data structures, our system uses a single, universal primitive: the `CanonicalGraph`. This is an `Effect.Schema` that defines a universe of nodes and edges.

- **Nodes**: A tagged union of all possible system artifacts:

  - `SourceDataNode`: Represents raw data from any source.
  - `SchemaNode`: Represents a schema definition itself, making schemas first-class citizens of the graph.
  - `AlgebraNode`: Represents a unit of processing logic (a linker, a fold, a transformation). The logic of the system is data within the system. This corresponds to the **algebra** in a recursion scheme.
  - `FunctorNode`: Represents a prompt-driven, AI-generated transformation. It acts as a **semantic functor**, generating an `AlgebraNode` at runtime.
  - `StatisticalModelNode`: The serialized parameters of a trained model, check-pointed into the graph.

- **Edges**: Labeled, directed connections that describe the relationships between nodes, such as `HAS_CHILD`, `CONFORMS_TO_SCHEMA`, `APPLIED_STRATEGY`, or `PRODUCED_ENTITY`.

This design choice means there is no distinction between data, metadata, and processing logic. Everything coexists in the same algebraic structure.

---

### **2. The Computational Engine: The Adjoint Fold as a Graph Operation**

The engine that drives the evolution of this graph is a direct, practical implementation of the **adjoint fold recursion equation** from formal programming language theory. [cite_start][cite: 3, 503]. [end_cite]

**The Equation:** `x · L(in) = b · C(x) · σ(μD)`

This abstract equation maps to a concrete, effectful graph transformation. Our core API is a single function that embodies this principle: `applyStrategy(graph, target, strategy)`.

- **`μD` (The Data): A Subgraph Query.** The input to any operation is not a file or stream, but a subgraph of the `CanonicalGraph` identified by a query. This is the initial data structure to be processed.

- **`L` (The Context Functor): A Declarative Graph Query.** The context required for an operation is not passed down a call stack; it is queried from the graph. The `StrategyNode` itself declaratively specifies the context it needs via a graph query string. [cite_start]For instance, a **histomorphism**, which requires the full history of previous results, defines its context `L` as a query for all sibling nodes that have already been processed[cite: 164, 944]. [end_cite] [cite_start]This is a formal realization of providing "evaluation in context"[cite: 47]. [end_cite]

- **`b` (The Algebra): The Logic as an `Effect.Schema.transform`.** The `StrategyNode` contains the pure, serializable logic for the transformation. This is an `Effect.Schema.transform` that takes the data (`μD`) and the context (`L`) as input and declaratively produces a new subgraph. This is the "specific linking logic" of the system.

- **`x, C, σ` (The Recursion): The `Effect` Runtime.** The overall recursive process (`x`) and its structure (`C`, the control functor) are managed by the lawful composition of `Effect` operators (`Effect.forEach`, `Stream`, `Effect.reduce`). [cite_start]The `Effect` runtime guarantees that transformations are applied consistently and that dependencies are correctly handled, fulfilling the formal roles of `C` and the distributive law `σ`[cite: 511, 62]. [end_cite]

This architecture is the heart of the system. It replaces complex, imperative control flow with a single, pure, recursive graph transformation function.

---

### **3. Visualizing Computation: The Provenance Graph**

A powerful implication of this design is that the system automatically generates a complete, visual trace of its own execution.

Every time `applyStrategy` is called, it creates a `StrategyApplicationNode` and links the input subgraph(s) and the `StrategyNode` to the output subgraph. The result is a **provenance graph** that is not a log file, but an intrinsic part of the primary data structure.

This trace is a **verifiable proof**. [cite_start]Each successful application of a strategy is a **commutative square**[cite: 240, 245], [end_cite] guaranteeing that the transformation was sound. We can traverse this provenance graph to understand, debug, and audit any conclusion the system reaches, tracing it back to the exact source data and the specific sequence of strategies that produced it.

---

### **4. Expressive Power: The LLM as a Semantic Functor**

The algebraic framework provides the perfect structure to safely and powerfully incorporate Large Language Models (LLMs). The LLM acts as a **semantic functor**: a meta-level operator that generates new, formally sound components for our engine.

- **Generating Algebras (`b`)**: When the system encounters a pattern for which no `StrategyNode` exists, it can use a `FunctorNode` to prompt the LLM to generate one. The prompt asks for a full `StrategyNode` specification, including the required context `L` (e.g., "Paramorphism") and the declarative logic. The LLM's output is not just an answer, but a new, installable piece of processing logic.

- **Generating Functors (`F`): The Virtual Category.** This is the system's most profound capability. We can use the LLM to propose entirely new, task-optimized categorical representations of our data. For example, we can ask it to define a functor that transforms the physical `Sentence -> Paragraph` category into a semantic `Interaction -> Scene` category. The LLM generates the mapping, and our `Effect` engine executes this functor as a preprocessing step, creating a new, "virtual" data structure that is more amenable to our final analysis.

This allows us to model not just the transformation of data, but the **transformation of the logic, schemas, and contexts** required to get there, all within the same unified abstraction. The result is a system of infinite, verifiable compositionality, where the output of any process can become the input for the next, allowing us to build towers of abstraction on a foundation of formal guarantees.

---

## `Adjoint` Library API Specification

This is the fluent, pipeable, and Effect-native API for the engine.

### `Adjoint/Node`: The Primitives

These are the building blocks. We use `Schema.Class` to separate the encoded representation from the live API object.

```typescript
// Adjoint/Node.ts
import { Schema as S, Brand, Data, Effect } from "effect"

// Branded types for IDs to ensure type safety
export type NodeId = string & Brand.Brand<"NodeId">
export const NodeId = S.String.pipe(S.brand("NodeId"))

export type SchemaId = string & Brand.Brand<"SchemaId">
export const SchemaId = S.String.pipe(S.brand("SchemaId"))

// --- Encoded Schemas (Serializable Representations) ---

const EncodedSourceDataNode = S.Struct({
  _tag: S.Literal("SourceDataNode"),
  id: NodeId,
  sourceUri: S.String
})

const EncodedSchemaNode = S.Struct({
  _tag: S.Literal("SchemaNode"),
  id: SchemaId,
  definition: S.Schema<any, any>
})

const EncodedStrategyNode = S.Struct({
  _tag: S.Literal("StrategyNode"),
  id: NodeId,
  name: S.String,
  recursionScheme: S.Literal(
    "Catamorphism",
    "Zygomorphism",
    "Histomorphism",
    "Paramorphism",
    "Functor"
  ),
  // A schema that describes the shape of the data and context (L(in))
  inputSchema: S.Schema<any, any>,
  // A schema that describes the output shape
  outputSchema: S.Schema<any, any>,
  // The algebra 'b' as a serializable transformation
  logic: S.Schema<any, any, any>
})

// --- Live API Classes ---

export class SourceDataNode extends S.Class<SourceDataNode>("SourceDataNode")(
  EncodedSourceDataNode
) {}
export class SchemaNode<A, I> extends S.Class<SchemaNode<A, I>>("SchemaNode")(
  EncodedSchemaNode
) {}
export class StrategyNode extends S.Class<StrategyNode>("StrategyNode")(
  EncodedStrategyNode
) {}

// --- Fluent Constructors ---

export const schema = <A, I>(
  id: string,
  definition: S.Schema<A, I>
): SchemaNode<A, I> => new SchemaNode({ id: SchemaId.make(id), definition })

export const sourceData = (id: string, uri: string): SourceDataNode =>
  new SourceDataNode({ id: NodeId.make(id), sourceUri: uri })

export const strategy = (
  name: string
  // ... other strategy parameters ...
): StrategyNode => {
  // ... implementation
  return new StrategyNode(/* ... */)
}
```

### `Adjoint/Graph`: The Compositional API

The `Graph` is an immutable, declarative blueprint of the entire computation.

```typescript
// Adjoint/Graph.ts
import * as Node from "./Node";
import { Schema as S, Brand, Effect } from "effect";

// The underlying serializable graph structure
const CanonicalGraphSchema = S.Struct({
  nodes: S.Record(Node.NodeId, S.Any), // Simplified for spec
  edges: S.Array(S.Any),
});
type CanonicalGraph = S.Schema.Type<typeof CanonicalGraphSchema>;

// The live, branded Graph type. A morphism from Source -> Target.
export type Graph<Source, Target> = CanonicalGraph & Brand.Brand<"Graph"> & {
  _Source: Source;
  _Target: Target;
};

// --- Core API ---

/**
 * Starts a graph from a source schema. Represents an identity morphism.
 */
export const from = <A, I>(source: Node.SchemaNode<A, I>): Graph<A, A> => {
  const g: CanonicalGraph = {
      nodes: { [source.id]: source.toJSON() },
      edges: [],
  };
  return g as Graph<A, A>;
};

/**
 * Applies a transformation (an algebra). This is function composition.
 * g: B -> C, applied to a graph f: A -> B, yields (g . f): A -> C
 */
export const transform = <A, B, C>(
  strategy: Node.StrategyNode
) => (graph: Graph<A, B>): Graph<A, C> => {
  // This just updates the blueprint. No computation is run.
  const sourceSchemaId = /* logic to find B's schemaId from graph */;
  const targetSchemaId = /* logic to find C's schemaId from strategy */;

  const newGraph: CanonicalGraph = {
    nodes: {
        ...graph.nodes,
        [strategy.id]: strategy.toJSON(),
        [targetSchemaId]: (/* find schema C */),
    },
    edges: [
        ...graph.edges,
        { sourceId: sourceSchemaId, targetId: strategy.id, label: "INPUT_TO" },
        { sourceId: strategy.id, targetId: targetSchemaId, label: "PRODUCES" },
    ]
  };
  return newGraph as Graph<A, C>;
};
```

### `Adjoint/Engine`: The Materialization API

The `Engine` is the runtime that interprets and executes the `Graph` blueprint.

```typescript
// Adjoint/Engine.ts
import { Graph } from "./Graph"
import { Effect, Stream } from "effect"

/**
 * Materializes the declarative graph into a stream of target entities.
 * This is the function that actually "runs" the program described by the graph.
 */
export const materialize = <Source, Target>(
  graph: Graph<Source, Target>
): Stream.Stream<Target, Error> => {
  // This is the implementation of the adjoint fold recursion.
  // It traverses the graph from the target node backwards, resolving
  // dependencies and applying strategies until it reaches SourceDataNodes,
  // at which point it loads data and begins the forward transformation pass.
  // For an Algebra that is itself an Effect, we are in the Kleisli category.
  // The Effect runtime seamlessly handles this composition.
  return Stream.empty // Placeholder for the complex interpreter logic
}
```

### Simple Composition Example

```typescript
// main.ts
import * as Adjoint from "./Adjoint"
import { Schema as S, Effect, Stream } from "effect"

// 1. Define Schemas
const PersonSchema = Adjoint.schema(
  "Person",
  S.Struct({ name: S.String, age: S.Number })
)

const RawPersonSchema = Adjoint.schema(
  "RawPerson",
  S.Struct({ person_name: S.String, person_age: S.Number })
)

const NameSchema = Adjoint.schema("Name", S.String)

// 2. Define Algebras (Strategies)
const RawToPerson = Adjoint.strategy(
  "RawToPerson"
  // ...
)
const PersonToName = Adjoint.strategy(
  "PersonToName"
  // ...
)

// 3. Compose the Graph declaratively
const fullTransformation = Adjoint.from(RawPersonSchema)
  .pipe(Adjoint.transform(RawToPerson)) // Graph<Raw, Person>
  .pipe(Adjoint.transform(PersonToName)) // Graph<Raw, Name>

// 4. Materialize the Graph into a Stream
// The Engine would need to be configured with a data source for `RawPersonSchema`
const nameStream = Adjoint.Engine.materialize(fullTransformation)

// 5. Consume the stream
Effect.runPromise(Stream.runCollect(nameStream)).then(console.log)
```

### How the API Models Mathematical Guarantees

- **Uniqueness & Composition**: The fluent `pipe(Adjoint.transform(...))` API is a direct implementation of function composition (`g ∘ f`). The uniqueness of the resulting transformation is guaranteed by the properties of category theory; there is only one composite morphism. The final graph represents this unique composite.
- **Adjoint Functors**: The system models the relationship between a data category (e.g., raw text files) and a knowledge category (e.g., typed entities). An `AlgebraNode` acts as a functor mapping objects between these categories. The `Engine`'s recursive nature acts as the **left adjoint** (a "free" construction) to a forgetful functor that would map our structured knowledge back to raw data, ensuring structure preservation.
- **The Context `L`**: In our API, the context `L` from the adjoint fold equation is implicitly defined by the `recursionScheme` and `inputSchema` of a `StrategyNode`. For a `Zygomorphism` (`mergeNodes`), `L` would be a query for the node to merge with. For a `Histomorphism` (`groupBy`), `L` is the historical context of sibling nodes. The `Engine` is responsible for interpreting this declaration and providing the context `L(in)` to the algebra `b`.
- **Kleisli Category**: When an `AlgebraNode`'s logic is an effectful transformation (i.e., its `logic` schema is a `S.transformOrFail` that returns an `Effect`), the entire computation is lifted into the Kleisli category of the `Effect` monad. The `Effect` runtime beautifully and automatically handles the monadic composition (`bind` or `>>=`), meaning our engine doesn't need special logic for effectful vs. pure algebras.

Excellent questions. You've hit upon the very heart of why a category-theoretic approach is not just elegant, but profoundly practical. These concepts—context functors, limits, and topology—provide the theoretical backing for the concrete guarantees of correctness, consistency, and optimization in our system.

Let's break these down and then design the query system that naturally emerges from them.

---

### **1. The Context Functor `L` in Practice**

In the adjoint fold equation `x · L(in) = b · C(x) · σ(μD)`, the context functor `L` is the mechanism by which a strategy declaratively specifies the **additional information** it needs from the graph beyond the immediate data (`μD`) it's transforming. In our API, `L` is implicitly defined by the `recursionScheme` and `inputSchema` of a `StrategyNode`.

Let's make this concrete with the strategies from the v1 spec:

- **Catamorphism (`mapProperties`, `filterByProperty`)**:

  - **`L` is the Identity Functor.**
  - The context is just the node being processed. The algebra `b` only needs the node's own properties to do its work. The `inputSchema` of the `StrategyNode` would simply be `CanonicalEntityNode`. No extra query is needed.

- **Zygomorphism (`mergeNodes`)**:

  - **`L` is a Product Functor defined by a query.**
  - The context `L(in)` is a **pair**: `(currentNode, nodeToMergeWith)`. The algebra `b` needs both to perform the merge. The `inputSchema` for this `StrategyNode` would be `S.Tuple(CanonicalEntityNode, CanonicalEntityNode)`. The "auxiliary function" the spec mentions is the graph query that finds the second element of this pair, effectively defining `L`.

- **Histomorphism (`groupBy`)**:

  - **`L` is a Functor that constructs a history tree (a Cofree Comonad).**
  - The context `L(in)` is not just the current set of nodes to group, but the **entire history of their prior transformations**. The algebra `b` needs this full context to make its grouping decision (e.g., knowing which `Person` nodes were derived from the same source `Band` mention). The `inputSchema` would be a recursive schema representing the current nodes and an annotation tree of their ancestors.

- **Functor (`applySchema`)**:
  - **`L` is again a Product Functor.**
  - The context `L(in)` is the pair `(SourceDataNode, SchemaNode)`. The algebra `b` needs both the raw data and the schema definition to produce a `CanonicalEntityNode`.

**In short, `L` is how a strategy declares its dependencies. The Engine's job is to resolve this declaration by querying the graph and providing the requested context to the strategy's logic.**

---

### **2. Equivalence Relationships**

Equivalence is a cornerstone of proving correctness.

- **Equivalence in the Category of Graphs (Objects):** Equivalence between two `CanonicalGraph` objects is **isomorphism**. Two graphs are isomorphic if there exists a bijection between their nodes and edges that preserves all labels and connections.

  - **Practical Meaning:** They represent the **exact same knowledge**, even if the `NodeId`s or internal storage details differ. The provenance graph allows us to prove that a transformation `Graph A -> Graph B` is an isomorphism, meaning no information was lost.

- **Equivalence in the Category of Algebras (Morphisms):** Equivalence between two `StrategyNode`s is **natural isomorphism**. Two strategies are naturally isomorphic if they produce isomorphic output graphs for _any_ isomorphic input graphs.
  - **Practical Meaning:** They are **computationally equivalent**. They represent two different algorithms for achieving the exact same result. This is the formal basis for **query optimization**. The engine can provably substitute one strategy for a more efficient (e.g., parallelizable, lower memory) but equivalent one, with a mathematical guarantee that the final result will be identical.

---

### **3. The Practical Power of Limit Preservation**

This is the most critical and powerful guarantee that adjoint functors provide. As the reference states, left adjoints preserve colimits and right adjoints preserve limits. In our system:

- The **declarative graph construction** (composing `Graph` objects) acts as a **left adjoint**.
- The **materialization `Engine`** acts as a **right adjoint**.

**What are limits and colimits?**

- **Limits** are constructions that bundle things together based on shared structure (think "AND"). The two most important are **Products** and **Pullbacks**.
- **Colimits** are constructions that glue things together (think "OR"). The two most important are **Coproducts** and **Pushouts**.

**What does it mean for the Engine (a right adjoint) to preserve limits?**

1.  **Preserving Products (The "AND" Query):**

    - **Categorical Definition:** The product of two schemas, `Person` and `Employee`, is a schema for entities that are **both a `Person` AND an `Employee`**.
    - **Preservation Means:** `Engine(Person × Employee) ≅ Engine(Person) × Engine(Engine)`.
    - **Practical Inference:** This is a **distributive law for computation**. It means we can either:
      a. First find all entities that are simultaneously a Person and an Employee, _then_ materialize them.
      b. First materialize all Persons, _then_ materialize all Employees, _then_ find the intersection of the results.
    - The guarantee is that **both paths yield the same result**. This allows a query planner to choose the most efficient execution strategy.

2.  **Preserving Pullbacks (The "JOIN" Query):**
    - **Categorical Definition:** A pullback finds all pairs of objects that agree on a common mapping.
    - **Practical Example:** Find all pairs of `(Order, Customer)` such that `Order.customerId` maps to the same `Customer.id`. **This is a relational JOIN.**
    - **Preservation Means:** The engine can execute the join on the materialized data, or it can understand the join at the schema-level and perform a more optimized, integrated materialization. The result is guaranteed to be the same. This is the formal underpinning of relational query optimization, and we get it for our graph structure.

**What does it mean for Graph Construction (a left adjoint) to preserve colimits?**

1.  **Preserving Coproducts (The "OR" / Tagged Union):**
    - **Categorical Definition:** The coproduct of `Vehicle` and `Building` is a new schema `Asset` which is **either a `Vehicle` OR a `Building`**.
    - **Preservation Means:** We can construct a transformation graph for `Asset` by simply taking the disjoint union of the transformation graphs for `Vehicle` and `Building`.
    - **Practical Inference:** This allows for massive **modularity and parallelism**. We can build complex data integration workflows for different entity types completely independently, and then "glue" them together at the end with a guarantee of correctness.

---

### **4. Topology and Sheaves: A Model for Consistency**

These concepts provide a powerful language for describing data consistency across a distributed, heterogeneous graph.

- **Topology:** The "topology" on our `CanonicalGraph` is the connection structure itself. The edges define which nodes are "near" each other. A "neighborhood" of a node is the set of nodes it's directly connected to.
- **Sheaves:** A sheaf is a tool for managing data that is defined _locally_ but must be consistent _globally_. The classic analogy is a world map made from local charts; each chart is accurate on its own, but they must agree where they overlap.
  - **Practical Inference:** In our graph, a **sheaf condition** is a formal guarantee of data consistency. If we integrate data from two different sources (two "local charts"), they might both describe the same real-world entity (an "overlap"). For example, a `Person` node from HR data and a `Person` node from a project management tool. The sheaf condition requires that their properties are not contradictory. If they are, the data cannot be "glued" together into a valid global graph. **This provides a formal basis for data validation, master data management, and enforcing integrity constraints across the entire knowledge graph.**

---

### **5. The `Adjoint/Query` Module: An Algebraic Query System**

Based on the principles above, the query system should not be a set of imperative functions but an API for declaratively building a `QueryGraph`, which is just a specialized `Adjoint.Graph`.

```typescript
// Adjoint/Query.ts
import { Graph, SchemaNode, from } from "./Graph";
import { AlgebraNode, algebra } from "./Node";
import { Schema as S } from "effect";

// A Query is just a Graph that starts from some source and ends at a target.
export type Query<Source, Target> = Graph<Source, Target>;

// --- Query Primitives (mirroring limit/colimit constructions) ---

/**
 * The starting point of a query. Selects all entities of a given schema.
 */
export const select = <A, I>(schema: SchemaNode<A, I>): Query<A, A> => from(schema);

/**
 * Filters a stream of entities based on a predicate.
 * This is a form of pullback.
 */
export const filter = <A>(
  predicate: (a: A) => boolean
) => <S>(query: Query<S, A>): Query<S, A> => {
  const filterAlgebra = algebra(
    /* input schema A */,
    /* output schema A */,
    S.filter(query.getTarget().definition, { predicate })
  );
  return query.pipe(transform(filterAlgebra));
};

/**

 * A relational-style join. Finds pairs of entities that satisfy a predicate.
 * This is a pullback.
 */
export const join = <A, B, S>(
  other: Query<any, B>,
  on: (a: A, b: B) => boolean
) => (query: Query<S, A>): Query<S, { left: A, right: B }> => {
  // The implementation would create a complex algebra representing the join logic.
  // The key is that the operation is declarative.
  const joinedSchema = schema("Joined", S.Struct({ left: query.getTarget().definition, right: other.getTarget().definition }));
  const joinAlgebra = algebra(/*... */);
  return query.pipe(transform(joinAlgebra));
};
```

This API is fully compositional. A query is built by piping selectors through combinators like `filter` and `join`. The result is a static `Graph` object, which is then passed to `Adjoint.Engine.materialize` for execution.

### **6. Modeling Typeclasses: Semigroups and Monoids**

Your observation is spot on. We can model algebraic structures like semigroups directly in the graph.

- **A Semigroup in the Graph:**

  1.  A `SchemaNode` defines the type `S`.
  2.  An `AlgebraNode` represents the binary, associative operation `(s1: S, s2: S) => S`. Its `inputSchema` would be `S.Tuple(S, S)` and its `outputSchema` would be `S`.

- **Adjoining an Identity (Semigroup -> Monoid):** This is a classic categorical construction and a perfect example of a left adjoint functor.
  1.  We define a **new schema**, `Monoid_S`, as a coproduct (tagged union): `S.Union(S_Schema, S.Literal(1))`.
  2.  We define **new algebras** for the monoid's binary operation that handle the new identity element `1`. For example, `(s, 1) => s`.
  3.  The functor `U` that takes a `Monoid` graph and "forgets" the identity to give back a `Semigroup` graph is a **right adjoint**.
  4.  Our construction, `F`, which takes a `Semigroup` graph and freely builds the corresponding `Monoid` graph, is its **left adjoint**.

**Practical Inference (Why this matters):** Because our "adjoin identity" construction `F` is a left adjoint, **it preserves colimits**. This gives us a powerful, concrete theorem about our system for free:

> If you take the coproduct (union) of two semigroup graphs (`S1` and `S2`) and _then_ adjoin an identity, the result is guaranteed to be isomorphic to the graph you get by adjoining identities to `S1` and `S2` _first_ and _then_ taking their coproduct.
>
> `F(S1 + S2) ≅ F(S1) + F(S2)`

This is not an obvious property, but it falls directly out of the mathematics. It provides a powerful rule for optimizing and refactoring complex graph transformations with 100% confidence.
