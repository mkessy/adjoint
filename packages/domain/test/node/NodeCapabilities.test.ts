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
