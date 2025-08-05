import { Graph } from "@adjoint/domain"
import { Array, HashMap, Option, pipe } from "effect"

/**
 * GraphDataAdapter - Transforms graph data into UI-friendly structures.
 *
 * This adapter layer converts the algebraic graph structure into
 * hierarchical data sections suitable for the manuscript view.
 *
 * Based on Effect-RX patterns from https://github.com/tim-smart/effect-rx
 */

export interface DataSection {
  id: string
  title: string
  level: number
  data: Array<string>
  nodeIds?: Array<string> // References to actual graph nodes
  schemaType?: string
}

/**
 * Extract data sections from the current graph.
 * This traverses the graph to find different levels of data decomposition.
 */
export const extractDataSections = (graph: Graph.Graph.Graph): Array<DataSection> => {
  // This is a placeholder implementation
  // In production, this would traverse the actual graph structure
  // looking for SourceDataNodes, CanonicalEntityNodes, etc.

  const sections: Array<DataSection> = []

  // Level 0: Source Documents

  const documentNodes = HashMap.filterMap(
    graph.nodes,
    (node, key) => {
      return node._tag === "SourceDataNode" ?
        Option.some({
          id: key.toString(),
          title: node.sourceUri || "Untitled",
          level: 0,
          data: ["Placeholder data for SourceDataNode"],
          nodeIds: [key.toString()]
        }) :
        Option.none()
    }
  )

  if (HashMap.size(documentNodes) > 0) {
    sections.push({
      id: "documents",
      title: "Source Documents",
      level: 0,
      data: pipe(
        HashMap.values(documentNodes),
        Array.fromIterable,
        (nodes) => nodes.map((node) => node.title)
      ),
      nodeIds: pipe(
        HashMap.keys(documentNodes),
        Array.fromIterable,
        (keys) => keys.map((key) => key.toString())
      ),
      schemaType: "SourceDocument"
    })
  }

  // Level 1: Sections/Paragraphs
  const sectionNodes = pipe(
    graph.nodes,
    HashMap.filterMap((node, key) => {
      const matchedNode = Graph.Node.matchNode(node) as Graph.Node.AnyNode
      return matchedNode._tag === "CanonicalEntityNode" ?
        Option.some({
          id: key.toString(),
          title: "Placeholder Section",
          level: 1,
          data: ["Placeholder section data"],
          nodeIds: [key.toString()]
        }) :
        Option.none()
    }),
    HashMap.values,
    Array.fromIterable
  )

  if (sectionNodes.length > 0) {
    sections.push({
      id: "sections",
      title: "Sections",
      level: 1,
      data: pipe(
        sectionNodes,
        Array.map((node) => Array.isArray(node.data) ? node.data.join(" ") : "Placeholder section content")
      ),
      nodeIds: pipe(
        sectionNodes,
        Array.map((node) => node.id)
      ),
      schemaType: "Section"
    })
  }

  // Level 2: Sentences
  const sentenceNodes = pipe(
    graph.nodes,
    HashMap.filterMap((node, key) => {
      const matchedNode = Graph.Node.matchNode(node) as Graph.Node.AnyNode
      return matchedNode._tag === "CanonicalEntityNode" ?
        Option.some({
          id: key.toString(),
          text: "Placeholder sentence",
          level: 2
        }) :
        Option.none()
    }),
    HashMap.values,
    Array.fromIterable
  )

  if (sentenceNodes.length > 0) {
    sections.push({
      id: "sentences",
      title: "Sentences",
      level: 2,
      data: pipe(
        sentenceNodes,
        Array.map((node) => node.text)
      ),
      nodeIds: pipe(
        sentenceNodes,
        Array.map((node) => node.id)
      ),
      schemaType: "Sentence"
    })
  }

  // Level 3: Tokens
  const tokenNodes = pipe(
    graph.nodes,
    HashMap.filterMap((node, key) => {
      const matchedNode = Graph.Node.matchNode(node) as Graph.Node.AnyNode
      return matchedNode._tag === "CanonicalEntityNode" ?
        Option.some({
          id: key.toString(),
          token: "placeholder-token",
          level: 3
        }) :
        Option.none()
    }),
    HashMap.values,
    Array.fromIterable
  )

  if (tokenNodes.length > 0) {
    sections.push({
      id: "tokens",
      title: "Tokens",
      level: 3,
      data: pipe(
        tokenNodes,
        Array.map((node) => node.token)
      ),
      nodeIds: pipe(
        tokenNodes,
        Array.map((node) => node.id)
      ),
      schemaType: "Token"
    })
  }

  // If no graph data, return sample data for development
  if (sections.length === 0) {
    return getSampleSections()
  }

  return sections
}

