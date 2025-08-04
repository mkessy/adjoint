// packages/web/src/App.tsx
import { RecentPlays } from "./components/plays/RecentPlays.js"
import { AppRuntime } from "./services/AppRuntime.js"
import "./styles/index.css"

export function App() {
  // The Provider manages the runtime lifecycle
  // It will create services on mount and dispose them after unmount + timeout
  return (
    <AppRuntime.Provider apiUrl={import.meta.env.VITE_API_URL}>
      <div className="app">
        <header className="app-header">
          <h1>Crate Music Discovery</h1>
        </header>
        <main className="app-main">
          <RecentPlays />
        </main>
      </div>
    </AppRuntime.Provider>
  )
}
