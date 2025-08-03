import { Chunk, Effect } from "effect"
import type { AnyNode } from "./graph.js"

const countAlgebra = (
  _node: AnyNode,
  children: Chunk.Chunk<number>
): Effect.Effect<number> => {
  return Effect.succeed(1 + Chunk.reduce(children, 0, (a, b) => a + b))
}
