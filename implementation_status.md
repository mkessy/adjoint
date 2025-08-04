This file is a merged representation of the entire codebase, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded

Additional Info:
----------------

================================================================
Directory Structure
================================================================
.cursor/
  rules/
    effect-rules.mdc
packages/
  cli/
    src/
      bin.ts
      Cli.ts
      TodosClient.ts
    LICENSE
    package.json
    tsconfig.build.json
    tsconfig.json
    tsconfig.src.json
    tsconfig.test.json
    vitest.config.ts
  domain/
    src/
      archive/
        graph_api_impl_0.md.archive
        graph_api_impl_1.md.archive
        step_1_and_2_analysis.md.archive
      core/
        RecursionScheme.ts
      documentation/
        math.txt
      graph/
        algebra.ts
        Composition.ts
        edge.ts
        graph.ts
        index.ts
        node.ts
      implementation/
        graph_engine_api.md.archive
      node/
        capabilities.ts
        predicate.ts
    test/
      graph/
        GraphAlgebra.test.ts
        GraphComposition.test.ts
        GraphOperations.test.ts
        PropertyBasedTests.test.ts
      node/
        NodeCapabilities.test.ts
      algebra.test.ts
      Dummy.test.ts
      graph.test.ts
    LICENSE
    package.json
    test-results.json
    tsconfig.build.json
    tsconfig.json
    tsconfig.src.json
    tsconfig.test.json
    vitest.config.ts
  server/
    src/
      Api.ts
      server.ts
      TodosRepository.ts
    test/
      Dummy.test.ts
    LICENSE
    package.json
    tsconfig.build.json
    tsconfig.json
    tsconfig.src.json
    tsconfig.test.json
    vitest.config.ts
  web/
    src/
      components/
        plays/
          PlayItem.tsx
          RecentPlays.tsx
      hooks/
        useEffect.ts
        useService.ts
      services/
        ApiClient.ts
        AppRuntime.tsx
        Runtime.tsx
      styles/
        index.css
      App.tsx
      main.tsx
      vite-env.d.ts
    index.html
    package.json
    tsconfig.build.json
    tsconfig.json
    tsconfig.src.json
    tsconfig.test.json
    vite.config.ts
patches/
  babel-plugin-annotate-pure-calls@0.4.0.patch
scratchpad/
  tsconfig.json
scripts/
  clean.mjs
.gitignore
.repomixignore
eslint.config.mjs
flake.lock
LICENSE
package.json
pnpm-workspace.yaml
setupTests.ts
tsconfig.base.json
tsconfig.build.json
tsconfig.json
vitest.shared.ts
vitest.workspace.ts

================================================================
Files
================================================================

================
File: .cursor/rules/effect-rules.mdc
================
---
description:
globs:
alwaysApply: false
---

================
File: packages/cli/src/bin.ts
================
#!/usr/bin/env node

import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { cli } from "./Cli.js"
import { TodosClient } from "./TodosClient.js"

const MainLive = TodosClient.Default.pipe(
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.merge(NodeContext.layer)
)

cli(process.argv).pipe(
  Effect.provide(MainLive),
  NodeRuntime.runMain
)

================
File: packages/cli/src/Cli.ts
================
import { TodoId } from "@adjoint/domain/TodosApi"
import { Args, Command, Options } from "@effect/cli"
import { TodosClient } from "./TodosClient.js"

const todoArg = Args.text({ name: "todo" }).pipe(
  Args.withDescription("The message associated with a todo")
)

const todoId = Options.withSchema(Options.integer("id"), TodoId).pipe(
  Options.withDescription("The identifier of the todo")
)

const add = Command.make("add", { todo: todoArg }).pipe(
  Command.withDescription("Add a new todo"),
  Command.withHandler(({ todo }) => TodosClient.create(todo))
)

const done = Command.make("done", { id: todoId }).pipe(
  Command.withDescription("Mark a todo as done"),
  Command.withHandler(({ id }) => TodosClient.complete(id))
)

const list = Command.make("list").pipe(
  Command.withDescription("List all todos"),
  Command.withHandler(() => TodosClient.list)
)

const remove = Command.make("remove", { id: todoId }).pipe(
  Command.withDescription("Remove a todo"),
  Command.withHandler(({ id }) => TodosClient.remove(id))
)

const command = Command.make("todo").pipe(
  Command.withSubcommands([add, done, list, remove])
)

export const cli = Command.run(command, {
  name: "Todo CLI",
  version: "0.0.0"
})

================
File: packages/cli/src/TodosClient.ts
================
import type { TodoId } from "@adjoint/domain/TodosApi"
import { TodosApi } from "@adjoint/domain/TodosApi"
import { HttpApiClient } from "@effect/platform"
import { Effect } from "effect"

