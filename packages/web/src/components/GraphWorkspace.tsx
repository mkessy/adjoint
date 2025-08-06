import { Graph } from "@adjoint/domain"
import { useRxRefresh, useRxValue } from "@effect-rx/rx-react"
import { DateTime } from "effect"
import React, { Suspense } from "react"
import { extractDataSections, extractTransformations } from "../services/GraphDataAdapter.js"
import { canRedoRx, canUndoRx, currentGraphRx, workspaceActionsRx } from "../services/WorkspaceRx.js"

const GraphWorkspaceContent: React.FC = () => {
  const currentGraph = useRxValue(currentGraphRx)
  const commitGraph = useRxRefresh(workspaceActionsRx.commitGraph)
  const undo = useRxRefresh(workspaceActionsRx.undo)
  const redo = useRxRefresh(workspaceActionsRx.redo)
  const canUndo = useRxValue(canUndoRx)
  const canRedo = useRxValue(canRedoRx)

  const dataSections = extractDataSections(currentGraph.value!)
  const transformations = extractTransformations(currentGraph.value!) // Level 0 for now

  const handleCommit = () => {
    // Example: Add a new node and commit
    const newNode = new Graph.Node.SourceDataNode({
      id: `node-${Math.random().toString(36).substring(7)}` as Graph.Node.NodeId,
      sourceUri: `New Document ${new Date().toISOString()}`,
      createdAt: DateTime.unsafeFromDate(new Date()),
      lastSeenBy: "user" as Graph.Node.NodeId
    })
    const updatedGraph = Graph.Graph.addNode(currentGraph.value!, newNode)
    commitGraph()
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Graph Workspace</h2>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleCommit}>Add Node & Commit</button>
        <button onClick={() => undo()} disabled={!canUndo}>Undo</button>
        <button onClick={() => redo()} disabled={!canRedo}>Redo</button>
      </div>

      <h3>Data Sections:</h3>
      {dataSections.length === 0 ? <p>No data sections found. Try adding some nodes.</p> : (
        dataSections.map((section) => (
          <div key={section.id} style={{ border: "1px solid #ccc", padding: "0.5rem", margin: "0.5rem 0" }}>
            <h4>{section.title} (Level: {section.level})</h4>
            <ul>
              {section.data.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        ))
      )}

      <h3>Transformations:</h3>
      {transformations.length === 0 ? <p>No transformations found.</p> : (
        <ul>
          {transformations.map((t, index) => <li key={index}>{t.op} (from: {t.from}, to: {t.to})</li>)}
        </ul>
      )}
    </div>
  )
}

const GraphWorkspace: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading Graph...</div>}>
      <GraphWorkspaceContent />
    </Suspense>
  )
}

export default GraphWorkspace
