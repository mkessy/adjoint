import React from "react"

interface DataStratumProps {
  title: string
  level: number
  data: Array<string>
  isActive?: boolean // Indicates if this is the current transformation focus
}

/**
 * Represents one level of recursive data decomposition.
 *
 * Each stratum shows a step in the structural recursion,
 * from high-level documents down to individual tokens.
 * The visual layout emphasizes the hierarchical nature of the data.
 */
export const DataStratum: React.FC<DataStratumProps> = ({
  data,
  isActive = false,
  level,
  title
}) => {
  return (
    <div className={`data-stratum ${isActive ? "active-stratum" : ""}`}>
      <h2 className="data-stratum-header">
        STRATUM {level}: {title.toUpperCase()}
      </h2>

      <div className={`stratum-content ${level >= 3 ? "token-level" : ""}`}>
        {data.map((item, index) => (
          <div
            key={index}
            className="stratum-item"
            style={{
              marginLeft: level < 3 ? `${level * 8}px` : "0", // No indentation for token level
              backgroundColor: level % 2 === 0 ? "var(--color-paper-warm)" : "var(--color-surface)",
              border: "1px solid var(--color-grid-lines)",
              fontSize: level >= 3 ? "0.75rem" : "0.875rem",
              fontFamily: level >= 3 ? "var(--font-blueprint)" : "var(--font-technical)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-highlight-subtle)"
              e.currentTarget.style.borderColor = "var(--color-primary)"
              e.currentTarget.style.boxShadow = "var(--shadow-subtle)"
              e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = level % 2 === 0
                ? "var(--color-paper-warm)"
                : "var(--color-surface)"
              e.currentTarget.style.borderColor = "var(--color-grid-lines)"
              e.currentTarget.style.boxShadow = "none"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            {/* Index numbers only for non-token levels to maintain density */}
            {level < 3 && (
              <span
                style={{
                  fontSize: "0.625rem",
                  fontFamily: "var(--font-blueprint)",
                  color: "var(--color-text-metadata)",
                  marginRight: "8px",
                  opacity: 0.6
                }}
              >
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