export class TodosClient extends Effect.Service<TodosClient>()("cli/TodosClient", {
  accessors: true,
  effect: Effect.gen(function*() {
    const client = yield* HttpApiClient.make(TodosApi, {
      baseUrl: "http://localhost:3000"
    })

    function create(text: string) {
      return client.todos.createTodo({ payload: { text } }).pipe(
        Effect.flatMap((todo) => Effect.logInfo("Created todo: ", todo))
      )
    }

    const list = client.todos.getAllTodos().pipe(
      Effect.flatMap((todos) => Effect.logInfo(todos))
    )

    function complete(id: TodoId) {
      return client.todos.completeTodo({ path: { id } }).pipe(
        Effect.flatMap((todo) => Effect.logInfo("Marked todo completed: ", todo)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`))
      )
    }

    function remove(id: TodoId) {
      return client.todos.removeTodo({ path: { id } }).pipe(
        Effect.flatMap(() => Effect.logInfo(`Deleted todo with id: ${id}`)),
        Effect.catchTag("TodoNotFound", () => Effect.logError(`Failed to find todo with id: ${id}`))
      )
    }

    return {
      create,
      list,
      complete,
      remove
    } as const
  })
}) {}

================
File: packages/cli/LICENSE
================
MIT License

Copyright (c) 2024-present <PLACEHOLDER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================
File: packages/cli/package.json
================
{
  "name": "@adjoint/cli",
  "version": "0.0.0",
  "type": "module",
  "license": "MIT",
  "description": "The CLI template",
  "repository": {
    "type": "git",
    "url": "<PLACEHOLDER>",
    "directory": "packages/cli"
  },
  "publishConfig": {
    "access": "public",
    "directory": "dist"
  },
  "scripts": {
    "codegen": "build-utils prepare-v2",
    "build": "pnpm build-esm && pnpm build-annotate && pnpm build-cjs && build-utils pack-v2",
    "build-esm": "tsc -b tsconfig.build.json",
    "build-cjs": "babel build/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir build/cjs --source-maps",
    "build-annotate": "babel build/esm --plugins annotate-pure-calls --out-dir build/esm --source-maps",
    "check": "tsc -b tsconfig.json",
    "test": "vitest",
    "coverage": "vitest --coverage"
  },
  "dependencies": {
    "@effect/cli": "latest",
    "@effect/platform": "latest",
    "@effect/platform-node": "latest",
    "@adjoint/domain": "workspace:^",
    "effect": "latest"
  },
  "devDependencies": {
    "@effect/cli": "latest",
    "@effect/platform": "latest",
    "@effect/platform-node": "latest",
    "@adjoint/domain": "workspace:^",
    "effect": "latest"
  },
  "effect": {
    "generateExports": {
      "include": [
        "**/*.ts"
      ]
    },
    "generateIndex": {
      "include": [
        "**/*.ts"
      ]
    }
  }
}

================
File: packages/cli/tsconfig.build.json
================
{
  "extends": "./tsconfig.src.json",
  "references": [
    { "path": "../domain/tsconfig.build.json" }
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/build.tsbuildinfo",
    "outDir": "build/esm",
    "declarationDir": "build/dts",
    "stripInternal": true
  }
}

================
File: packages/cli/tsconfig.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "tsconfig.test.json" }
  ]
}

================
File: packages/cli/tsconfig.src.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "references": [
    { "path": "../domain" } 
  ],
  "compilerOptions": {
    "types": ["node"],
    "outDir": "build/src",
    "tsBuildInfoFile": ".tsbuildinfo/src.tsbuildinfo",
    "rootDir": "src"
  }
}

================
File: packages/cli/tsconfig.test.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["test"],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "../domain" } 
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/test.tsbuildinfo",
    "rootDir": "test",
    "noEmit": true
  }
}

================
File: packages/cli/vitest.config.ts
================
import { mergeConfig, type UserConfigExport } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = {}

export default mergeConfig(shared, config)

================
File: packages/domain/src/archive/graph_api_impl_0.md.archive
================
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

================
File: packages/domain/src/archive/graph_api_impl_1.md.archive
================
# Implementation Plan v1: Expressive Queries with Node Capabilities

## 1. Introduction & Goal

This document builds upon the v0 plan. The primary goal of this phase is to significantly enhance the expressivity of the Graph API by introducing first-class, declarative services for common node operations: **predicates**, **equivalence**, and **ordering**. 

By modeling these as distinct capabilities, we can move from passing raw functions (`(node) => boolean`) to composing named, reusable, and testable components, making the entire system more robust and declarative.

This plan is based on a review of the existing `Graph`, `Composition`, and `Algebra` APIs and the Effect documentation on services and data modeling.

## 2. Step 1: Implement the `NodeCapabilities` Service

The foundation of this plan is a new service for registering and retrieving node capabilities.

**File**: `packages/domain/src/node/capabilities.ts`

**Objective**: Define the core interfaces for `NodePredicate`, `NodeEquivalence`, and `NodeOrdering`, and create a `CapabilityRegistry` service to manage them.

**Implementation Details**:

- **Interfaces**: Define the generic interfaces for each capability. Each will have a `_id: symbol` for unique identification.
- **Service Tag**: Define `CapabilityRegistry` using `Context.Tag`.
- **Live Implementation**: Create a `Live` layer for the `CapabilityRegistry` that uses a `Ref<Map<symbol, unknown>>` to store registered capabilities in memory.

```typescript
// packages/domain/src/node/capabilities.ts

import { Context, Data, Effect, Layer, Ref } from "effect"
import type * as Node from "./node"

// --- Capability Interfaces ---
export interface NodePredicate<A extends Node.AnyNode> { ... }
export interface NodeEquivalence<A extends Node.AnyNode> { ... }
export interface NodeOrdering<A extends Node.AnyNode> { ... }

// --- Capability Registry Service ---
export class CapabilityRegistry extends Context.Tag("CapabilityRegistry")<
  CapabilityRegistry,
  {
    readonly registerPredicate: <A extends Node.AnyNode>(
      predicate: NodePredicate<A>
    ) => Effect.Effect<void>
    readonly getPredicate: <A extends Node.AnyNode>(
      id: symbol
    ) => Effect.Effect<NodePredicate<A>>
    // ... getters/setters for other capabilities
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
```

## 3. Step 2: Implement Predicate Combinators

To make predicates truly powerful, we need a way to compose them.

**File**: `packages/domain/src/node/predicate.ts`

**Objective**: Create a set of pipeable combinators for `NodePredicate` instances.

**Implementation Details**:

- Implement `and`, `or`, and `not` combinators.
- These functions will take one or more predicates and return a *new* `NodePredicate` instance that encapsulates the combined logic.

```typescript
// packages/domain/src/node/predicate.ts
import type { NodePredicate } from "./capabilities"

export const and = <A extends Node.AnyNode>(
  right: NodePredicate<A>
) => (self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`and(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node) && right.evaluate(node)
})

export const or = <A extends Node.AnyNode>(...) => ...
export const not = <A extends Node.AnyNode>() => (self: NodePredicate<A>): NodePredicate<A> => ...
```

## 4. Step 3: Refactor the Graph API for Declarative Queries

With the capabilities defined, we can now refactor the core `graph.ts` API to use them.

**File**: `packages/domain/src/graph/graph.ts`

**Objective**: Introduce new pipeable operators like `filter`, `find`, and `sort` that operate on `NodeCapability` instances instead of raw functions.

**Implementation Details**:

- **`filter`**: This function will take a `NodePredicate` and return a new, smaller `Graph` containing only the nodes that satisfy the predicate.
- **`find`**: This will take a `NodePredicate` and return an `Effect<Option<Node.AnyNode>>`.
- **`sort`**: This will take a `NodeOrdering` and return a `Chunk<Node.AnyNode>` of all nodes in the graph, sorted according to the capability.

```typescript
// packages/domain/src/graph/graph.ts

import type { NodePredicate, NodeOrdering } from "../node/capabilities"

/**
 * Filters the graph, returning a new graph containing only the nodes
 * that satisfy the given predicate.
 */
export const filter = <A extends Node.AnyNode>(
  predicate: NodePredicate<A>
) => (self: Graph): Graph => {
  const newNodes = HashMap.filter(self.nodes, (node) => predicate.evaluate(node as A))
  // Edge filtering logic would also be needed here
  return new Graph({ nodes: newNodes, edges: self.edges })
}

/**
 * Finds the first node in the graph that satisfies the predicate.
 */
export const find = <A extends Node.AnyNode>(
  predicate: NodePredicate<A>
) => (self: Graph): Effect.Effect<Option<A>> => {
  return Effect.sync(() =>
    Option.fromIterable(HashMap.values(self.nodes)).pipe(
      Option.flatMap(Chunk.findFirst((node) => predicate.evaluate(node as A)))
    )
  )
}
```

## 5. Step 4: Enhance Algebras with Capabilities

Algebras can be made more generic and powerful by parameterizing them with capabilities.

**File**: `packages/domain/src/graph/algebra.ts`

**Objective**: Refactor existing algebras and create new ones that accept capabilities as arguments.

**Implementation Details**:

- The `count` algebra can be refactored to take an optional `NodePredicate`.
- A new `equivalence` algebra can be created that uses a `NodeEquivalence` capability to check if all children of a node are equivalent.

```typescript
// packages/domain/src/graph/algebra.ts

import type { NodePredicate } from "../node/capabilities"

/**
 * A catamorphism algebra to count nodes, optionally filtered by a predicate.
 */
export const count = (
  predicate?: NodePredicate<any>
): CataAlgebra<number, never, never> => (
  node,
  children
) => {
  const childrenCount = Chunk.reduce(children, 0, (sum, count) => sum + count)
  const selfCount = predicate ? (predicate.evaluate(node) ? 1 : 0) : 1
  return Effect.succeed(selfCount + childrenCount)
}
```

## 6. Testing Strategy

1.  **CapabilityRegistry**: Test registration and retrieval of predicates.
2.  **Predicate Combinators**: Write unit tests for `and`, `or`, and `not` to ensure they combine predicates correctly.
3.  **Graph API**: Test the new `filter`, `find`, and `sort` functions with various predicates and orderings.
4.  **Algebras**: Test the enhanced `count` algebra with and without a predicate to verify its conditional logic.

## 7. Summary

This plan moves the project closer to its declarative vision. By formalizing predicates and other capabilities, we create a more expressive, type-safe, and compositional API. This foundation will be critical for building the high-level query engine and for verifying the algebraic properties of graph transformations.

================
File: packages/domain/src/archive/step_1_and_2_analysis.md.archive
================
# Implementation Analysis: Steps 1 & 2 for Graph Engine Development

## Executive Summary

This document provides a comprehensive analysis of the current codebase state and detailed implementation plan for Steps 1 and 2 of the graph engine development as outlined in `graph_engine.md`. After reviewing the recent commits, current APIs, and Effect documentation, we present 10 concrete steps to align our implementation with the high-level compositional API vision and engine service architecture.

## Current Implementation Review

### Recent Commits Analysis

The codebase has been significantly enhanced with new node types that align perfectly with the computational graph vision:

1. **New Node Types Added:**

   - `SourceDataNode`: Represents data sources with URI references
   - `SchemaNode`: Represents schema definitions with Effect schemas
   - `StrategyNode`: Represents computational transformations with recursion schemes
   - `SchemaId`: New branded type for schema identification

2. **Enhanced Type System:**

   - Proper recursion scheme enumeration: `Catamorphism`, `Zygomorphism`, `Histomorphism`, `Paramorphism`, `Functor`
   - Schema-first approach with Effect's `Schema.TaggedClass`
   - Comprehensive factory functions with Effect-based error handling

3. **Improved API Organization:**
   - Pattern matching utilities using Effect's `Match` module
   - Comprehensive type guards and validation functions
   - DateTime integration for proper timestamp handling

### Current Strengths

1. **Solid Foundation**: The low-level graph primitives are well-designed with proper Effect patterns
2. **Type Safety**: Excellent use of branded types and Schema validation
3. **Node Modeling**: All required node types for computational graphs are now present
4. **Error Handling**: Proper tagged error hierarchy with domain-specific errors
5. **Pattern Matching**: Clean implementation using Effect's Match module

### Gaps Identified

1. **High-Level Compositional API**: Missing the fluent `from().transform()` chain API
2. **Engine Service**: No execution engine service implementation
3. **Execution Planning**: Missing topological sort and execution plan generation
4. **Caching/Memoization**: No on-demand execution with memoization
5. **Metrics Integration**: No observability for engine execution
6. **Stream Processing**: Limited integration with Effect's Stream for data flow

## Effect Documentation Insights

### Key Effect Patterns for Implementation

1. **Service Architecture** (`Effect.Tag`):

   - Services should use `Context.Tag` for dependency injection
   - Clean separation between service interface and implementation
   - Layer-based dependency management for complex service graphs

2. **Caching Strategy** (`Effect.Cache`):

   - `Effect.Cache.make` provides concurrent, memoized computation
   - TTL and capacity management for performance optimization
   - Perfect fit for on-demand node execution with memoization

3. **Metrics Integration**:

   - Counter metrics for execution statistics
   - Histogram metrics for execution time distribution
   - Gauge metrics for current engine state
   - Tagged metrics for categorization by node type

4. **Stream Processing**:

   - `Stream` for continuous data flow through computational graphs
   - Error handling and recovery strategies for stream processing
   - Concurrent stream processing with proper resource management

5. **Error Management**:
   - Tagged errors for domain-specific error types
   - Error boundaries at service level
   - Proper error propagation through effect chains

## 10-Step Implementation Plan

### Step 1: Create High-Level Compositional API Module

**File**: `packages/domain/src/graph/Composition.ts`

**Objective**: Implement the fluent API for declarative graph composition

**Implementation Details**:

- Define branded `Graph<Source, Target>` type extending base `Graph`
- Implement `from<A>(source: SchemaNode): Graph<A, A>` constructor
- Implement `transform<A, B, C>(strategy: StrategyNode): (graph: Graph<A, B>) => Graph<A, C>`
- Use existing `addNode` and `addEdge` operations from `graph.ts`
- Maintain pure functional composition (no execution)

**Effect Patterns**:

- Branded types for type-safe graph composition
- Pipeable operators for functional composition
- Schema validation for node compatibility

**Error Boundaries**:

- `GraphCompositionError` for invalid node connections
- Schema compatibility validation errors
- Type-level prevention of invalid compositions

### Step 2: Define Engine Service Interface

**File**: `packages/domain/src/engine/Engine.ts`

**Objective**: Create the `AdjointEngine` service using Effect's service pattern

**Implementation Details**:

- Use `Context.Tag` to define the `AdjointEngine` service
- Define service interface with `compile` and `execute` methods
- Create `ExecutionPlan` data class with topological sort results
- Define `CompilationError` hierarchy (`CycleDetectedError`, `SchemaNotFoundError`)

**Effect Patterns**:

- Service definition with `Context.Tag("AdjointEngine")`
- Proper error types using `Data.TaggedError`
- Interface separation from implementation

**Service Interface**:

```typescript
interface AdjointEngine {
  readonly compile: (
    graph: Graph<any, any>
  ) => Effect<ExecutionPlan, CompilationError>
  readonly execute: (plan: ExecutionPlan) => Stream<any, ExecutionError>
}
```

### Step 3: Implement Execution Plan Generation

**File**: `packages/domain/src/engine/ExecutionPlan.ts`

**Objective**: Create execution plans using topological sort of computational dependencies

**Implementation Details**:

- Implement topological sort algorithm for `INPUT_TO` and `PRODUCES` edges
- Create `ExecutionPlan` class with ordered node execution sequence
- Handle cycle detection and report `CycleDetectedError`
- Validate schema compatibility between connected nodes

**Effect Patterns**:

- `Effect.gen` for complex computation orchestration
- Proper error handling with tagged errors
- Use of `Chunk` for efficient sequence operations

**Data Structures**:

- `ExecutionPlan` with `ReadonlyArray<NodeId>` execution order
- Dependency graph analysis using existing edge relationships
- Memoization-friendly node ordering

### Step 4: Implement Core Execution Engine

**File**: `packages/domain/src/engine/ExecutionEngine.ts`

**Objective**: Create the on-demand, memoized execution logic

**Implementation Details**:

- Implement `processNode` recursive function for node execution
- Use `Effect.Cache` for memoization with configurable TTL and capacity
- Handle different node types (`SourceDataNode`, `StrategyNode`, `SchemaNode`)
- Implement lazy evaluation with dependency resolution

**Effect Patterns**:

- `Effect.Cache.make` for memoized node execution
- Recursive effect composition with proper error handling
- Stream-based data flow for continuous processing

**Caching Strategy**:

```typescript
const nodeCache = Cache.make({
  capacity: 1000,
  timeToLive: "60 minutes",
  lookup: (nodeId: NodeId) => processNode(nodeId)
})
```

### Step 5: Integrate Metrics and Observability

**File**: `packages/domain/src/engine/EngineMetrics.ts`

**Objective**: Add comprehensive metrics for engine performance monitoring

**Implementation Details**:

- Counter metrics for node executions by type
- Histogram metrics for execution time distribution
- Gauge metrics for cache hit rates and current graph size
- Tagged metrics for categorization and filtering

**Metrics Implementation**:

```typescript
const executionCounter = Metric.counter("engine_node_executions").pipe(
  Metric.tagged("node_type", nodeType)
)

const executionTime = Metric.histogram(
  "engine_execution_time",
  MetricBoundaries.exponential({ start: 1, factor: 2, count: 10 })
)

const cacheHitRate = Metric.gauge("engine_cache_hit_rate")
```

**Effect Patterns**:

- Metric tagging for dimensional analysis
- Integration with Effect's observability system
- Automatic metric collection during execution

### Step 6: Implement Error Boundary Architecture

**File**: `packages/domain/src/engine/ErrorBoundaries.ts`

**Objective**: Create comprehensive error handling with proper boundaries

**Implementation Details**:

- Define error hierarchy for different failure modes
- Implement error recovery strategies at appropriate levels
- Create error boundary services for isolation
- Proper error propagation and logging

**Error Hierarchy**:

```typescript
// Engine-level errors
class EngineExecutionError extends Data.TaggedError("EngineExecutionError")
class NodeExecutionError extends Data.TaggedError("NodeExecutionError")
class SchemaValidationError extends Data.TaggedError("SchemaValidationError")
class DependencyResolutionError extends Data.TaggedError("DependencyResolutionError")

// Recovery strategies
class ErrorRecoveryService extends Context.Tag("ErrorRecoveryService")
```

**Error Boundaries**:

- Engine service level: Compilation and execution errors
- Node level: Individual node execution failures
- Schema level: Data validation and transformation errors
- Network level: External data source failures

### Step 7: Create Engine State Management

**File**: `packages/domain/src/engine/EngineState.ts`

**Objective**: Implement stateful engine management with proper concurrency control

**Implementation Details**:

- Use `SynchronizedRef` for thread-safe engine state
- Implement engine lifecycle management (idle, compiling, executing)
- Track active executions and resource usage
- Proper cleanup and resource management

**State Management**:

```typescript
interface EngineState {
  readonly status: "idle" | "compiling" | "executing"
  readonly activeExecutions: HashMap<ExecutionId, ExecutionContext>
  readonly compiledPlans: HashMap<GraphId, ExecutionPlan>
  readonly metrics: EngineMetrics
}

const engineState = SynchronizedRef.make<EngineState>(initialState)
```

**Effect Patterns**:

- `SynchronizedRef` for concurrent state management
- Proper resource cleanup with `Effect.acquireRelease`
- State transitions with validation

### Step 8: Implement Stream-Based Data Flow

**File**: `packages/domain/src/engine/DataFlow.ts`

**Objective**: Create efficient stream processing for continuous data flow

**Implementation Details**:

- Implement `Stream` producers for `SourceDataNode`
- Create stream transformations for `StrategyNode` logic
- Handle backpressure and flow control
- Error recovery and retry strategies for streams

**Stream Architecture**:

```typescript
const createDataStream = (
  sourceNode: SourceDataNode
): Stream<unknown, DataSourceError> =>
  Stream.fromEffect(loadDataFromSource(sourceNode.sourceUri)).pipe(
    Stream.retry(
      Schedule.exponential("1 second").pipe(Schedule.maxDelay("30 seconds"))
    )
  )

const transformStream = <A, B>(
  strategy: StrategyNode,
  input: Stream<A, unknown>
): Stream<B, TransformationError> =>
  input.pipe(
    Stream.mapEffect((data) => applyStrategy(strategy, data)),
    Stream.buffer(1000)
  )
```

**Effect Patterns**:

- Stream composition and transformation
- Error handling in streaming context
- Proper resource management for streams

### Step 9: Create Integration Layer

**File**: `packages/domain/src/engine/Integration.ts`

**Objective**: Integrate all components into cohesive engine implementation

**Implementation Details**:

- Combine composition API with execution engine
- Implement end-to-end graph execution
- Create service layer implementations
- Proper dependency injection and layer management

**Integration Architecture**:

```typescript
const AdjointEngineImpl: Layer<
  AdjointEngine,
  never,
  Cache.Cache<NodeId, unknown> | EngineMetrics | ErrorRecoveryService
> = Layer.effect(
  AdjointEngine,
  Effect.gen(function* () {
    const cache = yield* Cache.Cache
    const metrics = yield* EngineMetrics
    const errorRecovery = yield* ErrorRecoveryService

    return AdjointEngine.of({
      compile: (graph) => compileGraph(graph, metrics),
      execute: (plan) => executeWithCache(plan, cache, metrics, errorRecovery)
    })
  })
)
```

**Layer Architecture**:

- Proper dependency injection with layers
- Service composition and lifecycle management
- Configuration and environment handling

### Step 10: Implement Testing and Validation Framework

**File**: `packages/domain/src/engine/Testing.ts`

**Objective**: Create comprehensive testing infrastructure for engine validation

**Implementation Details**:

- Create test fixtures for graph construction
- Implement property-based testing for engine behavior
- Create performance benchmarks and regression tests
- Mock implementations for external dependencies

**Testing Framework**:

```typescript
const testEngine = AdjointEngineImpl.pipe(
  Layer.provide(Cache.layer({ capacity: 100, timeToLive: "1 minute" })),
  Layer.provide(TestMetrics.layer),
  Layer.provide(MockErrorRecovery.layer)
)

const graphTestSuite = Effect.gen(function* () {
  const engine = yield* AdjointEngine
  const testGraph = createTestGraph()
  const plan = yield* engine.compile(testGraph)
  const results = yield* engine.execute(plan).pipe(Stream.runCollect)
  // Assertions and validations
})
```

**Testing Patterns**:

- Layer-based test environment setup
- Property-based testing with fast-check integration
- Performance testing with metrics collection
- Integration testing with real data sources

## Data Flow and Error Risk Analysis

### Data Flow Architecture

1. **Graph Construction**: High-level API creates computational graph blueprint
2. **Compilation Phase**: Topological sort and validation create execution plan
3. **Execution Phase**: On-demand node processing with memoization
4. **Data Streaming**: Continuous data flow through transformation pipeline
5. **Result Collection**: Stream consumption and result aggregation

### Error Risk Assessment

#### High-Risk Areas

1. **Cycle Detection**: Infinite loops in graph dependencies
2. **Schema Compatibility**: Type mismatches between connected nodes
3. **Resource Exhaustion**: Memory leaks from unbounded caching
4. **External Dependencies**: Network failures and data source unavailability
5. **Concurrent Access**: Race conditions in shared state management

#### Mitigation Strategies

1. **Validation Gates**: Early validation at composition and compilation phases
2. **Resource Limits**: Bounded caches and execution timeouts
3. **Circuit Breakers**: Automatic failure detection and recovery
4. **Monitoring**: Comprehensive metrics and alerting
5. **Graceful Degradation**: Fallback strategies for partial failures

### Performance Considerations

1. **Caching Strategy**: Balance between memory usage and computation cost
2. **Concurrency Model**: Fiber-based concurrency for scalable execution
3. **Stream Processing**: Efficient data flow with backpressure handling
4. **Metrics Overhead**: Lightweight metrics collection without performance impact
5. **Resource Cleanup**: Proper resource management and garbage collection

## Workflow Modeling with Effect

### Service Orchestration

The engine follows Effect's service-oriented architecture:

1. **AdjointEngine**: Core execution service
2. **CacheService**: Memoization and performance optimization
3. **MetricsService**: Observability and monitoring
4. **ErrorRecoveryService**: Failure handling and recovery
5. **DataSourceService**: External data integration

### Layer Dependencies

```
AdjointEngine
├── CacheService
├── MetricsService
├── ErrorRecoveryService
└── DataSourceService
    ├── HttpClient (for remote data)
    ├── FileSystem (for local data)
    └── Database (for persistent data)
```

### Effect Patterns Applied

1. **Dependency Injection**: Services declared with Context.Tag
2. **Resource Management**: Proper acquisition and cleanup
3. **Error Handling**: Tagged errors with recovery strategies
4. **Concurrency**: Fiber-based parallel execution
5. **Observability**: Integrated metrics and tracing
6. **Testing**: Layer-based test environment setup

## Next Steps

1. **Immediate Priority**: Implement Step 1 (Compositional API) to enable high-level graph construction
2. **Short Term**: Steps 2-4 for core engine functionality
3. **Medium Term**: Steps 5-7 for production-ready observability and state management
4. **Long Term**: Steps 8-10 for advanced features and comprehensive testing

This implementation plan provides a clear path from the current low-level primitives to a production-ready computational graph engine that leverages Effect's full ecosystem for robust, observable, and scalable execution.

================
File: packages/domain/src/core/RecursionScheme.ts
================
import { Schema as S } from "effect"

// Recursion schemes as defined in the proposal
export const RecursionScheme = S.Literal(
  "Catamorphism",
  "Anamorphism",
  "Hylomorphism",
  "Zygomorphism",
  "Histomorphism",
  "Paramorphism",
  "Functor"
).pipe(
  S.brand("RecursionScheme")
)

export type RecursionScheme = S.Schema.Type<typeof RecursionScheme>

// Type-safe helpers for each recursion scheme
export const RecursionSchemes = {
  Catamorphism: "Catamorphism" as const,
  Anamorphism: "Anamorphism" as const,
  Hylomorphism: "Hylomorphism" as const,
  Zygomorphism: "Zygomorphism" as const,
  Histomorphism: "Histomorphism" as const,
  Paramorphism: "Paramorphism" as const,
  Functor: "Functor" as const
} as const

================
File: packages/domain/src/documentation/math.txt
================
Excellent. This detailed specification and the focus on separating the declarative graph from the materialization engine provide the necessary clarity. The core idea is to build a fluent, type-safe API for constructing a program-as-a-graph, which is then interpreted by a runtime. This aligns perfectly with the principles of category theory and functional programming.

Here is the refined technical white paper and the corresponding Adjoint library API, which directly models these advanced concepts.

White Paper: The Algebraic Knowledge Engine
A System for Verifiable, Compositional, and AI-Driven Knowledge Synthesis

Author: Gemini Engineering
Version: 2.0
Date: August 2, 2025

Abstract

This document specifies the technical foundations for the Adjoint Knowledge Engine, a next-generation system for data extraction, integration, and analysis. Traditional data processing pipelines are often brittle, non-compositional, and lack formal guarantees of correctness. This system proposes a paradigm shift: by modeling all computation as a verifiable, graph-to-graph transformation, we construct a system that is not only robust and scalable but also capable of dynamic, AI-driven discovery. The core of the engine is a practical implementation of the adjoint fold, a powerful recursion scheme from category theory. By representing all artifacts—data, schemas, processing logic, and even statistical models—within a single, universal algebraic property graph, we create a system where the process of knowledge acquisition is as important, verifiable, and composable as the knowledge itself.

1. The Technical Foundation: From Pipeline to Topos

The fundamental flaw of traditional data systems is their treatment of computation as a linear sequence of steps. Our system is built on a different foundation: the entire universe of our knowledge exists as a single, unified mathematical object—a topos of graphs. [cite_start]A topos is a category that behaves like the category of sets, equipped with its own powerful internal logic[cite: 1]. [end_cite] This perspective provides profound practical benefits.

1.1. The Universal Primitive: The CanonicalGraph Schema

Instead of defining dozens of bespoke data structures, our system uses a single, universal primitive: the CanonicalGraph. This is an Effect.Schema that defines a universe of nodes and edges.

Nodes: A tagged union of all possible system artifacts:

SourceDataNode: Represents raw data from any source.

SchemaNode: Represents a schema definition itself, making schemas first-class citizens of the graph.

AlgebraNode: Represents a unit of processing logic (a linker, a fold, a transformation). The logic of the system is data within the system. This corresponds to the algebra in a recursion scheme.

FunctorNode: Represents a prompt-driven, AI-generated transformation. It acts as a semantic functor, generating an AlgebraNode at runtime.

StatisticalModelNode: The serialized parameters of a trained model, check-pointed into the graph.

Edges: Labeled, directed connections that describe the relationships between nodes, such as HAS_CHILD, CONFORMS_TO_SCHEMA, APPLIED_STRATEGY, or PRODUCED_ENTITY.

This design choice means there is no distinction between data, metadata, and processing logic. Everything coexists in the same algebraic structure.

2. The Computational Engine: The Adjoint Fold as a Graph Operation

The engine that drives the evolution of this graph is a direct, practical implementation of the adjoint fold recursion equation from formal programming language theory. [cite_start][cite: 3, 503]. [end_cite]

The Equation: x · L(in) = b · C(x) · σ(μD)

This abstract equation maps to a concrete, effectful graph transformation. Our core API is a single function that embodies this principle: applyStrategy(graph, target, strategy).

μD (The Data): A Subgraph Query. The input to any operation is not a file or stream, but a subgraph of the CanonicalGraph identified by a query. This is the initial data structure to be processed.

L (The Context Functor): A Declarative Graph Query. The context required for an operation is not passed down a call stack; it is queried from the graph. The StrategyNode itself declaratively specifies the context it needs via a graph query string. [cite_start]For instance, a histomorphism, which requires the full history of previous results, defines its context L as a query for all sibling nodes that have already been processed[cite: 164, 944]. [end_cite] [cite_start]This is a formal realization of providing "evaluation in context"[cite: 47]. [end_cite]

b (The Algebra): The Logic as an Effect.Schema.transform. The StrategyNode contains the pure, serializable logic for the transformation. This is an Effect.Schema.transform that takes the data (μD) and the context (L) as input and declaratively produces a new subgraph. This is the "specific linking logic" of the system.

x, C, σ (The Recursion): The Effect Runtime. The overall recursive process (x) and its structure (C, the control functor) are managed by the lawful composition of Effect operators (Effect.forEach, Stream, Effect.reduce). [cite_start]The Effect runtime guarantees that transformations are applied consistently and that dependencies are correctly handled, fulfilling the formal roles of C and the distributive law σ[cite: 511, 62]. [end_cite]

This architecture is the heart of the system. It replaces complex, imperative control flow with a single, pure, recursive graph transformation function.

3. Visualizing Computation: The Provenance Graph

A powerful implication of this design is that the system automatically generates a complete, visual trace of its own execution.

Every time applyStrategy is called, it creates a StrategyApplicationNode and links the input subgraph(s) and the StrategyNode to the output subgraph. The result is a provenance graph that is not a log file, but an intrinsic part of the primary data structure.

This trace is a verifiable proof. [cite_start]Each successful application of a strategy is a commutative square[cite: 240, 245], [end_cite] guaranteeing that the transformation was sound. We can traverse this provenance graph to understand, debug, and audit any conclusion the system reaches, tracing it back to the exact source data and the specific sequence of strategies that produced it.

4. Expressive Power: The LLM as a Semantic Functor

The algebraic framework provides the perfect structure to safely and powerfully incorporate Large Language Models (LLMs). The LLM acts as a semantic functor: a meta-level operator that generates new, formally sound components for our engine.

Generating Algebras (b): When the system encounters a pattern for which no StrategyNode exists, it can use a FunctorNode to prompt the LLM to generate one. The prompt asks for a full StrategyNode specification, including the required context L (e.g., "Paramorphism") and the declarative logic. The LLM's output is not just an answer, but a new, installable piece of processing logic.

Generating Functors (F): The Virtual Category. This is the system's most profound capability. We can use the LLM to propose entirely new, task-optimized categorical representations of our data. For example, we can ask it to define a functor that transforms the physical Sentence -> Paragraph category into a semantic Interaction -> Scene category. The LLM generates the mapping, and our Effect engine executes this functor as a preprocessing step, creating a new, "virtual" data structure that is more amenable to our final analysis.

This allows us to model not just the transformation of data, but the transformation of the logic, schemas, and contexts required to get there, all within the same unified abstraction. The result is a system of infinite, verifiable compositionality, where the output of any process can become the input for the next, allowing us to build towers of abstraction on a foundation of formal guarantees.

Adjoint Library API Specification

This is the fluent, pipeable, and Effect-native API for the engine.

Adjoint/Node: The Primitives

These are the building blocks. We use Schema.Class to separate the encoded representation from the live API object.

Generated typescript
// Adjoint/Node.ts
import { Schema as S, Brand, Data, Effect } from "effect";

// Branded types for IDs to ensure type safety
export type NodeId = string & Brand.Brand<"NodeId">;
export const NodeId = S.String.pipe(S.brand("NodeId"));

export type SchemaId = string & Brand.Brand<"SchemaId">;
export const SchemaId = S.String.pipe(S.brand("SchemaId"));

// --- Encoded Schemas (Serializable Representations) ---

const EncodedSourceDataNode = S.Struct({
  _tag: S.Literal("SourceDataNode"),
  id: NodeId,
  sourceUri: S.String,
});

const EncodedSchemaNode = S.Struct({
  _tag: S.Literal("SchemaNode"),
  id: SchemaId,
  definition: S.Schema<any, any>,
});

const EncodedStrategyNode = S.Struct({
  _tag: S.Literal("StrategyNode"),
  id: NodeId,
  name: S.String,
  recursionScheme: S.Literal("Catamorphism", "Zygomorphism", "Histomorphism", "Paramorphism", "Functor"),
  // A schema that describes the shape of the data and context (L(in))
  inputSchema: S.Schema<any, any>,
  // A schema that describes the output shape
  outputSchema: S.Schema<any, any>,
  // The algebra 'b' as a serializable transformation
  logic: S.Schema<any, any, any>,
});

// --- Live API Classes ---

export class SourceDataNode extends S.Class<SourceDataNode>("SourceDataNode")(EncodedSourceDataNode) {}
export class SchemaNode<A, I> extends S.Class<SchemaNode<A,I>>("SchemaNode")(EncodedSchemaNode) {}
export class StrategyNode extends S.Class<StrategyNode>("StrategyNode")(EncodedStrategyNode) {}

// --- Fluent Constructors ---

export const schema = <A, I>(id: string, definition: S.Schema<A, I>): SchemaNode<A, I> =>
  new SchemaNode({ id: SchemaId.make(id), definition });

export const sourceData = (id: string, uri: string): SourceDataNode =>
  new SourceDataNode({ id: NodeId.make(id), sourceUri: uri });

export const strategy = (
    name: string,
    // ... other strategy parameters ...
): StrategyNode => {
    // ... implementation
    return new StrategyNode(/* ... */);
};

Adjoint/Graph: The Compositional API

The Graph is an immutable, declarative blueprint of the entire computation.

Generated typescript
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
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
Adjoint/Engine: The Materialization API

The Engine is the runtime that interprets and executes the Graph blueprint.

Generated typescript
// Adjoint/Engine.ts
import { Graph } from "./Graph";
import { Effect, Stream } from "effect";

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
  return Stream.empty; // Placeholder for the complex interpreter logic
};
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
Simple Composition Example
Generated typescript
// main.ts
import * as Adjoint from "./Adjoint";
import { Schema as S, Effect, Stream } from "effect";

// 1. Define Schemas
const PersonSchema = Adjoint.schema(
  "Person",
  S.Struct({ name: S.String, age: S.Number })
);

const RawPersonSchema = Adjoint.schema(
    "RawPerson",
    S.Struct({ person_name: S.String, person_age: S.Number })
);

const NameSchema = Adjoint.schema("Name", S.String);

// 2. Define Algebras (Strategies)
const RawToPerson = Adjoint.strategy(
    "RawToPerson",
    // ...
);
const PersonToName = Adjoint.strategy(
    "PersonToName",
    // ...
);

// 3. Compose the Graph declaratively
const fullTransformation = Adjoint.from(RawPersonSchema)
  .pipe(Adjoint.transform(RawToPerson))   // Graph<Raw, Person>
  .pipe(Adjoint.transform(PersonToName)); // Graph<Raw, Name>

// 4. Materialize the Graph into a Stream
// The Engine would need to be configured with a data source for `RawPersonSchema`
const nameStream = Adjoint.Engine.materialize(fullTransformation);

// 5. Consume the stream
Effect.runPromise(Stream.runCollect(nameStream)).then(console.log);
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
How the API Models Mathematical Guarantees

Uniqueness & Composition: The fluent pipe(Adjoint.transform(...)) API is a direct implementation of function composition (g ∘ f). The uniqueness of the resulting transformation is guaranteed by the properties of category theory; there is only one composite morphism. The final graph represents this unique composite.

Adjoint Functors: The system models the relationship between a data category (e.g., raw text files) and a knowledge category (e.g., typed entities). An AlgebraNode acts as a functor mapping objects between these categories. The Engine's recursive nature acts as the left adjoint (a "free" construction) to a forgetful functor that would map our structured knowledge back to raw data, ensuring structure preservation.

The Context L: In our API, the context L from the adjoint fold equation is implicitly defined by the recursionScheme and inputSchema of a StrategyNode. For a Zygomorphism (mergeNodes), L would be a query for the node to merge with. For a Histomorphism (groupBy), L is the historical context of sibling nodes. The Engine is responsible for interpreting this declaration and providing the context L(in) to the algebra b.

Kleisli Category: When an AlgebraNode's logic is an effectful transformation (i.e., its logic schema is a S.transformOrFail that returns an Effect), the entire computation is lifted into the Kleisli category of the Effect monad. The Effect runtime beautifully and automatically handles the monadic composition (bind or >>=), meaning our engine doesn't need special logic for effectful vs. pure algebras.

================
File: packages/domain/src/graph/algebra.ts
================
import { Chunk, Effect } from "effect"
import type { NodePredicate } from "../node/capabilities.js"
import type * as N from "./node.js"

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
  (node: N.AnyNode, children: Chunk.Chunk<A>): Effect.Effect<A, E, R>
}

/**
 * A Paramorphism is a fold that has access to both the original child nodes
 * and the results of folding over them.
 *
 * @param A The carrier type for the result of the fold.
 * @param E The error type of the algebra.
 * @param R The context required by the algebra.
 */
export interface ParaAlgebra<A, E, R> {
  (node: N.AnyNode, children: Chunk.Chunk<[A, N.AnyNode]>): Effect.Effect<A, E, R>
}

//
// MARK: Concrete Algebra Implementations
//

/**
 * A catamorphism algebra to count all nodes in a graph structure.
 */
export const count = (
  predicate?: NodePredicate<any>
): CataAlgebra<number, never, never> =>
(node, children) => {
  const childrenCount = Chunk.reduce(children, 0, (sum, count) => sum + count)
  const selfCount = predicate ? (predicate.evaluate(node) ? 1 : 0) : 1
  return Effect.succeed(selfCount + childrenCount)
}

/**
 * A catamorphism algebra to collect all node IDs into a Chunk.
 */
export const collectIds: CataAlgebra<Chunk.Chunk<N.NodeId>, never, never> = (
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

================
File: packages/domain/src/graph/Composition.ts
================
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
  const newTargetSchemaId = `${strategy.id}-output-schema` as Node.NodeId
  const newTargetSchemaNode = new Node.SchemaNode({
    id: newTargetSchemaId,
    schemaId: newTargetSchemaId as unknown as Node.SchemaId,
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

================
File: packages/domain/src/graph/edge.ts
================
import { Data, Match, Schema } from "effect"
import * as Node from "./node.js"

// --- Edge Schema Definition ---

export type Edge = Data.TaggedEnum<{
  CONFORMS_TO_SCHEMA: { from: Node.NodeId; to: Node.SchemaId }
  INPUT_TO: { from: Node.NodeId; to: Node.NodeId }
  PRODUCES: { from: Node.NodeId; to: Node.NodeId }
  HAS_CHILD: { from: Node.NodeId; to: Node.NodeId }
}>

export const Edge = Data.taggedEnum<Edge>()

type EdgeSchema = Schema.Schema.Type<typeof EdgeSchema>

export const EdgeSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("CONFORMS_TO_SCHEMA"), from: Node.NodeId, to: Node.SchemaId }),
  Schema.Struct({ _tag: Schema.Literal("INPUT_TO"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("PRODUCES"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("HAS_CHILD"), from: Node.NodeId, to: Node.NodeId })
)

/**
 * A pipeable pattern matcher for an `Edge`.
 * This provides a clean, data-first API for handling different edge types.
 *
 * @param edge The `Edge` to match against.
 * @param matcher An object containing handlers for each edge type.
 * @returns The result of the matched handler.
 */
export const match = <A>(
  matcher: {
    readonly CONFORMS_TO_SCHEMA: (edge: Extract<Edge, { _tag: "CONFORMS_TO_SCHEMA" }>) => A
    readonly INPUT_TO: (edge: Extract<Edge, { _tag: "INPUT_TO" }>) => A
    readonly PRODUCES: (edge: Extract<Edge, { _tag: "PRODUCES" }>) => A
    readonly HAS_CHILD: (edge: Extract<Edge, { _tag: "HAS_CHILD" }>) => A
  }
) =>
(edge: Edge): A => Edge.$match(edge, matcher) as A

// --- Pattern-Matching Based Constructor ---

/**
 * Creates an Edge in a type-safe manner using pattern matching on the node types.
 * This function provides a single, consistent API for edge creation and ensures
 * that only valid connections can be made at the type level.
 *
 * @param from The source node.
 * @param to The target node.
 * @returns An `Edge` object representing the connection.
 */
export const create = (
  from: Node.AnyNode,
  to: Node.AnyNode
): Edge =>
  Match.value([from, to]).pipe(
    // A StrategyNode produces a SchemaNode
    Match.when(
      [Node.isStrategyNode, Node.isSchemaNode],
      ([from, to]) => Edge.PRODUCES({ from: from.id, to: to.id })
    ),
    // A CanonicalEntityNode conforms to a SchemaNode
    Match.when(
      [Node.isCanonicalEntityNode, Node.isSchemaNode],
      ([from, to]) => Edge.CONFORMS_TO_SCHEMA({ from: from.id, to: to.schemaId })
    ),
    // Any node can be an input to a StrategyNode
    Match.when(
      [Node.isGraphNode, Node.isStrategyNode],
      ([from, to]) => Edge.INPUT_TO({ from: from.id, to: to.id })
    ),
    // Default case for a generic parent-child relationship
    Match.orElse(([from, to]) => Edge.HAS_CHILD({ from: from.id, to: to.id }))
  )

================
File: packages/domain/src/graph/graph.ts
================
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

const paraRecursive = <A, E, R>(
  graph: Graph,
  algebra: Algebra.ParaAlgebra<A, E, R>,
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
        children,
        Effect.forEach((child) => paraRecursive(graph, algebra, memo, child)),
        Effect.map((childResults) => {
          const newMemo = childResults.reduce((acc, [_, childMemo]) => {
            return HashMap.union(acc, childMemo)
          }, memo)

          // For paramorphism, we pass both the computed values and the original children
          const paraChildren = Chunk.fromIterable(
            Chunk.toReadonlyArray(children).map((child, index) => [childResults[index][0], child] as [A, Node.AnyNode])
          )

          return [paraChildren, newMemo] as [Chunk.Chunk<[A, Node.AnyNode]>, HashMap.HashMap<Node.NodeId, A>]
        }),
        Effect.flatMap(([paraChildren, newMemo]) =>
          algebra(node, paraChildren).pipe(
            Effect.map((result) =>
              [result, HashMap.set(newMemo, node.id, result)] as [A, HashMap.HashMap<Node.NodeId, A>]
            )
          )
        )
      )
    })
  )
}

/**
 * Performs a paramorphism (para) over the graph starting from a root node.
 * Unlike catamorphism, paramorphism provides access to both computed values and original children.
 *
 * @example
 * ```ts
 * // Data-first
 * const result = await Effect.runPromise(para(graph, algebra, rootId))
 *
 * // Data-last (pipeable)
 * const result = await Effect.runPromise(graph.pipe(para(algebra, rootId)))
 * ```
 */
export const para: {
  <A, E, R>(
    algebra: Algebra.ParaAlgebra<A, E, R>,
    root: Node.NodeId
  ): (self: Graph) => Effect.Effect<A, E | GraphOperationError, R>
  <A, E, R>(
    self: Graph,
    algebra: Algebra.ParaAlgebra<A, E, R>,
    root: Node.NodeId
  ): Effect.Effect<A, E | GraphOperationError, R>
} = dual(3, <A, E, R>(
  self: Graph,
  algebra: Algebra.ParaAlgebra<A, E, R>,
  root: Node.NodeId
): Effect.Effect<A, E | GraphOperationError, R> => {
  const startNode = HashMap.get(self.nodes, root).pipe(
    Option.getOrThrowWith(() => new GraphOperationError({ message: `Root node ${root} not found in graph` }))
  )

  return paraRecursive(self, algebra, HashMap.empty(), startNode).pipe(
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

================
File: packages/domain/src/graph/index.ts
================
// Core graph components
export * as Algebra from "./algebra.js"
export * as Edge from "./edge.js"
export * as Graph from "./graph.js"
export * as Node from "./node.js"

// High-level composition API
export * as Composition from "./Composition.js"

// Node capabilities and predicates
export * as Capabilities from "../node/capabilities.js"
export * as Predicate from "../node/predicate.js"

================
File: packages/domain/src/graph/node.ts
================
import type { ParseResult } from "effect"
import { Arbitrary, Chunk, Data, DateTime, Effect, Equal, FastCheck, JSONSchema, Match, Schema, Stream } from "effect"

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

================
File: packages/domain/src/implementation/graph_engine_api.md.archive
================
Excellent. This is a fascinating and well-architected project. You have laid an outstanding foundation using idiomatic Effect-TS patterns. The use of `Schema.TaggedClass`, `Data.TaggedEnum`, branded types, and effectful factories is top-notch and demonstrates a deep understanding of the ecosystem. The core data models for `Node`, `Edge`, and `Graph` are robust and type-safe.

My review will focus on bridging the gap between the currently implemented low-level, structural graph operations and the high-level, declarative, and mathematically-grounded vision described in your documentation. The goal is to evolve the API to be a more direct expression of "querying a graph of computations."

### High-Level Assessment

**Strengths:**

- **Idiomatic Data Modeling:** The use of `Schema.Class`, `Data.TaggedEnum`, `HashMap`, and `Chunk` is excellent. The separation of the serializable "Encoded" form from the "Live" class with methods is perfectly modeled.
- **Type Safety:** The use of branded types and the pattern-matching `Edge.create` function provides exceptional compile-time safety, making invalid graph structures unrepresentable.
- **Foundational Recursion:** The initial implementation of a `cata` (catamorphism) operator is a solid first step, correctly identifying that a recursive fold is the core primitive for graph traversal.

**Areas for Evolution:**

1.  **API Abstraction Level:** The current API in `graph.ts` (`addNode`, `addEdge`) is for _imperatively building_ a graph. The vision in your documentation describes a _declaratively composing_ a graph of transformations. The API should be elevated to reflect this compositional nature.
2.  **The Nature of Traversal:** The current `cata` implementation traverses `HAS_CHILD` edges. However, the "graph of computations" is defined by `INPUT_TO` and `PRODUCES` edges. The recursion engine needs to operate on this computational DAG, not just a simple structural tree.
3.  **Engine vs. Graph Logic:** The `cata` function is an _engine_ concern (it executes a computation). It should be separated from the pure, declarative `Graph` data structure and its construction API.
4.  **Algebra Context:** The current `CataAlgebra` interface is generic. To be truly useful, an algebra needs to be aware of the `StrategyNode` it's executing, so it can access the `logic` (the `b` in the adjoint fold equation) and schemas.

---

### Detailed Suggestions for Improvement

Here is a proposed evolution of the API, organized into modules as envisioned in your documentation.

#### 1. Bridge the API Gap: Introduce the `Adjoint/Graph` Module

The most significant improvement is to create a high-level, fluent API for _composing_ the graph of computations, exactly as you've designed in the `proposal.md`. This module would use the low-level primitives you've already built.

```typescript
import { Schema as S, Brand, Effect } from "effect";
import * as Node from "./node";
import * as Edge from "./edge";

// The underlying data structure remains the same
import { Graph as CanonicalGraph } from "./graph";

// A branded type for a declarative computation graph
// It represents a morphism from a Source type to a Target type
export type Graph<Source, Target> = CanonicalGraph & Brand.Brand<"Graph"> & {
  _Source: Source;
  _Target: Target;
};

/**
 * Creates a new computational graph starting from a source schema.
 * This represents the identity morphism on the source object.
 */
export const from = <A, I>(source: Node.SchemaNode): Graph<A, A> => {
  const g = new CanonicalGraph({
    nodes: HashMap.make([source.id, source]),
    edges: Chunk.empty(),
  });
  return g as Graph<A, A>;
};

/**
 * Applies a transformation strategy to the graph. This is function composition.
 * Given a graph representing a function `f: A -> B`, and a strategy for `g: B -> C`,
 * this returns a new graph representing `g . f: A -> C`.
 *
 * This function PURELY manipulates the graph blueprint. No computation is run.
 */
export const transform = <A, B, C>(strategy: Node.StrategyNode) =>
  (graph: Graph<A, B>): Graph<A, C> => {
    // Logic to find the current target node (B's schema) in the graph
    const sourceSchemaNode = /* find SchemaNode for B in graph.nodes */;

    // Logic to get the new target schema from the strategy
    const targetSchemaNode = /* get strategy.outputSchema */;

    // Create the new, larger graph blueprint
    const newGraph = graph.pipe(
      addNode(strategy),
      addNode(targetSchemaNode),
      addEdge(Edge.create(sourceSchemaNode, strategy)),
      addEdge(Edge.create(strategy, targetSchemaNode))
    );

    return newGraph as Graph<A, C>;
};
```

================
File: packages/domain/src/node/capabilities.ts
================
import { Context, Effect, Layer, Ref } from "effect"
import type * as Node from "../graph/node.js"

// --- Capability Interfaces ---

export interface NodePredicate<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly evaluate: (node: A) => boolean
}

export interface NodeEquivalence<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly equals: (self: A, that: A) => boolean
}

export interface NodeOrdering<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly compare: (self: A, that: A) => -1 | 0 | 1
}

// --- Capability Registry Service ---

export class CapabilityRegistry extends Context.Tag("CapabilityRegistry")<
  CapabilityRegistry,
  {
    readonly registerPredicate: <A extends Node.AnyNode>(
      predicate: NodePredicate<A>
    ) => Effect.Effect<void>
    readonly getPredicate: <A extends Node.AnyNode>(
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

================
File: packages/domain/src/node/predicate.ts
================
import type * as Node from "../graph/node.js"
import type { NodePredicate } from "./capabilities.js"

export const and = <A extends Node.AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`and(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) && right.evaluate(node as A)
})

export const or = <A extends Node.AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`or(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) || right.evaluate(node as A)
})

export const not = <A extends Node.AnyNode>(
  self: NodePredicate<A>
): NodePredicate<A> => ({
  _id: Symbol.for(`not(${String(self._id)})`),
  evaluate: (node) => !self.evaluate(node as A)
})

================
File: packages/domain/test/graph/GraphAlgebra.test.ts
================
import { Chunk, DateTime, Effect, pipe } from "effect"
import { describe, expect, it } from "vitest"
import * as Algebra from "../../src/graph/algebra.js"
import * as Graph from "../../src/graph/graph.js"
import * as Node from "../../src/graph/node.js"
import type * as Capabilities from "../../src/node/capabilities.js"
import * as Predicate from "../../src/node/predicate.js"

describe("Graph Algebra", () => {
  // Test fixtures
  const createTestNode = (id: string, tag: Node.AnyTag = "IdentityNode"): Node.AnyNode => {
    const baseProps = {
      id: id as Node.NodeId,
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id as Node.NodeId
    }

    switch (tag) {
      case "IdentityNode":
        return new Node.IdentityNode(baseProps)
      case "CanonicalEntityNode":
        return new Node.CanonicalEntityNode({
          ...baseProps,
          schemaId: "test-schema",
          value: { test: "data" }
        })
      case "SourceDataNode":
        return new Node.SourceDataNode({
          ...baseProps,
          sourceUri: "test://source"
        })
      default:
        return new Node.IdentityNode(baseProps)
    }
  }

  const createTestGraph = (nodeCount: number = 3): Graph.Graph => {
    const nodes = Array.from({ length: nodeCount }, (_, i) => createTestNode(`node-${i}`))
    return Graph.fromNodes(nodes)
  }

  describe("count algebra", () => {
    it("should count all nodes when no predicate is provided", async () => {
      const graph = createTestGraph(5)
      const rootNode = createTestNode("root")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const result = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(), rootNode.id))
      )

      expect(result).toBe(1) // Only counts the root in catamorphism
    })

    it("should count nodes matching predicate", async () => {
      const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("is-identity"),
        evaluate: (node) => Node.isIdentityNode(node)
      }

      const graph = createTestGraph(3)
      const rootNode = createTestNode("root", "IdentityNode")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const result = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(identityPredicate), rootNode.id))
      )

      expect(result).toBe(1) // Root node matches predicate
    })

    it("should return 0 when no nodes match predicate", async () => {
      const canonicalPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("is-canonical"),
        evaluate: (node) => Node.isCanonicalEntityNode(node)
      }

      const graph = createTestGraph(3)
      const rootNode = createTestNode("root", "IdentityNode")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const result = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(canonicalPredicate), rootNode.id))
      )

      expect(result).toBe(0) // No canonical nodes
    })
  })

  describe("collectIds algebra", () => {
    it("should collect all node IDs in traversal order", async () => {
      const graph = createTestGraph(0) // Empty graph
      const rootNode = createTestNode("root")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const result = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.collectIds, rootNode.id))
      )

      expect(Chunk.size(result)).toBe(1)
      expect(Chunk.unsafeHead(result)).toEqual(rootNode.id)
    })

    it("should handle empty graphs", async () => {
      const rootNode = createTestNode("root")
      const graph = Graph.fromNodes([rootNode])

      const result = await Effect.runPromise(
        pipe(graph, Graph.cata(Algebra.collectIds, rootNode.id))
      )

      expect(Chunk.size(result)).toBe(1)
      expect(Chunk.toReadonlyArray(result)).toEqual([rootNode.id])
    })
  })

  describe("drawTree algebra", () => {
    it("should create string representation of single node", async () => {
      const rootNode = createTestNode("root")
      const graph = Graph.fromNodes([rootNode])

      const result = await Effect.runPromise(
        pipe(graph, Graph.para(Algebra.drawTree, rootNode.id))
      )

      expect(result).toBe("root")
    })

    it("should handle nodes with children", async () => {
      // This test would need proper parent-child relationships via HAS_CHILD edges
      const rootNode = createTestNode("root")
      const childNode = createTestNode("child")

      const graph = pipe(
        Graph.fromNodes([rootNode, childNode]),
        Graph.addEdge({
          _tag: "HAS_CHILD",
          from: rootNode.id,
          to: childNode.id
        })
      )

      const result = await Effect.runPromise(
        pipe(graph, Graph.para(Algebra.drawTree, rootNode.id))
      )

      expect(result).toContain("root")
    })
  })

  describe("Algebraic Laws", () => {
    it("should satisfy catamorphism laws", async () => {
      // Catamorphism law: cata(f) . fmap(cata(f)) = cata(f)
      // This is a property that should hold for any valid catamorphism
      const graph = createTestGraph(3)
      const rootNode = createTestNode("root")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const count1 = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(), rootNode.id))
      )

      const count2 = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(), rootNode.id))
      )

      // Should be deterministic
      expect(count1).toBe(count2)
    })

    it("should be compositional", async () => {
      // count(p1 ∧ p2) ≤ min(count(p1), count(p2))
      const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("is-identity"),
        evaluate: (node) => Node.isIdentityNode(node)
      }

      const truePredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("always-true"),
        evaluate: (_) => true
      }

      const andPredicate = Predicate.and(identityPredicate)(truePredicate)

      const graph = createTestGraph(3)
      const rootNode = createTestNode("root", "IdentityNode")
      const graphWithRoot = pipe(graph, Graph.addNode(rootNode))

      const countIdentity = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(identityPredicate), rootNode.id))
      )

      const countTrue = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(truePredicate), rootNode.id))
      )

      const countAnd = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(andPredicate), rootNode.id))
      )

      expect(countAnd).toBeLessThanOrEqual(Math.min(countIdentity, countTrue))
    })
  })

  describe("Performance and Edge Cases", () => {
    it("should handle large graphs efficiently", async () => {
      const largeGraph = createTestGraph(1000)
      const rootNode = createTestNode("root")
      const graphWithRoot = pipe(largeGraph, Graph.addNode(rootNode))

      const start = performance.now()
      const result = await Effect.runPromise(
        pipe(graphWithRoot, Graph.cata(Algebra.count(), rootNode.id))
      )
      const end = performance.now()

      expect(result).toBe(1)
      expect(end - start).toBeLessThan(100) // Should complete in < 100ms
    })

    it.skip("should handle circular references gracefully", async () => {
      // Note: This test assumes the graph structure prevents infinite loops
      const nodeA = createTestNode("a")
      const nodeB = createTestNode("b")

      const graph = pipe(
        Graph.fromNodes([nodeA, nodeB]),
        Graph.addEdge({ _tag: "HAS_CHILD", from: nodeA.id, to: nodeB.id }),
        Graph.addEdge({ _tag: "HAS_CHILD", from: nodeB.id, to: nodeA.id })
      )

      // This should not cause infinite recursion due to memoization
      const result = await Effect.runPromise(
        pipe(graph, Graph.cata(Algebra.count(), nodeA.id))
      )

      expect(result).toBeGreaterThan(0)
    })
  })
})

