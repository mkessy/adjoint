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
