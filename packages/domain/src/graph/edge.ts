import { Data, Match, Schema } from "effect"
import * as Node from "./node.js"

// --- Edge Schema Definition ---

export type Edge = Data.TaggedEnum<{
  CONFORMS_TO_SCHEMA: { from: Node.NodeId; to: Node.SchemaId }
  INPUT_TO: { from: Node.NodeId; to: Node.NodeId }
  PRODUCES: { from: Node.NodeId; to: Node.NodeId }
  HAS_CHILD: { from: Node.NodeId; to: Node.NodeId }
}>

export const Edge = Data.taggedEnum<Edge>()

export const EdgeSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("CONFORMS_TO_SCHEMA"), from: Node.NodeId, to: Node.SchemaId }),
  Schema.Struct({ _tag: Schema.Literal("INPUT_TO"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("PRODUCES"), from: Node.NodeId, to: Node.NodeId }),
  Schema.Struct({ _tag: Schema.Literal("HAS_CHILD"), from: Node.NodeId, to: Node.NodeId })
)

// --- Pattern-Matching Based Constructor ---

/**
 * Creates an Edge in a type-safe manner using pattern matching on the node types.
 * This function provides a single, consistent API for edge creation and ensures
 * that only valid connections can be made at the type level.
 *
 * @param from The source node.
 * @param to The target node.
 * @returns An `Edge` object representing the connection.
 */
export const create = (
  from: Node.AnyNode,
  to: Node.AnyNode
): Edge =>
  Match.value([from, to]).pipe(
    // A StrategyNode produces a SchemaNode
    Match.when(
      [Node.isStrategyNode, Node.isSchemaNode],
      ([from, to]) => Edge.PRODUCES({ from: from.id, to: to.id })
    ),
    // A CanonicalEntityNode conforms to a SchemaNode
    Match.when(
      [Node.isCanonicalEntityNode, Node.isSchemaNode],
      ([from, to]) => Edge.CONFORMS_TO_SCHEMA({ from: from.id, to: to.schemaId })
    ),
    // Any node can be an input to a StrategyNode
    Match.when(
      [Node.isGraphNode, Node.isStrategyNode],
      ([from, to]) => Edge.INPUT_TO({ from: from.id, to: to.id })
    ),
    // Default case for a generic parent-child relationship
    Match.orElse(([from, to]) => Edge.HAS_CHILD({ from: from.id, to: to.id }))
  )
