import { Context, Effect, Layer, Ref } from "effect"
import type * as Node from "../graph/node.js"

// --- Capability Interfaces ---

export interface NodePredicate<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly evaluate: (node: A) => boolean
}

export interface NodeEquivalence<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly equals: (self: A, that: A) => boolean
}

export interface NodeOrdering<A extends Node.AnyNode> {
  readonly _id: symbol
  readonly compare: (self: A, that: A) => -1 | 0 | 1
}

// --- Capability Registry Service ---

export class CapabilityRegistry extends Context.Tag("CapabilityRegistry")<
  CapabilityRegistry,
  {
    readonly registerPredicate: <A extends Node.AnyNode>(
      predicate: NodePredicate<A>
    ) => Effect.Effect<void>
    readonly getPredicate: <A extends Node.AnyNode>(
      id: symbol
    ) => Effect.Effect<NodePredicate<A>>
  }
>() {}

// --- Live Implementation ---

export const CapabilityRegistryLive = Layer.effect(
  CapabilityRegistry,
  Effect.gen(function*() {
    const registry = yield* Ref.make(new Map<symbol, unknown>())
    return CapabilityRegistry.of({
      registerPredicate: (p) => Ref.update(registry, (m) => m.set(p._id, p)),
      getPredicate: (id) => Ref.get(registry).pipe(Effect.map((m) => m.get(id) as any))
    })
  })
)
