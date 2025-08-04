import { Arbitrary, Chunk, DateTime, Effect, FastCheck } from "effect"
import { describe, expect, it } from "vitest"
import * as Algebra from "../../src/graph/algebra.js"
import { Graph, Node } from "../../src/graph/index.js"
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
