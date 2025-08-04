/**
 * Node Module - Organized Exports
 *
 * Provides all node-related functionality in organized namespaces
 */

// Main module with organized namespaces
export * from "./node.js"

// Convenience imports for common usage patterns
export type { NodeCreationError, NodeValidationError, RecursionScheme } from "./node.js"

export {
  type AnyNode,
  type AnyTag,
  CanonicalEntityNode,
  GraphNode,
  IdentityNode,
  NodeId,
  SchemaId,
  SchemaNode,
  SourceDataNode,
  StrategyNode
} from "./node.js"
