// packages/web/src/services/AppRuntime.tsx
import { Engine } from "@adjoint/domain"
import { BrowserHttpClient } from "@effect/platform-browser"
import { Layer } from "effect"
import { makeReactRuntime } from "./HttpRuntime.js"

// Create a singleton instance of GraphWorkspaceRuntime
// This will be our main interface to the domain laye
export const graphWorkspaceRxRuntime = Engine.GraphWorkspaceRxRuntime

// Create workspace hooks for React components

// Define the complete application layer
// This is like a dependency injection container that knows how to wire everything
const AppLayer = Layer.mergeAll(
  // Platform layers
  BrowserHttpClient.layerXMLHttpRequest,
  // Our service layers - use the one from domain
  Engine.WorkspaceStateServiceLive
)

// Create the runtime factory for our app
export const AppRuntime = makeReactRuntime((_args) => AppLayer, {
  disposeTimeout: 1000 // Wait 1 second before disposing
})

// Export typed hooks for convenience
export const useAppRuntime = AppRuntime.useRuntime
export const useAppEffect = AppRuntime.useEffect

// Export workspace-specific hooks
