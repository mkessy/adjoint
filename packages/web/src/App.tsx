import React from "react"
import { GraphWorkspaceProvider } from "./hooks/useGraphWorkspaceRuntime.js"
import { ObservableCanvas, ObservableCanvasStyles } from "./components/ObservableCanvas.js"
import { NLPSearchBarStyles } from "./components/NLPSearchBar.js"
import { CommutativeSquarePreviewStyles } from "./components/CommutativeSquarePreview.js"
import "./App.css"

/**
 * Main application component
 * Implements the Observable-style interface with NLP search focus
 */
function App() {
  return (
    <GraphWorkspaceProvider>
      <div className="app">
        <ObservableCanvas />
      </div>
      <style>{ObservableCanvasStyles}</style>
      <style>{NLPSearchBarStyles}</style>
      <style>{CommutativeSquarePreviewStyles}</style>
    </GraphWorkspaceProvider>
  )
}

export default App