import React from "react"

interface SchemaMarginProps {
  activeLevel?: string
  itemCount?: number
}

/**
 * Left margin - minimal scratch pad that reacts to current data focus.
 * Mostly empty space with contextual hints.
 */
export const SchemaMargin: React.FC<SchemaMarginProps> = ({
  activeLevel = "Sentence",
  itemCount = 6
}) => {
  return (
    <div className="margin-content">
      {/* Minimal current type indicator */}
      <div className="margin-section">
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-blueprint)",
            color: "var(--color-text-metadata)",
            opacity: 0.6,
            letterSpacing: "0.1em"
          }}
        >
          ACTIVE
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            fontFamily: "var(--font-mathematical)",
            color: "var(--color-primary)",
            marginTop: "4px"
          }}
        >
          {activeLevel}
        </div>
      </div>

      {/* Minimal count indicator - reactive to current level */}
      <div className="margin-section" style={{ position: "absolute", bottom: "64px" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-blueprint)",
            color: "var(--color-text-metadata)",
            opacity: 0.4
          }}
        >
          {itemCount} items
        </div>
      </div>
    </div>
  )
}