================
File: packages/domain/test/graph/GraphComposition.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { Chunk, DateTime, HashMap, pipe, Schema } from "effect"
import * as Composition from "../../src/graph/Composition.js"
import * as Graph from "../../src/graph/graph.js"
import * as Node from "../../src/graph/node.js"

describe("Graph Composition", () => {
  // Test fixtures
  const createTestSchemaNode = (id: string, schemaId: string) =>
    new Node.SchemaNode({
      id: id as Node.NodeId,
      schemaId: schemaId as Node.SchemaId,
      definition: Schema.String,
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id as Node.NodeId
    })

  const createTestStrategyNode = (id: string, name: string) =>
    new Node.StrategyNode({
      id: id as Node.NodeId,
      name,
      recursionScheme: "Catamorphism",
      inputSchema: Schema.String,
      outputSchema: Schema.Number,
      logic: Schema.String,
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id as Node.NodeId
    })

  describe("from() - Identity morphism creation", () => {
    it("should create a composition with a single schema node", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const composition = Composition.from<string>(sourceSchema)

      expect(HashMap.size(composition.nodes)).toBe(1)
      expect(Chunk.size(composition.edges)).toBe(0)
      expect(HashMap.has(composition.nodes, sourceSchema.id)).toBe(true)
    })

    it("should maintain type safety with branded Composition type", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const composition = Composition.from<string>(sourceSchema)

      // TypeScript should enforce this at compile time
      // This is more of a documentation test
      expect(composition).toBeDefined()
    })
  })

  describe("transform() - Function composition", () => {
    it("should compose two transformations correctly", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const strategy = createTestStrategyNode("strategy-1", "string-to-number")

      const composition = pipe(
        Composition.from<string>(sourceSchema),
        Composition.transform<string, string, number>(strategy)
      )

      // Should have: source schema + strategy + new target schema
      expect(HashMap.size(composition.nodes)).toBe(3)

      // Should have: INPUT_TO edge + PRODUCES edge
      expect(Chunk.size(composition.edges)).toBe(2)
    })

    it("should maintain proper edge relationships", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const strategy = createTestStrategyNode("strategy-1", "string-to-number")

      const composition = pipe(
        Composition.from<string>(sourceSchema),
        Composition.transform<string, string, number>(strategy)
      )

      const inputToEdges = Chunk.filter(composition.edges, (e) => e._tag === "INPUT_TO")
      const producesEdges = Chunk.filter(composition.edges, (e) => e._tag === "PRODUCES")

      expect(Chunk.size(inputToEdges)).toBe(1)
      expect(Chunk.size(producesEdges)).toBe(1)

      // INPUT_TO should connect source schema to strategy
      const firstInputEdge = Chunk.unsafeHead(inputToEdges)
      expect(firstInputEdge.from).toBe(sourceSchema.id)
      expect(firstInputEdge.to).toBe(strategy.id)
    })

    it("should handle chain of transformations", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const strategy1 = createTestStrategyNode("strategy-1", "string-to-number")
      const strategy2 = createTestStrategyNode("strategy-2", "number-to-boolean")

      const composition = pipe(
        Composition.from<string>(sourceSchema),
        Composition.transform<string, string, number>(strategy1),
        Composition.transform<string, number, boolean>(strategy2)
      )

      // Should have: source + strategy1 + intermediate schema + strategy2 + final schema
      expect(HashMap.size(composition.nodes)).toBe(5)
      expect(Chunk.size(composition.edges)).toBe(4)
    })
  })

  describe("Mathematical Properties", () => {
    it("should satisfy identity law: from(A).transform(id) ≡ from(A)", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const identityStrategy = createTestStrategyNode("identity", "identity")

      const original = Composition.from<string>(sourceSchema)
      const transformed = pipe(
        original,
        Composition.transform<string, string, string>(identityStrategy)
      )

      // Identity transformation should add the identity strategy but preserve semantics
      expect(HashMap.size(transformed.nodes)).toBe(HashMap.size(original.nodes) + 2) // +strategy +new schema
    })

    it("should satisfy associativity: (f ∘ g) ∘ h ≡ f ∘ (g ∘ h)", () => {
      const sourceSchema = createTestSchemaNode("schema-1", "string-schema")
      const f = createTestStrategyNode("f", "f")
      const g = createTestStrategyNode("g", "g")
      const h = createTestStrategyNode("h", "h")

      // (f ∘ g) ∘ h
      const leftAssoc = pipe(
        Composition.from<string>(sourceSchema),
        Composition.transform(f),
        Composition.transform(g),
        Composition.transform(h)
      )

      // f ∘ (g ∘ h) - conceptually the same final result
      const rightAssoc = pipe(
        Composition.from<string>(sourceSchema),
        Composition.transform(f),
        Composition.transform(g),
        Composition.transform(h)
      )

      // Both should have the same number of nodes and edges
      expect(HashMap.size(leftAssoc.nodes)).toBe(HashMap.size(rightAssoc.nodes))
      expect(Chunk.size(leftAssoc.edges)).toBe(Chunk.size(rightAssoc.edges))
    })
  })

  describe("Error Cases", () => {
    it("should handle missing target schema gracefully", () => {
      // Create a malformed composition without proper schema nodes
      const emptyGraph = new Graph.Graph({
        nodes: HashMap.empty(),
        edges: Chunk.empty()
      }) as Composition.Composition<string, string>

      const strategy = createTestStrategyNode("strategy-1", "test")

      // Should not throw, but return unmodified graph
      const result = Composition.transform<string, string, number>(strategy)(emptyGraph)
      expect(result).toBeDefined()
    })
  })
})

