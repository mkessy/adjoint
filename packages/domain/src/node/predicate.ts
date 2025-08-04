import type * as Node from "../graph/node.js"
import type { NodePredicate } from "./capabilities.js"

export const and = <A extends Node.AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`and(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) && right.evaluate(node as A)
})

export const or = <A extends Node.AnyNode>(
  right: NodePredicate<A>
) =>
(self: NodePredicate<A>): NodePredicate<A> => ({
  _id: Symbol.for(`or(${String(self._id)}, ${String(right._id)})`),
  evaluate: (node) => self.evaluate(node as A) || right.evaluate(node as A)
})

export const not = <A extends Node.AnyNode>(
  self: NodePredicate<A>
): NodePredicate<A> => ({
  _id: Symbol.for(`not(${String(self._id)})`),
  evaluate: (node) => !self.evaluate(node as A)
})
