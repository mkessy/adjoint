// packages/web/src/hooks/useService.ts
import type { Context, Effect, ManagedRuntime } from "effect"
import { useMemo } from "react"
import { AppRuntime } from "../services/AppRuntime.js"

// First, let's get the type of services available in our runtime
type AppServices = Parameters<typeof AppRuntime.useRuntime> extends ManagedRuntime.ManagedRuntime<infer R, any> ? R :
  never

// Now create a properly typed hook
export function useService<T extends AppServices>(
  tag: T extends Context.Tag<any, any> ? T : never
): T extends Context.Tag<any, infer S> ? S : never {
  const runtime = AppRuntime.useRuntime()

  return useMemo(() => {
    // Use runSync to execute an effect that extracts the service
    return runtime.runSync(tag as Effect.Effect<any, never, any>)
  }, [runtime, tag])
}
