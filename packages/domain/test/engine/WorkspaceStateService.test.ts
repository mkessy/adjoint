/**
 * WorkspaceStateService Tests
 *
 * Demonstrates the compositional Ref APIs and concurrent operation benefits
 */

import { Chunk, Effect, Fiber, Layer, Option, Stream, TestClock, TestContext } from "effect"
import { describe, expect, it } from "vitest"
import type { WorkspaceEvent } from "../../src/engine/services/WorkspaceStateService.js"
import {
  withInitialGraph,
  WorkspaceStateService,
  WorkspaceStateServiceTest
} from "../../src/engine/services/WorkspaceStateService.js"
import * as Graph from "../../src/graph/graph.js"

// Mock graph creation for testing
const createMockGraph = (id: string, _nodeCount: number = 1) => Graph.empty(Graph.makeGraphId(id))

const TestLayer = Layer.mergeAll(
  WorkspaceStateServiceTest,
  TestContext.TestContext
)

describe("WorkspaceStateService", () => {
  it("should start with empty state and handle first graph commit", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService
      const mockGraph = createMockGraph("test-graph-1")

      // Initial stats
      const initialStats = yield* service.getStats
      expect(initialStats.totalGraphs).toBe(0)
      expect(initialStats.canUndo).toBe(false)
      expect(initialStats.canRedo).toBe(false)

      // Commit first graph
      const snapshot = yield* service.commitGraph(mockGraph, "initial")
      expect(snapshot.graph.id).toBe("test-graph-1")
      expect(snapshot.operation).toBe("initial")

      // Should now have current graph
      const currentGraph = yield* service.currentGraph
      expect(currentGraph.id).toBe("test-graph-1")

      // Updated stats
      const stats = yield* service.getStats
      expect(stats.totalGraphs).toBe(1)
      expect(stats.canUndo).toBe(false) // Can't undo from initial state
      expect(stats.canRedo).toBe(false)
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))

  it("should handle undo/redo operations using Ref.modify", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService

      // Setup: commit three graphs
      const graph1 = createMockGraph("graph-1")
      const graph2 = createMockGraph("graph-2")
      const graph3 = createMockGraph("graph-3")

      yield* service.commitGraph(graph1, "initial")
      yield* service.commitGraph(graph2, "transform")
      yield* service.commitGraph(graph3, "transform")

      // Verify we're at graph3
      const current = yield* service.currentGraph
      expect(current.id).toBe("graph-3")

      // Test undo operation (atomic via Ref.modify)
      const undoResult1 = yield* service.undo
      expect(Option.isSome(undoResult1)).toBe(true)
      const undoGraph1 = Option.getOrThrow(undoResult1)
      expect(undoGraph1.id).toBe("graph-2")

      // Current graph should be graph2
      const afterUndo1 = yield* service.currentGraph
      expect(afterUndo1.id).toBe("graph-2")

      // Test second undo
      const undoResult2 = yield* service.undo
      const undoGraph2 = Option.getOrThrow(undoResult2)
      expect(undoGraph2.id).toBe("graph-1")

      // Test redo operation
      const redoResult1 = yield* service.redo
      const redoGraph1 = Option.getOrThrow(redoResult1)
      expect(redoGraph1.id).toBe("graph-2")

      // Verify undo/redo state
      expect(yield* service.canUndo).toBe(true)
      expect(yield* service.canRedo).toBe(true)

      // Test undo/redo at boundaries
      yield* service.undo // Back to graph-1
      yield* service.undo // Should fail - at beginning
      const undoAtStart = yield* service.undo
      expect(Option.isNone(undoAtStart)).toBe(true)

      // Move to end and test redo boundary
      yield* service.redo // graph-2
      yield* service.redo // graph-3
      const redoAtEnd = yield* service.redo
      expect(Option.isNone(redoAtEnd)).toBe(true)
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))

  it("should demonstrate concurrent reactive streams", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService

      // Collect stream events concurrently
      const graphUpdates: Array<any> = []
      const workspaceEvents: Array<WorkspaceEvent> = []

      // Subscribe to both streams concurrently
      const graphStreamFiber = yield* Effect.fork(
        Stream.take(service.graphStream, 3).pipe(
          Stream.runForEach((graph) => Effect.sync(() => graphUpdates.push(graph)))
        )
      )

      const eventStreamFiber = yield* Effect.fork(
        Stream.take(service.eventStream, 3).pipe(
          Stream.runForEach((event) => Effect.sync(() => workspaceEvents.push(event)))
        )
      )

      // Commit graphs (each triggers both streams)
      yield* service.commitGraph(createMockGraph("concurrent-1"))
      yield* service.commitGraph(createMockGraph("concurrent-2"))
      yield* service.commitGraph(createMockGraph("concurrent-3"))

      // Wait for both streams to complete
      yield* Effect.all([
        Fiber.join(graphStreamFiber),
        Fiber.join(eventStreamFiber)
      ], { concurrency: "unbounded" })

      // Verify concurrent collection
      expect(graphUpdates).toHaveLength(3)
      expect(workspaceEvents).toHaveLength(3)

      expect(graphUpdates.map((g) => g.id)).toEqual([
        "concurrent-1",
        "concurrent-2",
        "concurrent-3"
      ])

      workspaceEvents.forEach((event, index) => {
        expect(event._tag).toBe("WorkspaceEvent")
        expect(event.graph.id).toBe(`concurrent-${index + 1}`)
      })
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))

  it("should handle history truncation when branching from middle", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService

      // Create linear history: A -> B -> C
      yield* service.commitGraph(createMockGraph("A"), "initial")
      yield* service.commitGraph(createMockGraph("B"), "transform")
      yield* service.commitGraph(createMockGraph("C"), "transform")

      // Go back to B
      yield* service.undo // Now at B
      const atB = yield* service.currentGraph
      expect(atB.id).toBe("B")

      // Commit new graph D (should truncate C from history)
      yield* service.commitGraph(createMockGraph("D"), "branch")

      // History should now be A -> B -> D (C was truncated)
      const history = yield* service.getHistory
      expect(history.length).toBe(3)

      const graphIds = Chunk.map(history, (snapshot) => snapshot.graph.id)
      expect(Chunk.toReadonlyArray(graphIds)).toEqual(["A", "B", "D"])

      // Can't redo to C anymore
      expect(yield* service.canRedo).toBe(false)

      // But can undo to B and A
      expect(yield* service.canUndo).toBe(true)
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))

  it("should maintain history size limits efficiently", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService

      // The test service has maxHistorySize: 10
      // Commit 15 graphs to test trimming
      for (let i = 1; i <= 15; i++) {
        yield* service.commitGraph(createMockGraph(`graph-${i}`), "batch")
      }

      const history = yield* service.getHistory
      expect(history.length).toBe(10) // Should be trimmed to max size

      // Should have the last 10 graphs (6-15)
      const graphIds = Chunk.map(history, (snapshot) => snapshot.graph.id)
      const expectedIds = Array.from({ length: 10 }, (_, i) => `graph-${i + 6}`)
      expect(Chunk.toReadonlyArray(graphIds)).toEqual(expectedIds)

      // Current should be the last graph
      const current = yield* service.currentGraph
      expect(current.id).toBe("graph-15")
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))

  it("should demonstrate performance benefits of Ref.modify", () =>
    Effect.gen(function*() {
      const service = yield* WorkspaceStateService

      // Time the atomic operations
      const startTime = yield* TestClock.currentTimeMillis

      // Perform 100 rapid commits (each uses Ref.modify for atomicity)
      yield* Effect.all(
        Array.from({ length: 100 }, (_, i) => service.commitGraph(createMockGraph(`perf-${i}`), "performance")),
        { concurrency: 10 } // Concurrent commits to test atomicity
      )

      const endTime = yield* TestClock.currentTimeMillis
      const duration = endTime - startTime

      // Verify all commits were applied atomically
      const stats = yield* service.getStats
      expect(stats.totalGraphs).toBe(10) // Limited by maxHistorySize in test

      const history = yield* service.getHistory
      expect(history.length).toBe(10)

      // All operations should complete quickly due to atomic Ref operations
      expect(duration).toBeLessThan(1000) // Milliseconds
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))
})

// Integration test with helper functions
describe("WorkspaceStateService Integration", () => {
  it("should work with utility functions", () =>
    Effect.gen(function*() {
      const initialGraph = createMockGraph("initial-setup")

      // Use the helper to initialize workspace
      yield* withInitialGraph(initialGraph)

      const service = yield* WorkspaceStateService
      const currentGraph = yield* service.currentGraph
      expect(currentGraph.id).toBe("initial-setup")

      // Subscribe to changes
      const changes: Array<any> = []
      const subscription = yield* Effect.fork(
        Stream.take(service.graphStream, 2).pipe(
          Stream.runForEach((graph) => Effect.sync(() => changes.push(graph)))
        )
      )

      // Make some changes
      yield* service.commitGraph(createMockGraph("update-1"))
      yield* service.undo

      yield* Fiber.join(subscription)

      expect(changes).toHaveLength(2)
      expect(changes.map((g) => g.id)).toEqual(["update-1", "initial-setup"])
    }).pipe(Effect.provide(TestLayer), Effect.runPromise))
})
