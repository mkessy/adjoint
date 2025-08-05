import "./styles/index.css"
import { ContentRoot } from "./components/layout/index.js"
import { AppRuntime } from "./services/AppRuntime.js"

/**
 * Main application component
 * Observable-inspired single-column layout with focused data visualization
 */
function App() {
  return (
    <AppRuntime.Provider>
      <ContentRoot />
    </AppRuntime.Provider>
  )
}

export default App