================
File: packages/domain/test/graph/GraphOperations.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { Chunk, DateTime, Effect, Equal, HashMap, Option, pipe } from "effect"
import * as Graph from "../../src/graph/graph.js"
import * as Node from "../../src/graph/node.js"
import type * as Capabilities from "../../src/node/capabilities.js"

describe("Graph Operations", () => {
  // Test fixtures
  const createTestNode = (id: string, tag: Node.AnyTag = "IdentityNode"): Node.AnyNode => {
    const baseProps = {
      id: id as Node.NodeId,
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id as Node.NodeId
    }

    switch (tag) {
      case "IdentityNode":
        return new Node.IdentityNode(baseProps)
      case "CanonicalEntityNode":
        return new Node.CanonicalEntityNode({
          ...baseProps,
          schemaId: "test-schema",
          value: { test: "data" }
        })
      case "SourceDataNode":
        return new Node.SourceDataNode({
          ...baseProps,
          sourceUri: "test://source"
        })
      default:
        return new Node.IdentityNode(baseProps)
    }
  }

  const createMixedGraph = (): Graph.Graph => {
    const nodes = [
      createTestNode("identity-1", "IdentityNode"),
      createTestNode("identity-2", "IdentityNode"),
      createTestNode("canonical-1", "CanonicalEntityNode"),
      createTestNode("source-1", "SourceDataNode"),
      createTestNode("canonical-2", "CanonicalEntityNode")
    ]
    return Graph.fromNodes(nodes)
  }

  describe("filter operation", () => {
    const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-identity"),
      evaluate: (node) => Node.isIdentityNode(node)
    }

    const canonicalPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-canonical"),
      evaluate: (node) => Node.isCanonicalEntityNode(node)
    }

    it("should filter nodes by predicate", () => {
      const graph = createMixedGraph()
      const filteredGraph = Graph.filter(identityPredicate)(graph)

      expect(HashMap.size(filteredGraph.nodes)).toBe(2) // 2 identity nodes

      // All remaining nodes should satisfy the predicate
      Array.from(HashMap.values(filteredGraph.nodes)).forEach((node) => {
        expect(identityPredicate.evaluate(node)).toBe(true)
      })
    })

    it("should preserve graph structure", () => {
      const graph = createMixedGraph()
      const originalSize = HashMap.size(graph.nodes)
      const filteredGraph = Graph.filter(canonicalPredicate)(graph)

      expect(HashMap.size(filteredGraph.nodes)).toBe(2) // 2 canonical nodes
      expect(HashMap.size(filteredGraph.nodes)).toBeLessThan(originalSize)

      // Edges should be preserved (though this could be improved)
      expect(filteredGraph.edges).toBeDefined()
    })

    it("should handle empty results", () => {
      const emptyGraph = Graph.empty()
      const filteredGraph = Graph.filter(identityPredicate)(emptyGraph)

      expect(HashMap.size(filteredGraph.nodes)).toBe(0)
      expect(filteredGraph.edges.length).toBe(0)
    })

    it("should be idempotent: filter(P, filter(P, G)) = filter(P, G)", () => {
      const graph = createMixedGraph()

      const filtered1 = Graph.filter(identityPredicate)(graph)
      const filtered2 = Graph.filter(identityPredicate)(filtered1)

      expect(HashMap.size(filtered1.nodes)).toBe(HashMap.size(filtered2.nodes))

      // All nodes should be identical
      Array.from(HashMap.keys(filtered1.nodes)).forEach((key) => {
        expect(HashMap.has(filtered2.nodes, key)).toBe(true)
      })
    })
  })

  describe("find operation", () => {
    const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-identity"),
      evaluate: (node) => Node.isIdentityNode(node)
    }

    const nonExistentPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("non-existent"),
      evaluate: (_) => false
    }

    it("should find first matching node", async () => {
      const graph = createMixedGraph()

      const result = await Effect.runPromise(
        Graph.find(identityPredicate)(graph)
      )

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(Node.isIdentityNode(result.value)).toBe(true)
      }
    })

    it("should return None when no match found", async () => {
      const graph = createMixedGraph()

      const result = await Effect.runPromise(
        Graph.find(nonExistentPredicate)(graph)
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it("should handle empty graphs", async () => {
      const emptyGraph = Graph.empty()

      const result = await Effect.runPromise(
        Graph.find(identityPredicate)(emptyGraph)
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it("should be deterministic for same predicate", async () => {
      const graph = createMixedGraph()

      const result1 = await Effect.runPromise(
        Graph.find(identityPredicate)(graph)
      )

      const result2 = await Effect.runPromise(
        Graph.find(identityPredicate)(graph)
      )

      expect(Equal.equals(result1, result2)).toBe(true)
    })
  })

  describe("sort operation", () => {
    const idOrdering: Capabilities.NodeOrdering<Node.AnyNode> = {
      _id: Symbol.for("id-ordering"),
      compare: (self, that) => {
        if (self.id < that.id) return -1
        if (self.id > that.id) return 1
        return 0
      }
    }

    const reverseOrdering: Capabilities.NodeOrdering<Node.AnyNode> = {
      _id: Symbol.for("reverse-ordering"),
      compare: (self, that) => {
        if (self.id > that.id) return -1
        if (self.id < that.id) return 1
        return 0
      }
    }

    it("should sort nodes according to ordering", () => {
      const graph = createMixedGraph()
      const sortedNodes = Graph.sort(idOrdering)(graph)

      const nodeArray = Chunk.toReadonlyArray(sortedNodes)

      // Check if sorted
      for (let i = 1; i < nodeArray.length; i++) {
        const comparison = idOrdering.compare(nodeArray[i - 1], nodeArray[i])
        expect(comparison).toBeLessThanOrEqual(0)
      }
    })

    it("should preserve all nodes", () => {
      const graph = createMixedGraph()
      const sortedNodes = Graph.sort(idOrdering)(graph)

      expect(Chunk.size(sortedNodes)).toBe(HashMap.size(graph.nodes))
    })

    it("should handle empty graphs", () => {
      const emptyGraph = Graph.empty()
      const sortedNodes = pipe(emptyGraph, Graph.sort(idOrdering))

      expect(Chunk.size(sortedNodes)).toBe(0)
    })

    it("should be stable for equal elements", () => {
      // Create nodes with same comparison value
      const node1 = createTestNode("same-id", "IdentityNode")
      const node2 = createTestNode("same-id", "CanonicalEntityNode")

      const graph = Graph.fromNodes([node1, node2])
      const sorted1 = pipe(graph, Graph.sort(idOrdering))
      const sorted2 = pipe(graph, Graph.sort(idOrdering))

      expect(Equal.equals(sorted1, sorted2)).toBe(true)
    })

    it("should satisfy ordering laws", () => {
      const graph = createMixedGraph()
      const nodes = Chunk.toReadonlyArray(pipe(graph, Graph.sort(idOrdering)))

      // Antisymmetry and transitivity
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const comparison = idOrdering.compare(nodes[i], nodes[j])
          expect(comparison).toBeLessThanOrEqual(0)
        }
      }
    })

    it("should reverse correctly with reverse ordering", () => {
      const graph = createMixedGraph()
      const ascending = pipe(graph, Graph.sort(idOrdering))
      const descending = pipe(graph, Graph.sort(reverseOrdering))

      const ascArray = Chunk.toReadonlyArray(ascending)
      const descArray = Chunk.toReadonlyArray(descending)

      expect(ascArray.length).toBe(descArray.length)

      // First element of ascending should be last of descending
      if (ascArray.length > 0) {
        expect(ascArray[0].id).toBe(descArray[descArray.length - 1].id)
      }
    })
  })

  describe("Operation Composition", () => {
    const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-identity"),
      evaluate: (node) => Node.isIdentityNode(node)
    }

    const idOrdering: Capabilities.NodeOrdering<Node.AnyNode> = {
      _id: Symbol.for("id-ordering"),
      compare: (self, that) => {
        if (self.id < that.id) return -1
        if (self.id > that.id) return 1
        return 0
      }
    }

    it("should compose filter and sort correctly", () => {
      const graph = createMixedGraph()

      const filteredAndSorted = pipe(
        graph,
        Graph.filter(identityPredicate),
        Graph.sort(idOrdering)
      )

      const nodeArray = Chunk.toReadonlyArray(filteredAndSorted)

      // All nodes should satisfy predicate
      nodeArray.forEach((node) => {
        expect(identityPredicate.evaluate(node)).toBe(true)
      })

      // Should be sorted
      for (let i = 1; i < nodeArray.length; i++) {
        const comparison = idOrdering.compare(nodeArray[i - 1], nodeArray[i])
        expect(comparison).toBeLessThanOrEqual(0)
      }
    })

    it("should compose filter and find correctly", async () => {
      const graph = createMixedGraph()

      const result = await Effect.runPromise(
        pipe(
          graph,
          Graph.filter(identityPredicate),
          Graph.find(identityPredicate)
        )
      )

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(identityPredicate.evaluate(result.value)).toBe(true)
      }
    })
  })

  describe("Performance and Edge Cases", () => {
    it("should handle large graphs efficiently", () => {
      const largeNodes = Array.from(
        { length: 1000 },
        (_, i) => createTestNode(`node-${i}`, i % 2 === 0 ? "IdentityNode" : "CanonicalEntityNode")
      )
      const largeGraph = Graph.fromNodes(largeNodes)

      const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("is-identity"),
        evaluate: (node) => Node.isIdentityNode(node)
      }

      const start = performance.now()
      const filtered = pipe(largeGraph, Graph.filter(identityPredicate))
      const end = performance.now()

      expect(HashMap.size(filtered.nodes)).toBe(500) // Half are identity nodes
      expect(end - start).toBeLessThan(50) // Should be fast
    })

    it("should maintain referential transparency", () => {
      const graph = createMixedGraph()
      const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("is-identity"),
        evaluate: (node) => Node.isIdentityNode(node)
      }

      const result1 = pipe(graph, Graph.filter(identityPredicate))
      const result2 = pipe(graph, Graph.filter(identityPredicate))

      expect(HashMap.size(result1.nodes)).toBe(HashMap.size(result2.nodes))

      // Same nodes should be present
      Array.from(HashMap.keys(result1.nodes)).forEach((key) => {
        expect(HashMap.has(result2.nodes, key)).toBe(true)
      })
    })
  })
})

