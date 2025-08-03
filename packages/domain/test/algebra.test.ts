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

      const count = yield* Graph.cata(Algebra.count, "1" as Node.NodeId)(graph)

      expect(count).toBe(3)
    }))
})
