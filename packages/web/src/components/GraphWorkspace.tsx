import { Graph as GraphAPI } from "@adjoint/domain"
import { DateTime, Effect, pipe, Stream } from "effect"
import React, { Suspense, useCallback, useEffect, useState } from "react"
import { graphWorkspaceRuntime, useWorkspaceEvents, workspaceActions } from "../services/AppRuntime.js"

const { Graph } = GraphAPI
const personSchema = GraphAPI.Node.SchemaNode.make({
  id: "person-schema" as GraphAPI.Node.NodeId,
  schemaId: "person" as GraphAPI.Node.SchemaId,
  definition: {
    _tag: "Schema",
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" }
    }
  },
  createdAt: DateTime.unsafeFromDate(new Date()),
  lastSeenBy: "init" as GraphAPI.Node.NodeId
})

export const GraphWorkspace: React.FC = () => {
  // Local UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize workspace on mount
  useEffect(() => {
    if (!initialized) {
      const initWorkspace = async () => {
        try {
          // Create initial graph with a source schema

          const initialGraph = Graph.fromNodes([personSchema])
          await workspaceActions.initializeWorkspace(initialGraph)
          setInitialized(true)
        } catch (error) {
          console.error("Failed to initialize workspace:", error)
        }
      }

      initWorkspace()
    }

    // Cleanup on unmount
    return () => {
      if (initialized) {
        graphWorkspaceRuntime.dispose()
      }
    }
  }, [initialized])

  // Render the workspace content with suspense
  if (!initialized) {
    return (
      <div className="app">
        <div className="loading">Initializing workspace...</div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div>Loading workspace...</div>}>
      <WorkspaceContent
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    </Suspense>
  )
}

const WorkspaceContent: React.FC<{
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}> = ({ isProcessing, selectedNodeId, setIsProcessing, setSelectedNodeId }) => {
  // Use reactive streams from the runtime
  // Note: These hooks expect Rx objects, not Promises.
  // We'll need to properly integrate with effect-rx here
  const currentGraph = null as any // TODO: Fix effect-rx integration
  const stats = { value: { totalGraphs: 0, canUndo: false, canRedo: false } } as any

  // Handle adding a new node
  const handleAddNode = useCallback(async () => {
    setIsProcessing(true)
    try {
      const currentGraphData = await workspaceActions.getCurrentGraph()

      // Create a new source data node
      const newNode = new GraphAPI.Node.SourceDataNode({
        id: `source-${Date.now()}` as GraphAPI.Node.NodeId,
        sourceUri: "https://example.com/data",
        createdAt: DateTime.unsafeFromDate(new Date()),
        lastSeenBy: "user-action" as GraphAPI.Node.NodeId
      })

      // Add node to graph
      const updatedGraph = pipe(
        currentGraphData,
        Graph.addNode(newNode)
      )

      await workspaceActions.commitGraph(updatedGraph, "add-source-node", {
        nodeId: newNode.id,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error("Failed to add node:", error)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Subscribe to workspace events for notifications
  useEffect(() => {
    const subscribeToEvents = async () => {
      try {
        const eventsStream = await useWorkspaceEvents()
        const subscription = Stream.runForEach(eventsStream, (event) =>
          Effect.sync(() => {
            console.log("Workspace event:", event)
            // Handle events - show notifications, update UI, etc.
          }))

        // Run the subscription effect
        Effect.runPromise(subscription).catch(console.error)
      } catch (error) {
        console.error("Failed to subscribe to workspace events:", error)
      }
    }

    subscribeToEvents()
  }, [])

  if (!currentGraph || !stats) {
    return <div>Loading graph data...</div>
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Algebraic Graph Workspace</h1>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
          <span>Nodes: {currentGraph ? Graph.countNodes()(currentGraph) : 0}</span>
          <span>Edges: {currentGraph ? currentGraph.edges.length : 0}</span>
          <span>History: {stats.value.totalGraphs}</span>
          <span>Can Undo: {stats.value.canUndo ? "Yes" : "No"}</span>
          <span>Can Redo: {stats.value.canRedo ? "Yes" : "No"}</span>
        </div>
      </div>

      <div className="app-main">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
          {/* Graph visualization */}
          <div className="workspace-panel">
            <h2>Graph Visualization</h2>
            <SimpleGraphVisualization
              graph={currentGraph}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          </div>

          {/* Control panel */}
          <div className="workspace-panel">
            <h2>Controls</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Action buttons */}
              <button
                onClick={handleAddNode}
                disabled={isProcessing}
                className="btn btn-primary"
              >
                Add Source Node
              </button>

              {/* History controls */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => workspaceActions.undo()}
                  disabled={!stats.value.canUndo}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Undo
                </button>

                <button
                  onClick={() => workspaceActions.redo()}
                  disabled={!stats.value.canRedo}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Redo
                </button>
              </div>

              {/* Selected node info */}
              {selectedNodeId && (
                <NodeDetails
                  graph={currentGraph}
                  nodeId={selectedNodeId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple graph visualization component
const SimpleGraphVisualization: React.FC<{
  graph: any
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string | null) => void
}> = ({ graph, onNodeSelect, selectedNodeId }) => {
  // Convert HashMap to array for rendering
  const nodes = graph ? Array.from(graph.nodes.values()) : []

  return (
    <div
      style={{
        minHeight: "400px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "1rem",
        background: "#f9fafb"
      }}
    >
      {nodes.length === 0 ?
        (
          <div className="empty">
            No nodes in graph. Add a source node to begin.
          </div>
        ) :
        (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {nodes.map((node: any) => (
              <div
                key={node.id}
                onClick={() => onNodeSelect(node.id)}
                className={`node-item ${selectedNodeId === node.id ? "selected" : ""}`}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{node._tag}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  ID: {node.id.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// Node details component
const NodeDetails: React.FC<{
  graph: any
  nodeId: string
}> = ({ graph, nodeId }) => {
  const node = graph ? graph.nodes.get(nodeId) : null

  if (!node) return null

  return (
    <div className="node-details">
      <h3>Selected Node</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
        <div>
          <span style={{ fontWeight: 500 }}>ID:</span> {node.id}
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Type:</span> {node._tag}
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>Created:</span> {new Date(node.createdAt).toLocaleTimeString()}
        </div>
        {node._tag === "SourceDataNode" && (node as any).sourceUri && (
          <div>
            <span style={{ fontWeight: 500 }}>Source:</span> {(node as any).sourceUri}
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphWorkspace
