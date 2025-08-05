import "./styles/index.css"
import GraphWorkspace from "./components/GraphWorkspace.js"
import { AppRuntime } from "./services/AppRuntime.js"

/**
 * Main application component
 * Implements the Observable-style interface with NLP search focus
 */
function App() {
  return (
    <AppRuntime.Provider>
      <GraphWorkspace />
    </AppRuntime.Provider>
  )
}

export default App
