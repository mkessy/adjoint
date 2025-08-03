import type { Effect } from "effect"
import { Schema } from "effect"

import type { WithResult } from "effect/Schema"

type TypeId = typeof TypeId
export const TypeId: unique symbol = Symbol.for("Graph.NodeId")

export const NodeId = Schema.String.pipe(Schema.brand("NodeId"))
export type NodeId = Schema.Schema.Type<typeof NodeId>

export interface BaseNodeWrapper<
  A extends Schema.Schema<any, any, any>,
  I extends Readonly<Record<string, unknown>> | ReadonlyArray<unknown>,
  R = never
> {
  readonly _tag: string
  readonly id: string
  readonly schema: Schema.Schema<A, I, R>
  readonly schemaIdentifier: string
  readonly description: string
}

const EncodedCanonicalEntityNode = Schema.Struct({
  _tag: Schema.Literal("CanonicalEntityNode"),
  id: NodeId,
  // The identifier for the schema this entity's properties conform to.
  schemaId: Schema.String,
  value: Schema.Unknown
})

namespace GraphNode {
  export type AnyNode = Schema.Schema.Type<typeof EncodedCanonicalEntityNode>

  export type AnyNodeEncoded = Schema.Schema.Type<typeof EncodedCanonicalEntityNode>
}

class EncodeGraphNodeResult
  implements WithResult<GraphNode.AnyNode, GraphNode.AnyNodeEncoded, unknown, unknown, unknown>
{
  readonly success: Schema.Schema<GraphNode.AnyNode, GraphNode.AnyNodeEncoded, unknown>
  readonly failure: Schema.Schema<unknown, unknown, unknown>

  constructor(props: { id: NodeId; value: unknown }) {
    this.success = EncodedCanonicalEntityNode
    this.failure = Schema.Unknown
  }
}
