// packages/web/src/services/AppRuntime.tsx
import { BrowserHttpClient } from "@effect/platform-browser"
import { Layer } from "effect"
import { ApiClientDefault } from "./ApiClient.js"
import { makeReactRuntime } from "./Runtime.js"

// Define the complete application layer
// This is like a dependency injection container that knows how to wire everything
const AppLayer = Layer.mergeAll(
  // Platform layers
  BrowserHttpClient.layerXMLHttpRequest,
  // Our service layers
  ApiClientDefault
  //  SearchService.Default,
  //  EntityResolver.Default
)

// Create the runtime factory for our app
export const AppRuntime = makeReactRuntime((_args) => AppLayer, {
  disposeTimeout: 1000 // Wait 1 second before disposing
})

// Export typed hooks for convenience
export const useAppRuntime = AppRuntime.useRuntime
export const useAppEffect = AppRuntime.useEffect
