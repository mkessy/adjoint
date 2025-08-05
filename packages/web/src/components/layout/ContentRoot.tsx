import { useRxValue } from "@effect-rx/rx-react"
import React, { useEffect, useRef } from "react"
import { focusedLevelRx } from "../../services/WorkspaceRx.js"
import { AlgebraWorkpad } from "./AlgebraWorkpad.js"
import { ContentBody } from "./ContentBody.js"

/**
 * Root layout component - Observable-inspired single-column design.
 *
 * Features:
 * - Centered max-width container (1280px)
 * - Optimal reading width for main content (680px)
 * - Section-anchored annotations for schema information
 * - Fixed algebra workpad at bottom
 * - Responsive design that collapses gracefully
 */
export const ContentRoot: React.FC = () => {
  const focusedLevel = useRxValue(focusedLevelRx)
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to maintain focus on active levels
  useEffect(() => {
    const focusedSection = document.querySelector(`[data-level="${focusedLevel}"]`)
    if (focusedSection) {
      focusedSection.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [focusedLevel])

  return (
    <div className="content-root">
      {/* Main content body with scrollable area */}
      <div className="content-body" ref={contentRef}>
        <ContentBody />
      </div>

      {/* Fixed algebra workpad at bottom */}
      <AlgebraWorkpad />
    </div>
  )
}
