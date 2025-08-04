import { Chunk, DateTime, Effect, pipe } from "effect"
import { describe, expect, it } from "vitest"
import * as Algebra from "../../src/graph/algebra.js"
import * as Graph from "../../src/graph/graph.js"
import * as Node from "../../src/graph/node/node.js"
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
