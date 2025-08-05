import React from "react"
import { ContentRoot } from "./ContentRoot.js"

/**
 * Main layout component implementing the computational manuscript design.
 *
 * Single-column layout:
 * - Centered content with optimal reading width
 * - Fixed algebra workpad at bottom
 * - Observable-inspired design
 */
export const AdjointManuscript: React.FC = () => {
  return (
    <div className="adjoint-manuscript">
      <ContentRoot />
    </div>
  )
}
