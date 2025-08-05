import "./styles/index.css"
import { LayoutVisualization } from "./components/examples/index.js"
import { AppRuntime } from "./services/AppRuntime.js"

/**
 * Main application component
 * Showcasing the manuscript layout system with token visualization
 */
function App() {
  return (
    <AppRuntime.Provider>
      <LayoutVisualization />
    </AppRuntime.Provider>
  )
}

export default App