/**
 * Get sample sections for development/demo purposes
 */
const getSampleSections = (): Array<DataSection> => [
  {
    id: "documents",
    title: "Documents",
    level: 0,
    data: [
      "Attention is All You Need - Transformer Architecture Paper",
      "BERT: Pre-training of Deep Bidirectional Transformers",
      "GPT-3: Language Models are Few-Shot Learners"
    ],
    schemaType: "Document"
  },
  {
    id: "sections",
    title: "Sections",
    level: 1,
    data: [
      "Abstract: We propose a new simple network architecture, the Transformer...",
      "Introduction: Recurrent neural networks have long been the dominant approach...",
      "Model Architecture: Most competitive neural sequence transduction models...",
      "Experiments: We trained our models on the standard WMT 2014 English-German...",
      "Results: Our model achieves 28.4 BLEU on the WMT 2014 English-German...",
      "Conclusion: In this work, we presented the Transformer, the first sequence..."
    ],
    schemaType: "Section"
  },
  {
    id: "sentences",
    title: "Sentences",
    level: 2,
    data: [
      "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.",
      "The Transformer allows for significantly more parallelization than recurrent models.",
      "Experiments on two machine translation tasks show these models to be superior in quality.",
      "The Transformer achieves 28.4 BLEU on the WMT 2014 English-German translation task.",
      "On the WMT 2014 English-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8.",
      "We show that the Transformer generalizes well to other tasks."
    ],
    schemaType: "Sentence"
  },
  {
    id: "tokens",
    title: "Tokens",
    level: 3,
    data: [
      "We",
      "propose",
      "a",
      "new",
      "simple",
      "network",
      "architecture",
      ",",
      "the",
      "Transformer",
      ",",
      "based",
      "solely",
      "on",
      "attention",
      "mechanisms",
      "."
    ],
    schemaType: "Token"
  }
]

/**
 * Extract available transformations from the graph.
 * These are AlgebraNodes that can be applied at each level.
 */
export const extractTransformations = (graph: Graph.Graph.Graph, level: number) => {
  // Since AlgebraNode is not currently implemented, return default transformations
  // This would be where we look for transformation nodes in the graph
  const transformations = pipe(
    graph.nodes,
    HashMap.filterMap((_node, _key) => {
      // Placeholder for when AlgebraNode is implemented
      return Option.none()
    }),
    HashMap.values,
    Array.fromIterable
  )

  // Return default transformations for now
  return transformations.length > 0 ? transformations : getDefaultTransformations()[level] || []
}

/**
 * Get default transformations for development
 */
const getDefaultTransformations = () => [
  [{ from: "Document", to: "Sections", op: "split" }],
  [{ from: "Sections", to: "Sentences", op: "tokenize" }],
  [{ from: "Sentences", to: "Tokens", op: "parse" }],
  [{ from: "Tokens", to: "Analysis", op: "analyze" }]
]

/**
 * Extract schema information for a given level
 */
export const extractSchemaInfo = (graph: Graph.Graph.Graph, level: number) => {
  // Look for SchemaNodes associated with this level
  const schemaNode = pipe(
    graph.nodes,
    HashMap.findFirst((node, _key) => {
      const matchedNode = Graph.Node.matchNode(node) as Graph.Node.AnyNode
      return matchedNode._tag === "SchemaNode"
    }),
    Option.map(([_key, _node]) => {
      // For now, return placeholder schema info
      return {
        type: `Level${level}`,
        schema: "{ placeholder: string }"
      }
    })
  )

  return pipe(
    schemaNode,
    Option.getOrElse(() => {
      // Default schemas
      const defaultSchemas = [
        { type: "Document", schema: "{ title: string, content: string }" },
        { type: "Section", schema: "{ text: string, index: number }" },
        { type: "Sentence", schema: "Array<Token>" },
        { type: "Token", schema: "{ text: string, pos: string }" }
      ]
      return defaultSchemas[level] || null
    })
  )
}
