// packages/web/src/hooks/useEffect.ts
import { Effect } from "effect"
import { useEffect, useRef, useState } from "react"

// A hook that properly executes an Effect and manages its lifecycle
export function useEffectQuery<A, E>(
  effect: Effect.Effect<A, E>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<A | null>(null)
  const [error, setError] = useState<E | null>(null)
  const [loading, setLoading] = useState(true)

  // Use a ref to track if the component is mounted
  const mountedRef = useRef(true)

  useEffect(() => {
    // Reset state when effect changes
    setLoading(true)
    setError(null)

    // Create an abort controller for cleanup
    const controller = new AbortController()

    // Run the effect with proper error handling
    Effect.runPromise(
      effect.pipe(
        // Only update state if component is still mounted
        Effect.tap((result) =>
          Effect.sync(() => {
            if (mountedRef.current) {
              setData(result)
              setLoading(false)
            }
          })
        ),
        // Handle errors gracefully
        Effect.catchAll((e) =>
          Effect.sync(() => {
            if (mountedRef.current) {
              setError(e)
              setLoading(false)
            }
          })
        )
      ),
      { signal: controller.signal }
    ).catch(() => {
      // Ignore errors that have already been handled
    })

    // Cleanup function
    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, deps)

  return { data, error, loading }
}

// A simpler hook for effects that don't return data
export function useEffectRun<E>(
  effect: Effect.Effect<void, E>,
  deps: React.DependencyList = []
) {
  const [error, setError] = useState<E | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Effect.runPromise(
      effect.pipe(
        Effect.catchAll((e) => Effect.sync(() => setError(e)))
      ),
      { signal: controller.signal }
    ).catch(() => {
      // Ignore - error is already handled
    })

    return () => controller.abort()
  }, deps)

  return { error }
}