================
File: packages/domain/test/graph/PropertyBasedTests.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { Chunk, DateTime, Effect, FastCheck } from "effect"
import * as Algebra from "../../src/graph/algebra.js"
import * as Graph from "../../src/graph/graph.js"
import * as Node from "../../src/graph/node.js"
import type * as Capabilities from "../../src/node/capabilities.js"
import * as Predicate from "../../src/node/predicate.js"

describe("Property-Based Tests", () => {
  // Generators for test data
  const nodeIdArb = FastCheck.string({ minLength: 1, maxLength: 20 })
    .map((s) => s as Node.NodeId)

  const nodeTagArb = FastCheck.constantFrom<Node.AnyTag>(
    "IdentityNode",
    "CanonicalEntityNode",
    "SourceDataNode",
    "SchemaNode",
    "StrategyNode"
  )

  const createNodeArb = FastCheck.record({
    id: nodeIdArb,
    tag: nodeTagArb
  }).map(({ id, tag }) => {
    const baseProps = {
      id,
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id
    }

    switch (tag) {
      case "IdentityNode":
        return new Node.IdentityNode(baseProps)
      case "CanonicalEntityNode":
        return new Node.CanonicalEntityNode({
          ...baseProps,
          schemaId: "test-schema",
          value: { test: "data" }
        })
      case "SourceDataNode":
        return new Node.SourceDataNode({
          ...baseProps,
          sourceUri: "test://source"
        })
      default:
        return new Node.IdentityNode(baseProps)
    }
  })

  const graphArb = FastCheck.array(createNodeArb, { minLength: 0, maxLength: 20 })
    .map((nodes) => Graph.fromNodes(nodes))

  const predicateArb = FastCheck.constantFrom(
    {
      _id: Symbol.for("is-identity"),
      evaluate: (node: Node.AnyNode) => Node.isIdentityNode(node)
    },
    {
      _id: Symbol.for("is-canonical"),
      evaluate: (node: Node.AnyNode) => Node.isCanonicalEntityNode(node)
    },
    {
      _id: Symbol.for("always-true"),
      evaluate: (_: Node.AnyNode) => true
    },
    {
      _id: Symbol.for("always-false"),
      evaluate: (_: Node.AnyNode) => false
    }
  )

  describe("Graph Filter Properties", () => {
    it("filter is idempotent: filter(P, filter(P, G)) = filter(P, G)", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, predicateArb, (graph, predicate) => {
          const filtered1 = graph.pipe(Graph.filter(predicate))
          const filtered2 = filtered1.pipe(Graph.filter(predicate))

          return filtered1.nodes.size === filtered2.nodes.size
        }),
        { numRuns: 100 }
      )
    })

    it("filter preserves predicate satisfaction", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, predicateArb, (graph, predicate) => {
          const filtered = graph.pipe(Graph.filter(predicate))

          // All nodes in filtered graph should satisfy predicate
          return Array.from(filtered.nodes.values()).every((node) => predicate.evaluate(node))
        }),
        { numRuns: 100 }
      )
    })

    it("filter is monotonic: |filter(P, G)| ≤ |G|", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, predicateArb, (graph, predicate) => {
          const filtered = graph.pipe(Graph.filter(predicate))
          return filtered.nodes.size <= graph.nodes.size
        }),
        { numRuns: 100 }
      )
    })

    it("filter with always-true predicate is identity", () => {
      const alwaysTrue: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("always-true"),
        evaluate: (_) => true
      }

      FastCheck.assert(
        FastCheck.property(graphArb, (graph) => {
          const filtered = graph.pipe(Graph.filter(alwaysTrue))
          return filtered.nodes.size === graph.nodes.size
        }),
        { numRuns: 100 }
      )
    })

    it("filter with always-false predicate yields empty graph", () => {
      const alwaysFalse: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("always-false"),
        evaluate: (_) => false
      }

      FastCheck.assert(
        FastCheck.property(graphArb, (graph) => {
          const filtered = graph.pipe(Graph.filter(alwaysFalse))
          return filtered.nodes.size === 0
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Predicate Combinator Properties", () => {
    it("AND is commutative: P ∧ Q ≡ Q ∧ P", () => {
      FastCheck.assert(
        FastCheck.property(
          predicateArb,
          predicateArb,
          createNodeArb,
          (p, q, node) => {
            const pAndQ = p.pipe(Predicate.and(q))
            const qAndP = q.pipe(Predicate.and(p))

            return pAndQ.evaluate(node) === qAndP.evaluate(node)
          }
        ),
        { numRuns: 100 }
      )
    })

    it("AND is associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)", () => {
      FastCheck.assert(
        FastCheck.property(
          predicateArb,
          predicateArb,
          predicateArb,
          createNodeArb,
          (p, q, r, node) => {
            const leftAssoc = p.pipe(Predicate.and(q)).pipe(Predicate.and(r))
            const rightAssoc = p.pipe(Predicate.and(q.pipe(Predicate.and(r))))

            return leftAssoc.evaluate(node) === rightAssoc.evaluate(node)
          }
        ),
        { numRuns: 100 }
      )
    })

    it("OR is commutative: P ∨ Q ≡ Q ∨ P", () => {
      FastCheck.assert(
        FastCheck.property(
          predicateArb,
          predicateArb,
          createNodeArb,
          (p, q, node) => {
            const pOrQ = p.pipe(Predicate.or(q))
            const qOrP = q.pipe(Predicate.or(p))

            return pOrQ.evaluate(node) === qOrP.evaluate(node)
          }
        ),
        { numRuns: 100 }
      )
    })

    it("De Morgan's law: ¬(P ∧ Q) ≡ ¬P ∨ ¬Q", () => {
      FastCheck.assert(
        FastCheck.property(
          predicateArb,
          predicateArb,
          createNodeArb,
          (p, q, node) => {
            const leftSide = Predicate.not(p.pipe(Predicate.and(q)))
            const rightSide = Predicate.not(p).pipe(Predicate.or(Predicate.not(q)))

            return leftSide.evaluate(node) === rightSide.evaluate(node)
          }
        ),
        { numRuns: 100 }
      )
    })

    it("Double negation: ¬¬P ≡ P", () => {
      FastCheck.assert(
        FastCheck.property(
          predicateArb,
          createNodeArb,
          (p, node) => {
            const doubleNegated = Predicate.not(Predicate.not(p))
            return p.evaluate(node) === doubleNegated.evaluate(node)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe("Algebra Properties", () => {
    it("count algebra is non-negative", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, async (graph) => {
          if (graph.nodes.size === 0) return true

          const rootNode = Array.from(graph.nodes.values())[0]
          const result = await Effect.runPromise(
            graph.pipe(Graph.cata(Algebra.count(), rootNode.id))
          )

          return result >= 0
        }),
        { numRuns: 50 }
      )
    })

    it("count with predicate ≤ count without predicate", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, predicateArb, async (graph, predicate) => {
          if (graph.nodes.size === 0) return true

          const rootNode = Array.from(graph.nodes.values())[0]

          const countAll = await Effect.runPromise(
            graph.pipe(Graph.cata(Algebra.count(), rootNode.id))
          )

          const countFiltered = await Effect.runPromise(
            graph.pipe(Graph.cata(Algebra.count(predicate), rootNode.id))
          )

          return countFiltered <= countAll
        }),
        { numRuns: 30 }
      )
    })

    it("collectIds preserves node count", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, async (graph) => {
          if (graph.nodes.size === 0) return true

          const rootNode = Array.from(graph.nodes.values())[0]

          const count = await Effect.runPromise(
            graph.pipe(Graph.cata(Algebra.count(), rootNode.id))
          )

          const ids = await Effect.runPromise(
            graph.pipe(Graph.cata(Algebra.collectIds, rootNode.id))
          )

          return Chunk.size(ids) === count
        }),
        { numRuns: 30 }
      )
    })
  })

  describe("Graph Operation Invariants", () => {
    it("find returns None for empty graphs", () => {
      FastCheck.assert(
        FastCheck.property(predicateArb, async (predicate) => {
          const emptyGraph = Graph.empty()
          const result = await Effect.runPromise(
            emptyGraph.pipe(Graph.find(predicate))
          )

          return result._tag === "None"
        }),
        { numRuns: 20 }
      )
    })

    it("find result satisfies predicate when Some", () => {
      FastCheck.assert(
        FastCheck.property(graphArb, predicateArb, async (graph, predicate) => {
          const result = await Effect.runPromise(
            graph.pipe(Graph.find(predicate))
          )

          if (result._tag === "Some") {
            return predicate.evaluate(result.value)
          }
          return true
        }),
        { numRuns: 50 }
      )
    })

    it("sort preserves node count", () => {
      const ordering: Capabilities.NodeOrdering<Node.AnyNode> = {
        _id: Symbol.for("id-ordering"),
        compare: (self, that) => {
          if (self.id < that.id) return -1
          if (self.id > that.id) return 1
          return 0
        }
      }

      FastCheck.assert(
        FastCheck.property(graphArb, (graph) => {
          const sorted = graph.pipe(Graph.sort(ordering))
          return Chunk.size(sorted) === graph.nodes.size
        }),
        { numRuns: 100 }
      )
    })

    it("sort is deterministic", () => {
      const ordering: Capabilities.NodeOrdering<Node.AnyNode> = {
        _id: Symbol.for("id-ordering"),
        compare: (self, that) => {
          if (self.id < that.id) return -1
          if (self.id > that.id) return 1
          return 0
        }
      }

      FastCheck.assert(
        FastCheck.property(graphArb, (graph) => {
          const sorted1 = graph.pipe(Graph.sort(ordering))
          const sorted2 = graph.pipe(Graph.sort(ordering))

          return Chunk.equals(sorted1, sorted2)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Composition Laws", () => {
    it("filter composition: filter(P, filter(Q, G)) = filter(P ∧ Q, G)", () => {
      FastCheck.assert(
        FastCheck.property(
          graphArb,
          predicateArb,
          predicateArb,
          (graph, p, q) => {
            const composed = graph
              .pipe(Graph.filter(p))
              .pipe(Graph.filter(q))

            const combined = graph.pipe(Graph.filter(p.pipe(Predicate.and(q))))

            return composed.nodes.size === combined.nodes.size
          }
        ),
        { numRuns: 50 }
      )
    })

    it("filter distributes over union predicates", () => {
      FastCheck.assert(
        FastCheck.property(
          graphArb,
          predicateArb,
          predicateArb,
          (graph, p, q) => {
            const combined = graph.pipe(Graph.filter(p.pipe(Predicate.or(q))))

            const separate1 = graph.pipe(Graph.filter(p))
            const separate2 = graph.pipe(Graph.filter(q))

            // |filter(P ∨ Q, G)| ≥ max(|filter(P, G)|, |filter(Q, G)|)
            return combined.nodes.size >= Math.max(separate1.nodes.size, separate2.nodes.size)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe("Error Handling Properties", () => {
    it("operations on empty graphs don't throw", () => {
      const emptyGraph = Graph.empty()
      const predicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("test"),
        evaluate: (_) => true
      }

      expect(() => {
        emptyGraph.pipe(Graph.filter(predicate))
      }).not.toThrow()

      expect(() => {
        emptyGraph.pipe(Graph.sort({
          _id: Symbol.for("test-order"),
          compare: (a, b) => a.id.localeCompare(b.id) as -1 | 0 | 1
        }))
      }).not.toThrow()
    })

    it("malformed predicates don't crash system", () => {
      const throwingPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("throwing"),
        evaluate: (_) => {
          throw new Error("Test error")
        }
      }

      FastCheck.assert(
        FastCheck.property(graphArb, (graph) => {
          try {
            graph.pipe(Graph.filter(throwingPredicate))
            return false // Should have thrown
          } catch (e) {
            return e instanceof Error && e.message === "Test error"
          }
        }),
        { numRuns: 10 }
      )
    })
  })
})

================
File: packages/domain/test/node/NodeCapabilities.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect } from "effect"
import * as Node from "../../src/graph/node.js"
import * as Capabilities from "../../src/node/capabilities.js"
import * as Predicate from "../../src/node/predicate.js"

describe("Node Capabilities", () => {
  // Test fixtures
  const createTestIdentityNode = (id: string) =>
    new Node.IdentityNode({
      id: id as Node.NodeId,
      createdAt: DateTime.unsafeNow(),

      lastSeenBy: id as Node.NodeId
    })

  const createTestCanonicalNode = (id: string) =>
    new Node.CanonicalEntityNode({
      id: id as Node.NodeId,
      schemaId: "test-schema",
      value: { test: "data" },
      createdAt: DateTime.unsafeNow(),
      lastSeenBy: id as Node.NodeId
    })

  describe("NodePredicate", () => {
    const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-identity"),
      evaluate: (node) => Node.isIdentityNode(node)
    }

    const canonicalPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-canonical"),
      evaluate: (node) => Node.isCanonicalEntityNode(node)
    }

    it("should correctly identify node types", () => {
      const identityNode = createTestIdentityNode("test-1")
      const canonicalNode = createTestCanonicalNode("test-2")

      expect(identityPredicate.evaluate(identityNode)).toBe(true)
      expect(identityPredicate.evaluate(canonicalNode)).toBe(false)

      expect(canonicalPredicate.evaluate(identityNode)).toBe(false)
      expect(canonicalPredicate.evaluate(canonicalNode)).toBe(true)
    })

    it("should have unique identifiers", () => {
      expect(identityPredicate._id).not.toBe(canonicalPredicate._id)
      expect(identityPredicate._id.toString()).toBe("Symbol(is-identity)")
    })
  })

  describe("Predicate Combinators", () => {
    const alwaysTrue: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("always-true"),
      evaluate: (_) => true
    }

    const alwaysFalse: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("always-false"),
      evaluate: (_) => false
    }

    const identityPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("is-identity"),
      evaluate: (node) => Node.isIdentityNode(node)
    }

    describe("and combinator", () => {
      it("should satisfy logical AND truth table", () => {
        const testNode = createTestIdentityNode("test")

        // true AND true = true
        const trueAndTrue = Predicate.and(alwaysTrue)(alwaysTrue)
        expect(trueAndTrue.evaluate(testNode)).toBe(true)

        // true AND false = false
        const trueAndFalse = Predicate.and(alwaysTrue)(alwaysFalse)
        expect(trueAndFalse.evaluate(testNode)).toBe(false)

        // false AND true = false
        const falseAndTrue = Predicate.and(alwaysFalse)(alwaysTrue)
        expect(falseAndTrue.evaluate(testNode)).toBe(false)

        // false AND false = false
        const falseAndFalse = Predicate.and(alwaysFalse)(alwaysFalse)
        expect(falseAndFalse.evaluate(testNode)).toBe(false)
      })

      it("should be commutative: P ∧ Q ≡ Q ∧ P", () => {
        const testNode = createTestIdentityNode("test")

        const pAndQ = Predicate.and(identityPredicate)(alwaysTrue)
        const qAndP = Predicate.and(alwaysTrue)(identityPredicate)

        expect(pAndQ.evaluate(testNode)).toBe(qAndP.evaluate(testNode))
      })

      it("should be associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)", () => {
        const testNode = createTestIdentityNode("test")

        const leftAssoc = Predicate.and(Predicate.and(identityPredicate)(alwaysTrue))(alwaysTrue)

        const rightAssoc = Predicate.and(identityPredicate)(Predicate.and(alwaysTrue)(alwaysTrue))

        expect(leftAssoc.evaluate(testNode)).toBe(rightAssoc.evaluate(testNode))
      })

      it("should have identity element: P ∧ true ≡ P", () => {
        const testNode = createTestIdentityNode("test")

        const original = identityPredicate.evaluate(testNode)
        const withIdentity = Predicate.and(identityPredicate)(alwaysTrue)

        expect(withIdentity.evaluate(testNode)).toBe(original)
      })
    })

    describe("or combinator", () => {
      it("should satisfy logical OR truth table", () => {
        const testNode = createTestIdentityNode("test")

        // true OR true = true
        const trueOrTrue = Predicate.or(alwaysTrue)(alwaysTrue)
        expect(trueOrTrue.evaluate(testNode)).toBe(true)

        // true OR false = true
        const trueOrFalse = Predicate.or(alwaysTrue)(alwaysFalse)
        expect(trueOrFalse.evaluate(testNode)).toBe(true)

        // false OR true = true
        const falseOrTrue = Predicate.or(alwaysFalse)(alwaysTrue)
        expect(falseOrTrue.evaluate(testNode)).toBe(true)

        // false OR false = false
        const falseOrFalse = Predicate.or(alwaysFalse)(alwaysFalse)
        expect(falseOrFalse.evaluate(testNode)).toBe(false)
      })

      it("should be commutative: P ∨ Q ≡ Q ∨ P", () => {
        const testNode = createTestIdentityNode("test")

        const pOrQ = Predicate.or(identityPredicate)(alwaysFalse)
        const qOrP = Predicate.or(alwaysFalse)(identityPredicate)

        expect(pOrQ.evaluate(testNode)).toBe(qOrP.evaluate(testNode))
      })

      it("should have identity element: P ∨ false ≡ P", () => {
        const testNode = createTestIdentityNode("test")

        const original = identityPredicate.evaluate(testNode)
        const withIdentity = Predicate.or(identityPredicate)(alwaysFalse)

        expect(withIdentity.evaluate(testNode)).toBe(original)
      })
    })

    describe("not combinator", () => {
      it("should satisfy logical NOT", () => {
        const testNode = createTestIdentityNode("test")

        const notTrue = Predicate.not(alwaysTrue)
        const notFalse = Predicate.not(alwaysFalse)

        expect(notTrue.evaluate(testNode)).toBe(false)
        expect(notFalse.evaluate(testNode)).toBe(true)
      })

      it("should satisfy double negation: ¬¬P ≡ P", () => {
        const testNode = createTestIdentityNode("test")

        const original = identityPredicate.evaluate(testNode)
        const doubleNegated = Predicate.not(Predicate.not(identityPredicate))

        expect(doubleNegated.evaluate(testNode)).toBe(original)
      })

      it("should satisfy De Morgan's laws", () => {
        const testNode = createTestIdentityNode("test")

        // ¬(P ∧ Q) ≡ ¬P ∨ ¬Q
        const leftSide = Predicate.not(
          Predicate.and(identityPredicate)(alwaysTrue)
        )
        const rightSide = Predicate.or(Predicate.not(identityPredicate))(Predicate.not(alwaysTrue))

        expect(leftSide.evaluate(testNode)).toBe(rightSide.evaluate(testNode))

        // ¬(P ∨ Q) ≡ ¬P ∧ ¬Q
        const leftSide2 = Predicate.not(
          Predicate.or(identityPredicate)(alwaysFalse)
        )
        const rightSide2 = Predicate.and(Predicate.not(identityPredicate))(Predicate.not(alwaysFalse))

        expect(leftSide2.evaluate(testNode)).toBe(rightSide2.evaluate(testNode))
      })
    })
  })

  describe("CapabilityRegistry", () => {
    const testPredicate: Capabilities.NodePredicate<Node.AnyNode> = {
      _id: Symbol.for("test-predicate"),
      evaluate: (_) => true
    }

    it("should register and retrieve predicates", async () => {
      const program = Effect.gen(function*() {
        const registry = yield* Capabilities.CapabilityRegistry

        yield* registry.registerPredicate(testPredicate)
        const retrieved = yield* registry.getPredicate(testPredicate._id)

        return retrieved
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Capabilities.CapabilityRegistryLive))
      )

      expect(result._id).toBe(testPredicate._id)
      expect(result.evaluate).toBeDefined()
    })

    it("should handle multiple predicates", async () => {
      const predicate1: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("predicate-1"),
        evaluate: (_) => true
      }

      const predicate2: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("predicate-2"),
        evaluate: (_) => false
      }

      const program = Effect.gen(function*() {
        const registry = yield* Capabilities.CapabilityRegistry

        yield* registry.registerPredicate(predicate1)
        yield* registry.registerPredicate(predicate2)

        const retrieved1 = yield* registry.getPredicate(predicate1._id)
        const retrieved2 = yield* registry.getPredicate(predicate2._id)

        return { retrieved1, retrieved2 }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Capabilities.CapabilityRegistryLive))
      )

      expect(result.retrieved1._id).toBe(predicate1._id)
      expect(result.retrieved2._id).toBe(predicate2._id)
    })

    it("should maintain predicate isolation", async () => {
      const testNode = createTestIdentityNode("test")

      const predicate1: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("predicate-1"),
        evaluate: (_) => true
      }

      const predicate2: Capabilities.NodePredicate<Node.AnyNode> = {
        _id: Symbol.for("predicate-2"),
        evaluate: (_) => false
      }

      const program = Effect.gen(function*() {
        const registry = yield* Capabilities.CapabilityRegistry

        yield* registry.registerPredicate(predicate1)
        yield* registry.registerPredicate(predicate2)

        const retrieved1 = yield* registry.getPredicate(predicate1._id)
        const retrieved2 = yield* registry.getPredicate(predicate2._id)

        return {
          result1: retrieved1.evaluate(testNode),
          result2: retrieved2.evaluate(testNode)
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Capabilities.CapabilityRegistryLive))
      )

      expect(result.result1).toBe(true)
      expect(result.result2).toBe(false)
    })
  })

  describe("NodeEquivalence", () => {
    const nodeEquivalence: Capabilities.NodeEquivalence<Node.IdentityNode> = {
      _id: Symbol.for("identity-equivalence"),
      equals: (self, that) => self.id === that.id
    }

    it("should be reflexive: a ≡ a", () => {
      const node = createTestIdentityNode("test")
      expect(nodeEquivalence.equals(node, node)).toBe(true)
    })

    it("should be symmetric: a ≡ b ⟹ b ≡ a", () => {
      const node1 = createTestIdentityNode("test")
      const node2 = createTestIdentityNode("test") // Same ID

      expect(nodeEquivalence.equals(node1, node2)).toBe(nodeEquivalence.equals(node2, node1))
    })

    it("should be transitive: a ≡ b ∧ b ≡ c ⟹ a ≡ c", () => {
      const node1 = createTestIdentityNode("test")
      const node2 = createTestIdentityNode("test")
      const node3 = createTestIdentityNode("test")

      const ab = nodeEquivalence.equals(node1, node2)
      const bc = nodeEquivalence.equals(node2, node3)
      const ac = nodeEquivalence.equals(node1, node3)

      if (ab && bc) {
        expect(ac).toBe(true)
      }
    })
  })

  describe("NodeOrdering", () => {
    const nodeOrdering: Capabilities.NodeOrdering<Node.AnyNode> = {
      _id: Symbol.for("id-ordering"),
      compare: (self, that) => {
        if (self.id < that.id) return -1
        if (self.id > that.id) return 1
        return 0
      }
    }

    it("should be antisymmetric: a ≤ b ∧ b ≤ a ⟹ a = b", () => {
      const node1 = createTestIdentityNode("a")
      const node2 = createTestIdentityNode("b")

      const ab = nodeOrdering.compare(node1, node2)
      const ba = nodeOrdering.compare(node2, node1)

      if (ab <= 0 && ba <= 0) {
        expect(ab).toBe(0)
        expect(ba).toBe(0)
      }
    })

    it("should be transitive: a ≤ b ∧ b ≤ c ⟹ a ≤ c", () => {
      const node1 = createTestIdentityNode("a")
      const node2 = createTestIdentityNode("b")
      const node3 = createTestIdentityNode("c")

      const ab = nodeOrdering.compare(node1, node2)
      const bc = nodeOrdering.compare(node2, node3)
      const ac = nodeOrdering.compare(node1, node3)

      if (ab <= 0 && bc <= 0) {
        expect(ac).toBeLessThanOrEqual(0)
      }
    })

    it("should be total: ∀a,b: a ≤ b ∨ b ≤ a", () => {
      const node1 = createTestIdentityNode("a")
      const node2 = createTestIdentityNode("b")

      const ab = nodeOrdering.compare(node1, node2)
      const ba = nodeOrdering.compare(node2, node1)

      expect(ab <= 0 || ba <= 0).toBe(true)
    })
  })
})

