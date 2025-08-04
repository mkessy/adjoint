import "./styles/index.css"
import { AppRuntime } from "./services/AppRuntime.js"

/**
 * Main application component
 * Implements the Observable-style interface with NLP search focus
 */
function App() {
  return (
    <AppRuntime.Provider>
      <div className="app">
        <h1>Hello, world!</h1>
      </div>
    </AppRuntime.Provider>
  )
}

export default App
