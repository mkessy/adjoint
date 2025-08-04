// packages/web/src/services/Runtime.tsx
import { ConfigProvider, Data, Effect, Equal, Layer, ManagedRuntime } from "effect"
import * as React from "react"

// MemoMap caches layer instances to avoid recreating identical layers
// This is crucial for performance - layers can be expensive to create
const memoMap = Effect.runSync(Layer.makeMemoMap)

// Pull configuration from Vite's environment variables
// This allows us to use import.meta.env.VITE_API_URL etc.
const ViteConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson({
    API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000"
  })
)

// Factory function that creates a React-aware runtime system
export const makeReactRuntime = <R, E, Args extends Record<string, unknown> = Record<string, unknown>>(
  // Layer can be a function that takes arguments, allowing dynamic configuration
  layer: (args: Args) => Layer.Layer<R, E>,
  options?: {
    disposeTimeout?: number // How long to wait before disposing unused runtime
  }
) => {
  // Create a context to provide the runtime throughout the React tree
  const Context = React.createContext<ManagedRuntime.ManagedRuntime<R, E>>(
    null as any
  )

  // Provider component that manages runtime lifecycle
  const Provider = (props: Args & { children?: React.ReactNode }) => {
    // Extract dependencies from props (excluding children)
    // This creates a dependency array similar to useEffect deps
    const deps = React.useMemo(() => {
      const result: Array<unknown> = Data.unsafeArray([]) as any
      for (const key of Object.keys(props).sort()) {
        if (key === "children") continue
        result.push(props[key])
      }
      return Data.array(result) // Data.array ensures proper equality checking
    }, [props])

    // Store runtime in a ref to persist across renders
    const runtimeRef = React.useRef<{
      readonly deps: ReadonlyArray<unknown>
      readonly runtime: ManagedRuntime.ManagedRuntime<R, E>
      disposeTimeout?: NodeJS.Timeout | undefined
    }>(undefined as any)

    // Create or update runtime when dependencies change
    if (!runtimeRef.current || !Equal.equals(runtimeRef.current.deps, deps)) {
      runtimeRef.current = {
        deps,
        runtime: ManagedRuntime.make(
          Layer.provideMerge(
            layer(deps as unknown as Args),
            ViteConfigProvider
          ),
          memoMap // This ensures layers are cached and reused
        ),
        disposeTimeout: undefined
      }
    }

    // Manage runtime lifecycle with React
    React.useEffect(() => {
      const current = runtimeRef.current!

      // Clear any pending disposal
      if (current.disposeTimeout) {
        clearTimeout(current.disposeTimeout)
        current.disposeTimeout = undefined
      }

      // Cleanup: schedule disposal when component unmounts
      return () => {
        current.disposeTimeout = setTimeout(
          () => current.runtime.dispose(),
          options?.disposeTimeout ?? 500 // Default 500ms delay
        ) as any
      }
    }, [runtimeRef.current])

    return (
      <Context.Provider value={runtimeRef.current.runtime}>
        {props.children}
      </Context.Provider>
    )
  }

  // Hook to access the runtime
  const useRuntime = () => React.useContext(Context)

  // Hook to run effects with proper lifecycle management
  const useEffect = <A, EX>(
    effect: Effect.Effect<A, EX, R>,
    deps?: React.DependencyList
  ) => {
    const runtime = useRuntime()
    const [state, setState] = React.useState<{
      data?: A
      error?: EX
      loading: boolean
    }>({ loading: true })

    React.useEffect(() => {
      const controller = new AbortController()

      runtime.runPromise(
        effect.pipe(
          Effect.tap((data) => Effect.sync(() => setState({ data, loading: false }))),
          Effect.catchAll((error) => Effect.sync(() => setState({ error: error as EX, loading: false })))
        ),
        { signal: controller.signal }
      ).catch(() => {
        // Ignore - error already handled in Effect.catchAll
      })

      return () => controller.abort()
    }, deps)

    return state
  }

  return { Context, Provider, useRuntime, useEffect } as const
}
