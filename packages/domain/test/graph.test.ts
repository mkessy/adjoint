import { describe, expect, it } from "@effect/vitest"
import { HashMap, Schema } from "effect"
import * as Effect from "effect/Effect"
import * as Graph from "../src/graph/graph.js"
import * as Node from "../src/graph/node/node.js"

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
