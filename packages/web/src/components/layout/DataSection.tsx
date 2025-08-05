import React, { useRef } from "react"
import { ContentAside } from "./ContentAside.js"

interface DataSectionProps {
  title: string
  level: number
  data: Array<string>
  isActive?: boolean
  onFocus?: () => void
}

/**
 * Data section component - clean, focused data display with anchored annotations.
 *
 * Design principles:
 * - Minimal visual decoration
 * - Clear hierarchy through spacing
 * - High data density with readability
 * - Section-anchored schema information
 */
export const DataSection: React.FC<DataSectionProps> = ({
  data,
  isActive = false,
  level,
  onFocus,
  title
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isTokenLevel = level >= 3

  // Get schema from reactive state
  const currentSchema = isActive ?
    {
      type: title,
      schema: `Level ${level} Schema`
    } :
    null

  return (
    <div
      ref={sectionRef}
      className={`data-section ${isActive ? "active" : ""}`}
      data-level={level}
      onClick={onFocus}
      style={{ position: "relative" }}
    >
      {/* Section-anchored schema information */}
      {currentSchema && (
        <ContentAside
          side="left"
          visible={isActive}
          anchored={true}
          content={{
            label: "SCHEMA",
            value: currentSchema.type,
            meta: currentSchema.schema
          }}
        />
      )}

      {/* Transform information for active section */}
      {isActive && (
        <ContentAside
          side="right"
          visible={isActive}
          anchored={true}
          content={{
            label: "TRANSFORM",
            value: `Level ${level} → ${level + 1}`,
            meta: `${data.length} items`
          }}
        />
      )}

      <h3 className="data-header">
        Level {level}: {title}
      </h3>

      <div className={`data-content ${isTokenLevel ? "token-layout" : ""}`}>
        {data.map((item, index) => (
          <div
            key={index}
            className="data-item"
            style={{
              marginLeft: level < 3 ? `${level * 8}px` : 0,
              display: isTokenLevel ? "inline-block" : "block",
              marginRight: isTokenLevel ? "8px" : 0,
              marginBottom: isTokenLevel ? "4px" : "8px",
              fontFamily: isTokenLevel ? "var(--font-mono)" : "var(--font-body)",
              fontSize: isTokenLevel ? "var(--text-xs)" : "var(--text-sm)",
              padding: isTokenLevel ? "2px 6px" : "var(--space-xs)",
              backgroundColor: isTokenLevel ? "var(--color-surface-alt)" : "transparent",
              borderRadius: isTokenLevel ? "2px" : 0,
              border: isTokenLevel ? "1px solid var(--color-border-light)" : "none"
            }}
          >
            {!isTokenLevel && (
              <span className="meta-label" style={{ marginRight: "8px" }}>
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// Add styles for token layout
const tokenLayoutStyles = `
  .token-layout {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
`

// Inject styles (in production, this would be in CSS file)
if (typeof document !== "undefined") {
  const style = document.createElement("style")
  style.textContent = tokenLayoutStyles
  document.head.appendChild(style)
}
