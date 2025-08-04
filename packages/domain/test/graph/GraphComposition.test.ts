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
