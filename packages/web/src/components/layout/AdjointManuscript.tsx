import React from "react"
import { DataCanvas } from "./DataCanvas.js"
import { MorphismMargin } from "./MorphismMargin.js"
import { SchemaMargin } from "./SchemaMargin.js"

/**
 * Main layout component implementing the computational manuscript design.
 *
 * Three-column grid layout:
 * - Left margin (240px): Schema context and type information
 * - Center canvas (flexible): Main data flow and recursive decomposition
 * - Right margin (240px): Transformation proofs and algebra
 */
export const AdjointManuscript: React.FC = () => {
  // Simulated reactive state - in real app this would come from effect-rx
  const currentActiveLevel = "Sentence"
  const currentItemCount = 6
  const currentTransform = "g: [Token] → Emotion"
  const isTransformValid = true

  return (
    <div className="adjoint-manuscript">
      {/* Left Margin: Schema View */}
      <aside className="schema-margin">
        <SchemaMargin
          activeLevel={currentActiveLevel}
          itemCount={currentItemCount}
        />
      </aside>

      {/* Center Canvas: The main data flow */}
      <main className="scroll-container">
        <DataCanvas />
      </main>

      {/* Right Margin: Transformation View */}
      <aside className="morphism-margin">
        <MorphismMargin
          transformType={currentTransform}
          isValid={isTransformValid}
        />
      </aside>
    </div>
  )
}
