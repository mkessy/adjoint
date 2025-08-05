import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import React from "react"
import { availableTransformsRx } from "../../services/LayoutRx.js"
import { currentTransformRx, focusedLevelRx, setFocusedLevelRx } from "../../services/WorkspaceRx.js"

/**
 * Fixed algebra workpad at the bottom of the content.
 *
 * Design principles:
 * - Always visible at bottom for quick transformations
 * - Minimal height when inactive, expands on interaction
 * - Shows current transformation context
 * - Allows quick level navigation
 * - Reactive state management via Effect-RX
 */
export const AlgebraWorkpad: React.FC = () => {
  const currentLevel = useRxValue(focusedLevelRx)
  const currentTransform = useRxValue(currentTransformRx)
  const transformations = useRxValue(availableTransformsRx)
  const setFocusedLevel = useRxSet(setFocusedLevelRx)

  return (
    <div className="algebra-workpad">
      <div className="workpad-header">
        <span className="workpad-label">ALGEBRA</span>
        <span className="workpad-status">
          Level {currentLevel}: {currentTransform.from} → {currentTransform.to}
        </span>
      </div>

      <div className="workpad-content">
        <div className="transform-pipeline">
          {transformations.map((transform: any, index: number) => (
            <button
              key={index}
              className={`transform-step ${index === currentLevel ? "active" : ""}`}
              onClick={() => setFocusedLevel(index)}
            >
              <span className="step-number">{index}</span>
              <span className="step-op">{(transform as any).op}</span>
            </button>
          ))}
        </div>

        <div className="workpad-formula">
          <code>
            f: {(currentTransform as any)?.from || "?"} → {(currentTransform as any)?.to || "?"}
          </code>
        </div>
      </div>
    </div>
  )
}