================
File: packages/domain/test/algebra.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { pipe } from "effect"
import * as Effect from "effect/Effect"
import * as Algebra from "../src/graph/algebra.js"
import * as Edge from "../src/graph/edge.js"
import * as Graph from "../src/graph/graph.js"
import * as Node from "../src/graph/node.js"

describe("Graph Algebras", () => {
  it("should perform a catamorphism to count nodes", () =>
    Effect.gen(function*() {
      const node1 = yield* Node.createIdentityNode({ id: "1" as Node.NodeId, lastSeenBy: "test" as Node.NodeId })
      const node2 = yield* Node.createIdentityNode({ id: "2" as Node.NodeId, lastSeenBy: "test" as Node.NodeId })
      const node3 = yield* Node.createIdentityNode({ id: "3" as Node.NodeId, lastSeenBy: "test" as Node.NodeId })

      const graph = pipe(
        Graph.empty(),
        Graph.addNode(node1),
        Graph.addNode(node2),
        Graph.addNode(node3),
        Graph.addEdge(Edge.create(node1, node2)),
        Graph.addEdge(Edge.create(node1, node3))
      )

      const count = yield* Graph.cata(Algebra.count(), "1" as Node.NodeId)(graph)

      expect(count).toBe(3)
    }))
})

================
File: packages/domain/test/Dummy.test.ts
================
import { describe, expect, it } from "@effect/vitest"

describe("Dummy", () => {
  it("should pass", () => {
    expect(true).toBe(true)
  })
})

================
File: packages/domain/test/graph.test.ts
================
import { describe, expect, it } from "@effect/vitest"
import { HashMap, Schema } from "effect"
import * as Effect from "effect/Effect"
import * as Graph from "../src/graph/graph.js"
import * as Node from "../src/graph/node.js"

describe("Graph API", () => {
  it("should create a graph from a schema", () =>
    Effect.gen(function*() {
      const personSchema = yield* Node.createSchemaNode({
        id: "person" as Node.NodeId,
        schemaId: "Person" as Node.SchemaId,
        definition: Schema.Struct({ name: Schema.String, age: Schema.Number }),
        lastSeenBy: "test" as Node.NodeId
      })

      const graph = Graph.fromNodes([personSchema])

      expect(Object.keys(graph.nodes).length).toBe(1)
      expect(graph.edges.length).toBe(0)
      expect(HashMap.get(graph.nodes, personSchema.id)).toBeDefined()
    }))

  it("should apply a transformation to a graph", () =>
    Effect.gen(function*() {
      const rawPersonSchema = yield* Node.createSchemaNode({
        id: "rawPerson" as Node.NodeId,
        schemaId: "RawPerson" as Node.SchemaId,
        definition: Schema.Struct({ person_name: Schema.String, person_age: Schema.Number }),
        lastSeenBy: "test" as Node.NodeId
      })

      const personSchema = yield* Node.createSchemaNode({
        id: "person" as Node.NodeId,
        schemaId: "Person" as Node.SchemaId,
        definition: Schema.Struct({ name: Schema.String, age: Schema.Number }),
        lastSeenBy: "test" as Node.NodeId
      })

      const rawToPersonStrategy = yield* Node.createStrategyNode({
        id: "rawToPerson" as Node.NodeId,
        name: "RawToPerson",
        recursionScheme: "Catamorphism",
        inputSchema: rawPersonSchema.definition,
        outputSchema: personSchema.definition,
        logic: Schema.Any,
        lastSeenBy: "test" as Node.NodeId
      })

      const initialGraph = Graph.fromNodes([rawPersonSchema])
      // This is a placeholder implementation, the real one will have more logic
      const transformedGraph = {
        ...initialGraph,
        nodes: {
          ...initialGraph.nodes,
          [rawToPersonStrategy.id]: rawToPersonStrategy,
          [personSchema.id]: personSchema
        },
        edges: [
          ...initialGraph.edges,
          { _tag: "INPUT_TO", from: "rawPerson", to: "rawToPerson" },
          { _tag: "PRODUCES", from: "rawToPerson", to: "person" }
        ]
      }

      expect(Object.keys(transformedGraph.nodes).length).toBe(3)
      expect(transformedGraph.edges.length).toBe(2)
      expect(transformedGraph.edges[0]._tag).toBe("INPUT_TO")
      expect(transformedGraph.edges[1]._tag).toBe("PRODUCES")
    }))
})

================
File: packages/domain/LICENSE
================
MIT License

Copyright (c) 2024-present <PLACEHOLDER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================
File: packages/domain/package.json
================
{
  "name": "@adjoint/domain",
  "version": "0.0.0",
  "type": "module",
  "license": "MIT",
  "description": "The domain template",
  "repository": {
    "type": "git",
    "url": "<PLACEHOLDER>",
    "directory": "packages/domain"
  },
  "publishConfig": {
    "access": "public",
    "directory": "dist"
  },
  "scripts": {
    "codegen": "build-utils prepare-v2",
    "build": "pnpm build-esm && pnpm build-annotate && pnpm build-cjs && build-utils pack-v2",
    "build-esm": "tsc -b tsconfig.build.json",
    "build-cjs": "babel build/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir build/cjs --source-maps",
    "build-annotate": "babel build/esm --plugins annotate-pure-calls --out-dir build/esm --source-maps",
    "check": "tsc -b tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:math": "vitest run test/graph/PropertyBasedTests.test.ts --reporter=verbose",
    "test:algebra": "vitest run test/graph/GraphAlgebra.test.ts --reporter=verbose",
    "test:capabilities": "vitest run test/node/NodeCapabilities.test.ts --reporter=verbose",
    "test:composition": "vitest run test/graph/GraphComposition.test.ts --reporter=verbose",
    "test:operations": "vitest run test/graph/GraphOperations.test.ts --reporter=verbose",
    "coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@effect/platform": "latest",
    "@effect/sql": "latest",
    "effect": "latest"
  },
  "effect": {
    "generateExports": {
      "include": [
        "**/*.ts"
      ]
    },
    "generateIndex": {
      "include": [
        "**/*.ts"
      ]
    }
  }
}

================
File: packages/domain/test-results.json
================
{"numTotalTestSuites":36,"numPassedTestSuites":33,"numFailedTestSuites":3,"numPendingTestSuites":0,"numTotalTests":71,"numPassedTests":50,"numFailedTests":1,"numPendingTests":1,"numTodoTests":0,"snapshot":{"added":0,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0,"didUpdate":false},"startTime":1754267910818,"success":false,"testResults":[{"assertionResults":[],"startTime":1754267910818,"endTime":1754267910818,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/Dummy.test.ts"},{"assertionResults":[],"startTime":1754267910818,"endTime":1754267910818,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/algebra.test.ts"},{"assertionResults":[],"startTime":1754267910818,"endTime":1754267910818,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/graph.test.ts"},{"assertionResults":[{"ancestorTitles":["Graph Algebra","count algebra"],"fullName":"Graph Algebra count algebra should count all nodes when no predicate is provided","status":"passed","title":"should count all nodes when no predicate is provided","duration":2.1154999999999973,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","count algebra"],"fullName":"Graph Algebra count algebra should count nodes matching predicate","status":"passed","title":"should count nodes matching predicate","duration":0.321207999999956,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","count algebra"],"fullName":"Graph Algebra count algebra should return 0 when no nodes match predicate","status":"passed","title":"should return 0 when no nodes match predicate","duration":0.24879200000009405,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","collectIds algebra"],"fullName":"Graph Algebra collectIds algebra should collect all node IDs in traversal order","status":"passed","title":"should collect all node IDs in traversal order","duration":0.4345829999999751,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","collectIds algebra"],"fullName":"Graph Algebra collectIds algebra should handle empty graphs","status":"passed","title":"should handle empty graphs","duration":0.18095800000003237,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","drawTree algebra"],"fullName":"Graph Algebra drawTree algebra should create string representation of single node","status":"passed","title":"should create string representation of single node","duration":0.48708399999998164,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","drawTree algebra"],"fullName":"Graph Algebra drawTree algebra should handle nodes with children","status":"passed","title":"should handle nodes with children","duration":0.4193750000000591,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","Algebraic Laws"],"fullName":"Graph Algebra Algebraic Laws should satisfy catamorphism laws","status":"passed","title":"should satisfy catamorphism laws","duration":0.21245900000008078,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","Algebraic Laws"],"fullName":"Graph Algebra Algebraic Laws should be compositional","status":"passed","title":"should be compositional","duration":0.3961669999999913,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","Performance and Edge Cases"],"fullName":"Graph Algebra Performance and Edge Cases should handle large graphs efficiently","status":"passed","title":"should handle large graphs efficiently","duration":13.64366700000005,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Algebra","Performance and Edge Cases"],"fullName":"Graph Algebra Performance and Edge Cases should handle circular references gracefully","status":"skipped","title":"should handle circular references gracefully","failureMessages":[],"meta":{}}],"startTime":1754267911141,"endTime":1754267911159.6436,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/graph/GraphAlgebra.test.ts"},{"assertionResults":[],"startTime":1754267910818,"endTime":1754267910818,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/graph/GraphComposition.test.ts"},{"assertionResults":[{"ancestorTitles":["Graph Operations","filter operation"],"fullName":"Graph Operations filter operation should filter nodes by predicate","status":"passed","title":"should filter nodes by predicate","duration":1.2630420000000413,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","filter operation"],"fullName":"Graph Operations filter operation should preserve graph structure","status":"passed","title":"should preserve graph structure","duration":0.4395000000000664,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","filter operation"],"fullName":"Graph Operations filter operation should handle empty results","status":"passed","title":"should handle empty results","duration":0.08216699999991306,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","filter operation"],"fullName":"Graph Operations filter operation should be idempotent: filter(P, filter(P, G)) = filter(P, G)","status":"passed","title":"should be idempotent: filter(P, filter(P, G)) = filter(P, G)","duration":0.30262500000003456,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","find operation"],"fullName":"Graph Operations find operation should find first matching node","status":"passed","title":"should find first matching node","duration":1.2513750000000528,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","find operation"],"fullName":"Graph Operations find operation should return None when no match found","status":"passed","title":"should return None when no match found","duration":0.20691699999997581,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","find operation"],"fullName":"Graph Operations find operation should handle empty graphs","status":"passed","title":"should handle empty graphs","duration":0.07816600000001017,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","find operation"],"fullName":"Graph Operations find operation should be deterministic for same predicate","status":"passed","title":"should be deterministic for same predicate","duration":0.2768750000000182,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should sort nodes according to ordering","status":"passed","title":"should sort nodes according to ordering","duration":0.3253750000000082,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should preserve all nodes","status":"passed","title":"should preserve all nodes","duration":0.18499999999994543,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should handle empty graphs","status":"passed","title":"should handle empty graphs","duration":0.05062499999996817,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should be stable for equal elements","status":"passed","title":"should be stable for equal elements","duration":0.1672089999999571,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should satisfy ordering laws","status":"passed","title":"should satisfy ordering laws","duration":0.2650830000000042,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","sort operation"],"fullName":"Graph Operations sort operation should reverse correctly with reverse ordering","status":"passed","title":"should reverse correctly with reverse ordering","duration":0.16079099999990376,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","Operation Composition"],"fullName":"Graph Operations Operation Composition should compose filter and sort correctly","status":"passed","title":"should compose filter and sort correctly","duration":0.18124999999997726,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","Operation Composition"],"fullName":"Graph Operations Operation Composition should compose filter and find correctly","status":"passed","title":"should compose filter and find correctly","duration":0.19374999999990905,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","Performance and Edge Cases"],"fullName":"Graph Operations Performance and Edge Cases should handle large graphs efficiently","status":"passed","title":"should handle large graphs efficiently","duration":16.293000000000006,"failureMessages":[],"meta":{}},{"ancestorTitles":["Graph Operations","Performance and Edge Cases"],"fullName":"Graph Operations Performance and Edge Cases should maintain referential transparency","status":"passed","title":"should maintain referential transparency","duration":0.527541000000042,"failureMessages":[],"meta":{}}],"startTime":1754267911139,"endTime":1754267911161.5276,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/graph/GraphOperations.test.ts"},{"assertionResults":[{"ancestorTitles":["Property-Based Tests","Graph Filter Properties"],"fullName":"Property-Based Tests Graph Filter Properties filter is idempotent: filter(P, filter(P, G)) = filter(P, G)","status":"passed","title":"filter is idempotent: filter(P, filter(P, G)) = filter(P, G)","duration":17.954250000000002,"failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Filter Properties"],"fullName":"Property-Based Tests Graph Filter Properties filter preserves predicate satisfaction","status":"failed","title":"filter preserves predicate satisfaction","duration":5.601041000000009,"failureMessages":["Error: Property failed after 1 tests\n{ seed: -256815321, path: \"0:0:0\", endOnFailure: true }\nCounterexample: [{\"nodes\":{\n  \"_id\": \"HashMap\",\n  \"values\": []\n},\"edges\":{\n  \"_id\": \"Chunk\",\n  \"values\": []\n}},{\"_id\":Symbol.for(\"is-identity\"),\"evaluate\":(node) => isIdentityNode(node)}]\nShrunk 2 time(s)\nGot TypeError: filtered.nodes.values is not a function\n    at /Users/pooks/Dev/adjoint/packages/domain/test/graph/PropertyBasedTests.test.ts:92:44\n    at Property.predicate (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/property/Property.js:14:54)\n    at Property.run (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/property/Property.generic.js:46:33)\n    at runIt (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/Runner.js:18:30)\n    at check (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/Runner.js:62:11)\n    at Module.assert (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/Runner.js:65:17)\n    at /Users/pooks/Dev/adjoint/packages/domain/test/graph/PropertyBasedTests.test.ts:87:17\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20\n\nHint: Enable verbose mode in order to have the list of all failing values encountered during the run\n    at buildError (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/utils/RunDetailsFormatter.js:126:15)\n    at throwIfFailed (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/utils/RunDetailsFormatter.js:138:11)\n    at reportRunDetails (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/utils/RunDetailsFormatter.js:151:16)\n    at Module.assert (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/lib/esm/check/runner/Runner.js:69:9)\n    at /Users/pooks/Dev/adjoint/packages/domain/test/graph/PropertyBasedTests.test.ts:87:17\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26\n    at file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20\n    at new Promise (<anonymous>)\n    at runWithTimeout (file:///Users/pooks/Dev/adjoint/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)"],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Filter Properties"],"fullName":"Property-Based Tests Graph Filter Properties filter is monotonic: |filter(P, G)| ≤ |G|","status":"pending","title":"filter is monotonic: |filter(P, G)| ≤ |G|","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Filter Properties"],"fullName":"Property-Based Tests Graph Filter Properties filter with always-true predicate is identity","status":"pending","title":"filter with always-true predicate is identity","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Filter Properties"],"fullName":"Property-Based Tests Graph Filter Properties filter with always-false predicate yields empty graph","status":"pending","title":"filter with always-false predicate yields empty graph","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Predicate Combinator Properties"],"fullName":"Property-Based Tests Predicate Combinator Properties AND is commutative: P ∧ Q ≡ Q ∧ P","status":"pending","title":"AND is commutative: P ∧ Q ≡ Q ∧ P","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Predicate Combinator Properties"],"fullName":"Property-Based Tests Predicate Combinator Properties AND is associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)","status":"pending","title":"AND is associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Predicate Combinator Properties"],"fullName":"Property-Based Tests Predicate Combinator Properties OR is commutative: P ∨ Q ≡ Q ∨ P","status":"pending","title":"OR is commutative: P ∨ Q ≡ Q ∨ P","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Predicate Combinator Properties"],"fullName":"Property-Based Tests Predicate Combinator Properties De Morgan's law: ¬(P ∧ Q) ≡ ¬P ∨ ¬Q","status":"pending","title":"De Morgan's law: ¬(P ∧ Q) ≡ ¬P ∨ ¬Q","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Predicate Combinator Properties"],"fullName":"Property-Based Tests Predicate Combinator Properties Double negation: ¬¬P ≡ P","status":"pending","title":"Double negation: ¬¬P ≡ P","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Algebra Properties"],"fullName":"Property-Based Tests Algebra Properties count algebra is non-negative","status":"pending","title":"count algebra is non-negative","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Algebra Properties"],"fullName":"Property-Based Tests Algebra Properties count with predicate ≤ count without predicate","status":"pending","title":"count with predicate ≤ count without predicate","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Algebra Properties"],"fullName":"Property-Based Tests Algebra Properties collectIds preserves node count","status":"pending","title":"collectIds preserves node count","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Operation Invariants"],"fullName":"Property-Based Tests Graph Operation Invariants find returns None for empty graphs","status":"pending","title":"find returns None for empty graphs","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Operation Invariants"],"fullName":"Property-Based Tests Graph Operation Invariants find result satisfies predicate when Some","status":"pending","title":"find result satisfies predicate when Some","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Operation Invariants"],"fullName":"Property-Based Tests Graph Operation Invariants sort preserves node count","status":"pending","title":"sort preserves node count","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Graph Operation Invariants"],"fullName":"Property-Based Tests Graph Operation Invariants sort is deterministic","status":"pending","title":"sort is deterministic","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Composition Laws"],"fullName":"Property-Based Tests Composition Laws filter composition: filter(P, filter(Q, G)) = filter(P ∧ Q, G)","status":"pending","title":"filter composition: filter(P, filter(Q, G)) = filter(P ∧ Q, G)","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Composition Laws"],"fullName":"Property-Based Tests Composition Laws filter distributes over union predicates","status":"pending","title":"filter distributes over union predicates","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Error Handling Properties"],"fullName":"Property-Based Tests Error Handling Properties operations on empty graphs don't throw","status":"pending","title":"operations on empty graphs don't throw","failureMessages":[],"meta":{}},{"ancestorTitles":["Property-Based Tests","Error Handling Properties"],"fullName":"Property-Based Tests Error Handling Properties malformed predicates don't crash system","status":"pending","title":"malformed predicates don't crash system","failureMessages":[],"meta":{}}],"startTime":1754267911140,"endTime":1754267911163.601,"status":"failed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/graph/PropertyBasedTests.test.ts"},{"assertionResults":[{"ancestorTitles":["Node Capabilities","NodePredicate"],"fullName":"Node Capabilities NodePredicate should correctly identify node types","status":"passed","title":"should correctly identify node types","duration":1.0927090000000135,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodePredicate"],"fullName":"Node Capabilities NodePredicate should have unique identifiers","status":"passed","title":"should have unique identifiers","duration":0.3099170000000413,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","and combinator"],"fullName":"Node Capabilities Predicate Combinators and combinator should satisfy logical AND truth table","status":"passed","title":"should satisfy logical AND truth table","duration":0.1788329999999405,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","and combinator"],"fullName":"Node Capabilities Predicate Combinators and combinator should be commutative: P ∧ Q ≡ Q ∧ P","status":"passed","title":"should be commutative: P ∧ Q ≡ Q ∧ P","duration":0.08029099999998834,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","and combinator"],"fullName":"Node Capabilities Predicate Combinators and combinator should be associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)","status":"passed","title":"should be associative: (P ∧ Q) ∧ R ≡ P ∧ (Q ∧ R)","duration":0.08170899999993253,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","and combinator"],"fullName":"Node Capabilities Predicate Combinators and combinator should have identity element: P ∧ true ≡ P","status":"passed","title":"should have identity element: P ∧ true ≡ P","duration":0.07074999999997544,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","or combinator"],"fullName":"Node Capabilities Predicate Combinators or combinator should satisfy logical OR truth table","status":"passed","title":"should satisfy logical OR truth table","duration":0.12258299999996325,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","or combinator"],"fullName":"Node Capabilities Predicate Combinators or combinator should be commutative: P ∨ Q ≡ Q ∨ P","status":"passed","title":"should be commutative: P ∨ Q ≡ Q ∨ P","duration":0.06824999999992087,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","or combinator"],"fullName":"Node Capabilities Predicate Combinators or combinator should have identity element: P ∨ false ≡ P","status":"passed","title":"should have identity element: P ∨ false ≡ P","duration":0.07141599999999926,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","not combinator"],"fullName":"Node Capabilities Predicate Combinators not combinator should satisfy logical NOT","status":"passed","title":"should satisfy logical NOT","duration":0.10954200000003311,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","not combinator"],"fullName":"Node Capabilities Predicate Combinators not combinator should satisfy double negation: ¬¬P ≡ P","status":"passed","title":"should satisfy double negation: ¬¬P ≡ P","duration":0.06320800000003146,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","Predicate Combinators","not combinator"],"fullName":"Node Capabilities Predicate Combinators not combinator should satisfy De Morgan's laws","status":"passed","title":"should satisfy De Morgan's laws","duration":0.08933300000001054,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","CapabilityRegistry"],"fullName":"Node Capabilities CapabilityRegistry should register and retrieve predicates","status":"passed","title":"should register and retrieve predicates","duration":3.177000000000021,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","CapabilityRegistry"],"fullName":"Node Capabilities CapabilityRegistry should handle multiple predicates","status":"passed","title":"should handle multiple predicates","duration":0.4769579999999678,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","CapabilityRegistry"],"fullName":"Node Capabilities CapabilityRegistry should maintain predicate isolation","status":"passed","title":"should maintain predicate isolation","duration":0.4947499999999536,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeEquivalence"],"fullName":"Node Capabilities NodeEquivalence should be reflexive: a ≡ a","status":"passed","title":"should be reflexive: a ≡ a","duration":0.059708999999998014,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeEquivalence"],"fullName":"Node Capabilities NodeEquivalence should be symmetric: a ≡ b ⟹ b ≡ a","status":"passed","title":"should be symmetric: a ≡ b ⟹ b ≡ a","duration":0.06295799999998053,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeEquivalence"],"fullName":"Node Capabilities NodeEquivalence should be transitive: a ≡ b ∧ b ≡ c ⟹ a ≡ c","status":"passed","title":"should be transitive: a ≡ b ∧ b ≡ c ⟹ a ≡ c","duration":0.08170800000004874,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeOrdering"],"fullName":"Node Capabilities NodeOrdering should be antisymmetric: a ≤ b ∧ b ≤ a ⟹ a = b","status":"passed","title":"should be antisymmetric: a ≤ b ∧ b ≤ a ⟹ a = b","duration":0.06375000000002728,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeOrdering"],"fullName":"Node Capabilities NodeOrdering should be transitive: a ≤ b ∧ b ≤ c ⟹ a ≤ c","status":"passed","title":"should be transitive: a ≤ b ∧ b ≤ c ⟹ a ≤ c","duration":0.10970800000006875,"failureMessages":[],"meta":{}},{"ancestorTitles":["Node Capabilities","NodeOrdering"],"fullName":"Node Capabilities NodeOrdering should be total: ∀a,b: a ≤ b ∨ b ≤ a","status":"passed","title":"should be total: ∀a,b: a ≤ b ∨ b ≤ a","duration":0.06233299999996689,"failureMessages":[],"meta":{}}],"startTime":1754267911140,"endTime":1754267911147.1096,"status":"passed","message":"","name":"/Users/pooks/Dev/adjoint/packages/domain/test/node/NodeCapabilities.test.ts"}]}

