import React from "react"

interface ContentAsideProps {
  side: "left" | "right"
  visible?: boolean
  anchored?: boolean // Whether to anchor to parent section
  content?: {
    label: string
    value: string
    meta?: string
  }
}

/**
 * Section-anchored annotation component for schema information.
 *
 * Observable-inspired design:
 * - Anchors to data section headers
 * - Sans-serif for data/schema readability
 * - Appears only when contextually relevant
 * - Minimal visual footprint
 */
export const ContentAside: React.FC<ContentAsideProps> = ({
  anchored = false,
  content,
  side,
  visible = false
}) => {
  if (!content || !visible) return null

  const anchoredStyles = anchored ?
    {
      position: "absolute" as const,
      top: 0,
      [side === "left" ? "right" : "left"]: "calc(100% + var(--space-md))",
      width: "200px",
      opacity: visible ? 1 : 0
    } :
    {}

  return (
    <div
      className={`content-aside ${side} ${visible ? "visible" : ""} ${anchored ? "anchored" : ""}`}
      style={anchoredStyles}
    >
      <div
        className="meta-label"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: "var(--color-text-muted)",
          marginBottom: "4px"
        }}
      >
        {content.label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text)",
          marginTop: "4px",
          fontWeight: 500
        }}
      >
        {content.value}
      </div>
      {content.meta && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            marginTop: "8px",
            padding: "4px 6px",
            backgroundColor: "var(--color-surface-alt)",
            borderRadius: "2px",
            border: "1px solid var(--color-border-light)",
            lineHeight: 1.4
          }}
        >
          {content.meta}
        </div>
      )}
    </div>
  )
}
