import { Result, Rx } from "@effect-rx/rx"
import { type DataSection, extractDataSections, extractSchemaInfo, extractTransformations } from "./GraphDataAdapter.js"
import { currentGraphRx } from "./WorkspaceRx.js"

/**
 * Layout-specific derived reactive values.
 * These compute UI-friendly data from the core state in WorkspaceRx.
 * All writable state has been moved to WorkspaceRx for consolidation.
 */

/**
 * Derive schema information for the active section from the graph.
 */
export const activeSchemaRx = Rx.make((get) => {
  const graphResult = get(currentGraphRx)

  return Result.match(graphResult, {
    onInitial: () => ({ type: "Document", schema: "{}" }),
    onFailure: () => extractSchemaInfo({ nodes: [], edges: [] } as any),
    onSuccess: (graph) => extractSchemaInfo(graph.value)
  })
})

// Transformation metadata for active section
export const activeTransformMetaRx = Rx.make<
  {
    label: string
    value: string
    meta: string
  } | null
>(() => null)

/**
 * Derive data sections from the current graph state.
 * This transforms the graph structure into UI-friendly sections.
 */
export const graphDataSectionsRx: Rx.Rx<Array<DataSection>> = Rx.make((get) => {
  const graphResult = get(currentGraphRx)

  // Extract sections from the graph or use sample data
  return Result.match(graphResult, {
    onInitial: () => [],
    onFailure: () => extractDataSections({ nodes: [], edges: [] } as any),
    onSuccess: (graph) => extractDataSections(graph.value)
  })
})

/**
 * Derive available transformations from graph and focused level.
 * These represent the algebra operations that can be applied.
 */
export const availableTransformsRx = Rx.make((get) => {
  const graphResult = get(currentGraphRx)

  return Result.match(graphResult, {
    onInitial: () => [],
    onFailure: () => extractTransformations({ nodes: [], edges: [] } as any),
    onSuccess: (graph) => extractTransformations(graph.value)
  })
})

// Re-export action from WorkspaceRx for convenience
export { setFocusedLevelRx } from "./WorkspaceRx.js"