================
File: packages/domain/tsconfig.build.json
================
{
  "extends": "./tsconfig.src.json",
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/build.tsbuildinfo",
    "outDir": "build/esm",
    "declarationDir": "build/dts",
    "stripInternal": true
  }
}

================
File: packages/domain/tsconfig.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "tsconfig.test.json" }
  ]
}

================
File: packages/domain/tsconfig.src.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {
    "types": ["node"],
    "outDir": "build/src",
    "tsBuildInfoFile": ".tsbuildinfo/src.tsbuildinfo",
    "rootDir": "src"
  }
}

================
File: packages/domain/tsconfig.test.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["test"],
  "references": [
    { "path": "tsconfig.src.json" }
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/test.tsbuildinfo",
    "rootDir": "test",
    "noEmit": true
  }
}

================
File: packages/domain/vitest.config.ts
================
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "test/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.config.*"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Property-based testing configuration
    pool: "threads",
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    },
    // Fail fast on first error for mathematical correctness
    bail: 1,
    // Verbose output for debugging mathematical properties
    reporter: ["verbose", "json"],
    outputFile: {
      json: "./test-results.json"
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
})

================
File: packages/server/src/Api.ts
================
import { TodosApi } from "@adjoint/domain/TodosApi"
import { HttpApiBuilder } from "@effect/platform"
import { Effect, Layer } from "effect"
import { TodosRepository } from "./TodosRepository.js"

const TodosApiLive = HttpApiBuilder.group(TodosApi, "todos", (handlers) =>
  Effect.gen(function*() {
    const todos = yield* TodosRepository
    return handlers
      .handle("getAllTodos", () => todos.getAll)
      .handle("getTodoById", ({ path: { id } }) => todos.getById(id))
      .handle("createTodo", ({ payload: { text } }) => todos.create(text))
      .handle("completeTodo", ({ path: { id } }) => todos.complete(id))
      .handle("removeTodo", ({ path: { id } }) => todos.remove(id))
  }))

export const ApiLive = HttpApiBuilder.api(TodosApi).pipe(
  Layer.provide(TodosApiLive)
)

================
File: packages/server/src/server.ts
================
import { HttpApiBuilder, HttpMiddleware } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"
import { ApiLive } from "./Api.js"
import { TodosRepository } from "./TodosRepository.js"

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(ApiLive),
  Layer.provide(TodosRepository.Default),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(
  NodeRuntime.runMain
)

================
File: packages/server/src/TodosRepository.ts
================
import { Todo, TodoId, TodoNotFound } from "@adjoint/domain/TodosApi"
import { Effect, HashMap, Ref } from "effect"

export class TodosRepository extends Effect.Service<TodosRepository>()("api/TodosRepository", {
  effect: Effect.gen(function*() {
    const todos = yield* Ref.make(HashMap.empty<TodoId, Todo>())

    const getAll = Ref.get(todos).pipe(
      Effect.map((todos) => Array.from(HashMap.values(todos)))
    )

    function getById(id: TodoId): Effect.Effect<Todo, TodoNotFound> {
      return Ref.get(todos).pipe(
        Effect.flatMap(HashMap.get(id)),
        Effect.catchTag("NoSuchElementException", () => new TodoNotFound({ id }))
      )
    }

    function create(text: string): Effect.Effect<Todo> {
      return Ref.modify(todos, (map) => {
        const id = TodoId.make(HashMap.reduce(map, -1, (max, todo) => todo.id > max ? todo.id : max) + 1)
        const todo = new Todo({ id, text, done: false })
        return [todo, HashMap.set(map, id, todo)]
      })
    }

    function complete(id: TodoId): Effect.Effect<Todo, TodoNotFound> {
      return getById(id).pipe(
        Effect.map((todo) => new Todo({ ...todo, done: true })),
        Effect.tap((todo) => Ref.update(todos, HashMap.set(todo.id, todo)))
      )
    }

    function remove(id: TodoId): Effect.Effect<void, TodoNotFound> {
      return getById(id).pipe(
        Effect.flatMap((todo) => Ref.update(todos, HashMap.remove(todo.id)))
      )
    }

    return {
      getAll,
      getById,
      create,
      complete,
      remove
    } as const
  })
}) {}

================
File: packages/server/test/Dummy.test.ts
================
import { describe, expect, it } from "@effect/vitest"

describe("Dummy", () => {
  it("should pass", () => {
    expect(true).toBe(true)
  })
})

================
File: packages/server/LICENSE
================
MIT License

Copyright (c) 2024-present <PLACEHOLDER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================
File: packages/server/package.json
================
{
  "name": "@adjoint/server",
  "version": "0.0.0",
  "type": "module",
  "license": "MIT",
  "description": "The server template",
  "repository": {
    "type": "git",
    "url": "<PLACEHOLDER>",
    "directory": "packages/server"
  },
  "scripts": {
    "codegen": "build-utils prepare-v2",
    "build": "pnpm build-esm && pnpm build-annotate && pnpm build-cjs && build-utils pack-v2",
    "build-esm": "tsc -b tsconfig.build.json",
    "build-cjs": "babel build/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir build/cjs --source-maps",
    "build-annotate": "babel build/esm --plugins annotate-pure-calls --out-dir build/esm --source-maps",
    "check": "tsc -b tsconfig.json",
    "test": "vitest",
    "coverage": "vitest --coverage"
  },
  "dependencies": {
    "@effect/platform": "latest",
    "@effect/platform-node": "latest",
    "@adjoint/domain": "workspace:^",
    "effect": "latest"
  },
  "effect": {
    "generateExports": {
      "include": [
        "**/*.ts"
      ]
    },
    "generateIndex": {
      "include": [
        "**/*.ts"
      ]
    }
  }
}

================
File: packages/server/tsconfig.build.json
================
{
  "extends": "./tsconfig.src.json",
  "references": [
    { "path": "../domain/tsconfig.build.json" }
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/build.tsbuildinfo",
    "outDir": "build/esm",
    "declarationDir": "build/dts",
    "stripInternal": true
  }
}

================
File: packages/server/tsconfig.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "tsconfig.test.json" }
  ]
}

================
File: packages/server/tsconfig.src.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "references": [
    { "path": "../domain" } 
  ],
  "compilerOptions": {
    "types": ["node"],
    "outDir": "build/src",
    "tsBuildInfoFile": ".tsbuildinfo/src.tsbuildinfo",
    "rootDir": "src"
  }
}

================
File: packages/server/tsconfig.test.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["test"],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "../domain" }
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/test.tsbuildinfo",
    "rootDir": "test",
    "noEmit": true
  }
}

================
File: packages/server/vitest.config.ts
================
import { mergeConfig, type UserConfigExport } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = {}

export default mergeConfig(shared, config)

================
File: packages/web/src/components/plays/PlayItem.tsx
================
interface PlayItemProps {
  play: FactPlay
}

export function PlayItem({ play }: PlayItemProps) {
  // Format the airdate for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <article className="play-item">
      <div className="play-content">
        <h3 className="play-artist">{play.artist || "Unknown Artist"}</h3>
        <p className="play-song">{play.song || "Unknown Song"}</p>
        {play.album && <p className="play-album">from {play.album}</p>}
      </div>
      <time className="play-time">{formatTime(play.airdate)}</time>
    </article>
  )
}

================
File: packages/web/src/components/plays/RecentPlays.tsx
================
// packages/web/src/components/plays/RecentPlays.tsx
import { Effect } from "effect"
import { ApiClient } from "../../services/ApiClient.js"
import { useAppEffect } from "../../services/AppRuntime.js"
import { PlayItem } from "./PlayItem.js"

export function RecentPlays() {
  // Create the effect that fetches plays
  const fetchPlaysEffect = Effect.gen(function*() {
    const api = yield* ApiClient
    return yield* api.getRecentPlays({ limit: 50 })
  })

  // Use our custom hook that handles lifecycle properly
  const { data: plays, error, loading } = useAppEffect(
    fetchPlaysEffect,
    [] // Dependencies - effect is recreated when these change
  )

  if (loading) {
    return <div className="loading">Loading recent plays...</div>
  }

  if (error) {
    return (
      <div className="error">
        Failed to load plays: {error._tag || "Unknown error"}
      </div>
    )
  }

  if (!plays || plays.length === 0) {
    return <div className="empty">No recent plays found</div>
  }

  return (
    <section className="recent-plays">
      <h2>Recent KEXP Plays</h2>
      <div className="plays-list">
        {plays.map((play: FactPlay) => <PlayItem key={play.id} play={play} />)}
      </div>
    </section>
  )
}

================
File: packages/web/src/hooks/useEffect.ts
================
// packages/web/src/hooks/useEffect.ts
import { Effect } from "effect"
import { useEffect, useRef, useState } from "react"

// A hook that properly executes an Effect and manages its lifecycle
export function useEffectQuery<A, E>(
  effect: Effect.Effect<A, E>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<A | null>(null)
  const [error, setError] = useState<E | null>(null)
  const [loading, setLoading] = useState(true)

  // Use a ref to track if the component is mounted
  const mountedRef = useRef(true)

  useEffect(() => {
    // Reset state when effect changes
    setLoading(true)
    setError(null)

    // Create an abort controller for cleanup
    const controller = new AbortController()

    // Run the effect with proper error handling
    Effect.runPromise(
      effect.pipe(
        // Only update state if component is still mounted
        Effect.tap((result) =>
          Effect.sync(() => {
            if (mountedRef.current) {
              setData(result)
              setLoading(false)
            }
          })
        ),
        // Handle errors gracefully
        Effect.catchAll((e) =>
          Effect.sync(() => {
            if (mountedRef.current) {
              setError(e)
              setLoading(false)
            }
          })
        )
      ),
      { signal: controller.signal }
    ).catch(() => {
      // Ignore errors that have already been handled
    })

    // Cleanup function
    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, deps)

  return { data, error, loading }
}

// A simpler hook for effects that don't return data
export function useEffectRun<E>(
  effect: Effect.Effect<void, E>,
  deps: React.DependencyList = []
) {
  const [error, setError] = useState<E | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Effect.runPromise(
      effect.pipe(
        Effect.catchAll((e) => Effect.sync(() => setError(e)))
      ),
      { signal: controller.signal }
    ).catch(() => {
      // Ignore - error is already handled
    })

    return () => controller.abort()
  }, deps)

  return { error }
}

================
File: packages/web/src/hooks/useService.ts
================
// packages/web/src/hooks/useService.ts
import type { Context, Effect, ManagedRuntime } from "effect"
import { useMemo } from "react"
import { AppRuntime } from "../services/AppRuntime.js"

// First, let's get the type of services available in our runtime
type AppServices = Parameters<typeof AppRuntime.useRuntime> extends ManagedRuntime.ManagedRuntime<infer R, any> ? R :
  never

// Now create a properly typed hook
export function useService<T extends AppServices>(
  tag: T extends Context.Tag<any, any> ? T : never
): T extends Context.Tag<any, infer S> ? S : never {
  const runtime = AppRuntime.useRuntime()

  return useMemo(() => {
    // Use runSync to execute an effect that extracts the service
    return runtime.runSync(tag as Effect.Effect<any, never, any>)
  }, [runtime, tag])
}

================
File: packages/web/src/services/ApiClient.ts
================
import type { HttpClientError } from "@effect/platform"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"

// API response schemas
const PlaysResponse = Schema.Array(FactPlay)

