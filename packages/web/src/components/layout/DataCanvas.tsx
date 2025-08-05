import React from "react"
import { DataStratum } from "./DataStratum.js"

/**
 * Main content area - the "canvas" where data flows top-to-bottom
 * in recursive decomposition strata.
 *
 * This represents the central column of the computational manuscript,
 * showing the step-by-step breakdown of data through algebraic transformations.
 */
export const DataCanvas: React.FC = () => {
  // Sample data representing different levels of decomposition - high density content
  const sampleStrata = [
    {
      id: "documents",
      title: "Documents",
      level: 0,
      data: [
        "Document 1: Attention Is All You Need (Transformer Architecture)",
        "Document 2: BERT: Pre-training of Deep Bidirectional Encoders",
        "Document 3: GPT-3: Language Models are Few-Shot Learners",
        "Document 4: T5: Exploring Transfer Learning Limits"
      ]
    },
    {
      id: "paragraphs",
      title: "Paragraphs",
      level: 1,
      data: [
        "Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
        "Introduction: Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular...",
        "Model Architecture: Most competitive neural sequence transduction models have an encoder-decoder structure...",
        "Attention: An attention function can be described as mapping a query and a set of key-value pairs to an output...",
        "Position-wise Feed-Forward Networks: In addition to attention sub-layers, each layer in our encoder and decoder...",
        "Results: We evaluate our models on two machine translation tasks..."
      ]
    },
    {
      id: "sentences",
      title: "Sentences",
      level: 2,
      data: [
        "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.",
        "The best performing models also connect the encoder and decoder through an attention mechanism.",
        "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.",
        "Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable.",
        "The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality.",
        "We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing."
      ]
    },
    {
      id: "tokens",
      title: "Tokens",
      level: 3,
      data: [
        "The",
        "dominant",
        "sequence",
        "transduction",
        "models",
        "are",
        "based",
        "on",
        "complex",
        "recurrent",
        "or",
        "convolutional",
        "neural",
        "networks",
        "that",
        "include",
        "an",
        "encoder",
        "and",
        "a",
        "decoder",
        ".",
        "The",
        "best",
        "performing",
        "models",
        "also",
        "connect",
        "the",
        "encoder",
        "and",
        "decoder",
        "through",
        "an",
        "attention",
        "mechanism",
        ".",
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
        "solely"
      ]
    }
  ]

  return (
    <div className="data-canvas">
      {sampleStrata.map((stratum, index) => (
        <DataStratum
          key={stratum.id}
          title={stratum.title}
          level={stratum.level}
          data={stratum.data}
          isActive={index === 2} // Focus on "Sentences" level for demonstration
        />
      ))}
    </div>
  )
}