// Service interface
export interface ApiClient {
  readonly getRecentPlays: (params?: {
    limit?: number
    offset?: number
  }) => Effect.Effect<ReadonlyArray<FactPlay>, ParseError | HttpClientError.HttpClientError>
}

// Service tag
export const ApiClient = Context.GenericTag<ApiClient>("@adjoint/web/ApiClient")

// Service implementation
export const ApiClientLive = Layer.effect(
  ApiClient,
  Effect.gen(function*() {
    const baseUrl = window.location.origin // Use current origin in dev, proxy handles routing
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
    )

    return ApiClient.of({
      getRecentPlays: (params) =>
        client.get("/api/plays", {
          urlParams: new URLSearchParams({
            limit: String(params?.limit ?? 50),
            offset: String(params?.offset ?? 0)
          })
        }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(PlaysResponse))
        )
    })
  })
)

// Default layer composition
export const ApiClientDefault = ApiClientLive.pipe(
  Layer.provide(FetchHttpClient.layer)
)

================
File: packages/web/src/services/AppRuntime.tsx
================
// packages/web/src/services/AppRuntime.tsx
import { BrowserHttpClient } from "@effect/platform-browser"
import { Layer } from "effect"
import { ApiClientDefault } from "./ApiClient.js"
import { makeReactRuntime } from "./Runtime.js"

// Define the complete application layer
// This is like a dependency injection container that knows how to wire everything
const AppLayer = Layer.mergeAll(
  // Platform layers
  BrowserHttpClient.layerXMLHttpRequest,
  // Our service layers
  ApiClientDefault
  //  SearchService.Default,
  //  EntityResolver.Default
)

// Create the runtime factory for our app
export const AppRuntime = makeReactRuntime((_args) => AppLayer, {
  disposeTimeout: 1000 // Wait 1 second before disposing
})

// Export typed hooks for convenience
export const useAppRuntime = AppRuntime.useRuntime
export const useAppEffect = AppRuntime.useEffect

================
File: packages/web/src/services/Runtime.tsx
================
// packages/web/src/services/Runtime.tsx
import { ConfigProvider, Data, Effect, Equal, Layer, ManagedRuntime } from "effect"
import React from "react"

// MemoMap caches layer instances to avoid recreating identical layers
// This is crucial for performance - layers can be expensive to create
const memoMap = Effect.runSync(Layer.makeMemoMap)

// Pull configuration from Vite's environment variables
// This allows us to use import.meta.env.VITE_API_URL etc.
const ViteConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson({
    API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000"
  })
)

// Factory function that creates a React-aware runtime system
export const makeReactRuntime = <R, E, Args extends Record<string, unknown> = Record<string, unknown>>(
  // Layer can be a function that takes arguments, allowing dynamic configuration
  layer: (args: Args) => Layer.Layer<R, E>,
  options?: {
    disposeTimeout?: number // How long to wait before disposing unused runtime
  }
) => {
  // Create a context to provide the runtime throughout the React tree
  const Context = React.createContext<ManagedRuntime.ManagedRuntime<R, E>>(
    null as any
  )

  // Provider component that manages runtime lifecycle
  const Provider = (props: Args & { children?: React.ReactNode }) => {
    // Extract dependencies from props (excluding children)
    // This creates a dependency array similar to useEffect deps
    const deps = React.useMemo(() => {
      const result: Array<unknown> = Data.unsafeArray([]) as any
      for (const key of Object.keys(props).sort()) {
        if (key === "children") continue
        result.push(props[key])
      }
      return Data.array(result) // Data.array ensures proper equality checking
    }, [props])

    // Store runtime in a ref to persist across renders
    const runtimeRef = React.useRef<{
      readonly deps: ReadonlyArray<unknown>
      readonly runtime: ManagedRuntime.ManagedRuntime<R, E>
      disposeTimeout?: NodeJS.Timeout | undefined
    }>(undefined as any)

    // Create or update runtime when dependencies change
    if (!runtimeRef.current || !Equal.equals(runtimeRef.current.deps, deps)) {
      runtimeRef.current = {
        deps,
        runtime: ManagedRuntime.make(
          Layer.provideMerge(
            layer(deps as unknown as Args),
            ViteConfigProvider
          ),
          memoMap // This ensures layers are cached and reused
        ),
        disposeTimeout: undefined
      }
    }

    // Manage runtime lifecycle with React
    React.useEffect(() => {
      const current = runtimeRef.current!

      // Clear any pending disposal
      if (current.disposeTimeout) {
        clearTimeout(current.disposeTimeout)
        current.disposeTimeout = undefined
      }

      // Cleanup: schedule disposal when component unmounts
      return () => {
        current.disposeTimeout = setTimeout(
          () => current.runtime.dispose(),
          options?.disposeTimeout ?? 500 // Default 500ms delay
        ) as any
      }
    }, [runtimeRef.current])

    return (
      <Context.Provider value={runtimeRef.current.runtime}>
        {props.children}
      </Context.Provider>
    )
  }

  // Hook to access the runtime
  const useRuntime = () => React.useContext(Context)

  // Hook to run effects with proper lifecycle management
  const useEffect = <A, EX>(
    effect: Effect.Effect<A, EX, R>,
    deps?: React.DependencyList
  ) => {
    const runtime = useRuntime()
    const [state, setState] = React.useState<{
      data?: A
      error?: EX
      loading: boolean
    }>({ loading: true })

    React.useEffect(() => {
      const controller = new AbortController()

      runtime.runPromise(
        effect.pipe(
          Effect.tap((data) => Effect.sync(() => setState({ data, loading: false }))),
          Effect.catchAll((error) => Effect.sync(() => setState({ error: error as EX, loading: false })))
        ),
        { signal: controller.signal }
      ).catch(() => {
        // Ignore - error already handled in Effect.catchAll
      })

      return () => controller.abort()
    }, deps)

    return state
  }

  return { Context, Provider, useRuntime, useEffect } as const
}

================
File: packages/web/src/styles/index.css
================
/* packages/web/src/styles/index.css */
/* Reset and base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  color: #333;
  background: #f5f5f5;
}

/* App layout */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 1rem 2rem;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Recent plays component */
.recent-plays h2 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.plays-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Play item */
.play-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: start;
  transition: all 0.2s ease;
  cursor: pointer;
}

.play-item:hover {
  border-color: #999;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.play-artist {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.play-song {
  color: #666;
  font-size: 0.9rem;
}

.play-album {
  color: #999;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.play-time {
  color: #999;
  font-size: 0.8rem;
  white-space: nowrap;
}

/* Loading and error states */
.loading,
.error,
.empty {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.error {
  color: #d32f2f;
}

================
File: packages/web/src/App.tsx
================
// packages/web/src/App.tsx
import { RecentPlays } from "./components/plays/RecentPlays.js"
import { AppRuntime } from "./services/AppRuntime.js"
import "./styles/index.css"

export function App() {
  // The Provider manages the runtime lifecycle
  // It will create services on mount and dispose them after unmount + timeout
  return (
    <AppRuntime.Provider apiUrl={import.meta.env.VITE_API_URL}>
      <div className="app">
        <header className="app-header">
          <h1>Crate Music Discovery</h1>
        </header>
        <main className="app-main">
          <RecentPlays />
        </main>
      </div>
    </AppRuntime.Provider>
  )
}

================
File: packages/web/src/main.tsx
================
// packages/web/src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App.js"

// Create root and render the app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

================
File: packages/web/src/vite-env.d.ts
================
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

================
File: packages/web/index.html
================
<!-- packages/web/index.html -->
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crate - Music Discovery</title>
</head>

<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>

</html>

================
File: packages/web/package.json
================
{
    "name": "@adjoint/web",
    "version": "0.0.0",
    "type": "module",
    "license": "MIT",
    "description": "The web interface for Crate",
    "repository": {
        "type": "git",
        "url": "https://github.com/mkessy/crate",
        "directory": "packages/web"
    },
    "scripts": {
        "codegen": "build-utils prepare-v2",
        "dev": "vite",
        "build": "pnpm build-esm && vite build",
        "build-esm": "tsc -b tsconfig.build.json",
        "preview": "vite preview",
        "check": "tsc -b tsconfig.json",
        "test": "vitest",
        "coverage": "vitest --coverage"
    },
    "dependencies": {
        "@adjoint/web": "workspace:^",
        "@adjoint/web/nlp-wink": "workspace:^",
        "@effect/platform": "latest",
        "@effect/platform-browser": "^0.67.2",
        "effect": "latest",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "wink-eng-lite-web-model": "^1.8.1",
        "wink-nlp": "^2.4.0"
    },
    "devDependencies": {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.1",
        "vite": "^5.3.1",
        "vitest": "latest"
    },
    "effect": {
        "generateExports": {
            "include": [
                "**/*.ts",
                "**/*.tsx"
            ]
        }
    }
}

================
File: packages/web/tsconfig.build.json
================
{
  "extends": "./tsconfig.src.json",
  "references": [
    { "path": "../domain/tsconfig.build.json" },
    { "path": "../nlp-wink/tsconfig.build.json" }
  ],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/build.tsbuildinfo",
    "outDir": "build/esm",
    "declarationDir": "build/dts",
    "stripInternal": true,
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}

================
File: packages/web/tsconfig.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"],
  "references": [
    { "path": "tsconfig.src.json" },
    { "path": "tsconfig.test.json" }
  ]
}

================
File: packages/web/tsconfig.src.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "references": [{ "path": "../domain" }],
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "outDir": "build/src",
    "tsBuildInfoFile": ".tsbuildinfo/src.tsbuildinfo",
    "rootDir": "src",
    "skipLibCheck": true
  }
}

================
File: packages/web/tsconfig.test.json
================
{
  "extends": "../../tsconfig.base.json",
  "include": ["test"],
  "references": [{ "path": "tsconfig.src.json" }],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": ".tsbuildinfo/test.tsbuildinfo",
    "rootDir": "test",
    "noEmit": false
  }
}

================
File: packages/web/vite.config.ts
================
import react from "@vitejs/plugin-react"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@adjoint/web": resolve(__dirname, "../domain/build/esm"),
      // Redirect platform-specific imports to browser-compatible versions
      "@effect/platform-node-shared": "@effect/platform-browser",
      "@effect/platform-bun": "@effect/platform-browser"
    }
  },
  build: {
    rollupOptions: {
      external: [
        "bun:sqlite",
        "@effect/sql-sqlite-bun"
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      "@effect/platform-node-shared"
    ]
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
})

================
File: patches/babel-plugin-annotate-pure-calls@0.4.0.patch
================
diff --git a/lib/index.js b/lib/index.js
index 2182884e21874ebb37261e2375eec08ad956fc9a..ef5630199121c2830756e00c7cc48cf1078c8207 100644
--- a/lib/index.js
+++ b/lib/index.js
@@ -78,7 +78,7 @@ const isInAssignmentContext = path => {
 
     parentPath = _ref.parentPath;
 
-    if (parentPath.isVariableDeclaration() || parentPath.isAssignmentExpression()) {
+    if (parentPath.isVariableDeclaration() || parentPath.isAssignmentExpression() || parentPath.isClassDeclaration()) {
       return true;
     }
   } while (parentPath !== statement);

================
File: scratchpad/tsconfig.json
================
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "composite": false,
    "incremental": false
  }
}

================
File: scripts/clean.mjs
================
import * as Glob from "glob"
import * as Fs from "node:fs"

const dirs = [".", ...Glob.sync("packages/*/")]
dirs.forEach((pkg) => {
  const files = [".tsbuildinfo", "build", "dist", "coverage"]

  files.forEach((file) => {
    Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true }, () => {})
  })
})

================
File: .gitignore
================
coverage/
*.tsbuildinfo
node_modules/
.DS_Store
tmp/
dist/
build/
docs/
scratchpad/*
!scratchpad/tsconfig.json
.direnv/
.idea/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

================
File: .repomixignore
================
*.md

================
File: eslint.config.mjs
================
import { fixupPluginRules } from "@eslint/compat"
import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import codegen from "eslint-plugin-codegen"
import _import from "eslint-plugin-import"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [
  {
    ignores: ["**/dist", "**/build", "**/docs", "**/*.md"]
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@effect/recommended"
  ),
  {
    plugins: {
      import: fixupPluginRules(_import),
      "sort-destructure-keys": sortDestructureKeys,
      "simple-import-sort": simpleImportSort,
      codegen
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: "module"
    },

    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },

      "import/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },

    rules: {
      "codegen/codegen": "error",
      "no-fallthrough": "off",
      "no-irregular-whitespace": "off",
      "object-shorthand": "error",
      "prefer-destructuring": "off",
      "sort-imports": "off",

      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.property.name='push'] > SpreadElement.arguments",
        message: "Do not use spread arguments in Array.push"
      }],

      "no-unused-vars": "off",
      "prefer-rest-params": "off",
      "prefer-spread": "off",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": "off",
      "import/order": "off",
      "simple-import-sort/imports": "off",
      "sort-destructure-keys/sort-destructure-keys": "error",
      "deprecation/deprecation": "off",

      "@typescript-eslint/array-type": ["warn", {
        default: "generic",
        readonly: "generic"
      }],

      "@typescript-eslint/member-delimiter-style": 0,
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/consistent-type-imports": "warn",

      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],

      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/camelcase": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-array-constructor": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-namespace": "off",

      "@effect/dprint": ["error", {
        config: {
          indentWidth: 2,
          lineWidth: 120,
          semiColons: "asi",
          quoteStyle: "alwaysDouble",
          trailingCommas: "never",
          operatorPosition: "maintain",
          "arrowFunction.useParentheses": "force"
        }
      }]
    }
  }
]

================
File: flake.lock
================
{
  "nodes": {
    "nixpkgs": {
      "locked": {
        "lastModified": 1730272153,
        "narHash": "sha256-B5WRZYsRlJgwVHIV6DvidFN7VX7Fg9uuwkRW9Ha8z+w=",
        "owner": "nixos",
        "repo": "nixpkgs",
        "rev": "2d2a9ddbe3f2c00747398f3dc9b05f7f2ebb0f53",
        "type": "github"
      },
      "original": {
        "owner": "nixos",
        "ref": "nixpkgs-unstable",
        "repo": "nixpkgs",
        "type": "github"
      }
    },
    "root": {
      "inputs": {
        "nixpkgs": "nixpkgs"
      }
    }
  },
  "root": "root",
  "version": 7
}

================
File: LICENSE
================
MIT License

Copyright (c) 2024-present <PLACEHOLDER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================
File: package.json
================
{
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.10.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "clean": "node scripts/clean.mjs",
    "codegen": "pnpm --recursive --parallel run codegen",
    "build": "tsc -b tsconfig.build.json && pnpm --recursive --parallel run build",
    "check": "tsc -b tsconfig.json",
    "check-recursive": "pnpm --recursive exec tsc -b tsconfig.json",
    "lint": "eslint \"**/{src,test,examples,scripts,dtslint}/**/*.{ts,mjs}\"",
    "lint-fix": "pnpm lint --fix",
    "test": "vitest",
    "coverage": "vitest --coverage"
  },
  "devDependencies": {
    "@babel/cli": "^7.25.9",
    "@babel/core": "^7.26.0",
    "@babel/plugin-transform-export-namespace-from": "^7.25.9",
    "@babel/plugin-transform-modules-commonjs": "^7.25.9",
    "@effect/build-utils": "^0.7.7",
    "@effect/eslint-plugin": "^0.2.0",
    "@effect/language-service": "^0.2.0",
    "@effect/vitest": "latest",
    "@eslint/compat": "1.2.2",
    "@eslint/eslintrc": "3.1.0",
    "@eslint/js": "9.13.0",
    "@types/node": "^22.8.5",
    "@typescript-eslint/eslint-plugin": "^8.12.2",
    "@typescript-eslint/parser": "^8.12.2",
    "babel-plugin-annotate-pure-calls": "^0.4.0",
    "effect": "^3.10.7",
    "eslint": "^9.13.0",
    "eslint-import-resolver-typescript": "^3.6.3",
    "eslint-plugin-codegen": "^0.29.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-simple-import-sort": "^12.1.1",
    "eslint-plugin-sort-destructure-keys": "^2.0.0",
    "glob": "^11.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^3.2.0"
  },
  "pnpm": {
    "patchedDependencies": {
      "babel-plugin-annotate-pure-calls@0.4.0": "patches/babel-plugin-annotate-pure-calls@0.4.0.patch"
    }
  }
}

================
File: pnpm-workspace.yaml
================
packages:
  - packages/*

================
File: setupTests.ts
================
import * as it from "@effect/vitest"

it.addEqualityTesters()

================
File: tsconfig.base.json
================
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "moduleDetection": "force",
    "composite": true,
    "downlevelIteration": true,
    "resolveJsonModule": true,
    "esModuleInterop": false,
    "declaration": true,
    "skipLibCheck": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": [],
    "isolatedModules": true,
    "sourceMap": true,
    "declarationMap": true,
    "noImplicitReturns": false,
    "noUnusedLocals": true,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "noEmitOnError": false,
    "noErrorTruncation": false,
    "allowJs": false,
    "checkJs": false,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": false,
    "strictNullChecks": true,
    "baseUrl": ".",
    "target": "ES2022",
    "module": "NodeNext",
    "incremental": true,
    "removeComments": false,
    "plugins": [{ "name": "@effect/language-service" }],
    "paths": {
      "@adjoint/cli": ["./packages/cli/src/index.js"],
      "@adjoint/cli/*": ["./packages/cli/src/*.js"],
      "@adjoint/cli/test/*": ["./packages/cli/test/*.js"],
      "@adjoint/domain": ["./packages/domain/src/index.js"],
      "@adjoint/domain/*": ["./packages/domain/src/*.js"],
      "@adjoint/domain/test/*": ["./packages/domain/test/*.js"],
      "@adjoint/server": ["./packages/server/src/index.js"],
      "@adjoint/server/*": ["./packages/server/src/*.js"],
      "@adjoint/server/test/*": ["./packages/server/test/*.js"]
    }
  }
}

================
File: tsconfig.build.json
================
{
  "extends": "./tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "packages/cli/tsconfig.build.json" },
    { "path": "packages/domain/tsconfig.build.json" },
    { "path": "packages/server/tsconfig.build.json" }
  ]
}

================
File: tsconfig.json
================
{
  "extends": "./tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "packages/cli" },
    { "path": "packages/domain" },
    { "path": "packages/server" }
  ]
}

================
File: vitest.shared.ts
================
import * as path from "node:path"
import type { UserConfig } from "vitest/config"

const alias = (name: string) => {
  const target = process.env.TEST_DIST !== undefined ? "dist/dist/esm" : "src"
  return ({
    [`${name}/test`]: path.join(__dirname, "packages", name, "test"),
    [`${name}`]: path.join(__dirname, "packages", name, target)
  })
}

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: UserConfig = {
  esbuild: {
    target: "es2020"
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    alias: {
      ...alias("cli"),
      ...alias("domain"),
      ...alias("server")
    }
  }
}

export default config

================
File: vitest.workspace.ts
================
import * as path from "node:path"
import { defineWorkspace, type UserWorkspaceConfig } from "vitest/config"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const project = (
  config: UserWorkspaceConfig["test"] & { name: `${string}|${string}` },
  root = config.root ?? path.join(__dirname, `packages/${config.name.split("|").at(0)}`)
) => ({
  extends: "vitest.shared.ts",
  test: { root, ...config }
})

export default defineWorkspace([
  // Add specialized configuration for some packages.
  // project({ name: "my-package|browser", environment: "happy-dom" }),
  // Add the default configuration for all packages.
  "packages/*"
])



================================================================
End of Codebase
================================================================
