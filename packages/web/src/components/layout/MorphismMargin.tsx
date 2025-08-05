import React from "react"

interface MorphismMarginProps {
  transformType?: string
  isValid?: boolean
}

/**
 * Right margin - minimal scratch pad for transformation state.
 * Mostly empty space with subtle reactive indicators.
 */
export const MorphismMargin: React.FC<MorphismMarginProps> = ({
  isValid = true,
  transformType = "f: S → T"
}) => {
  return (
    <div className="margin-content">
      {/* Minimal transformation indicator */}
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
          TRANSFORM
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-mathematical)",
            color: "var(--color-text-slate)",
            marginTop: "4px",
            opacity: 0.8
          }}
        >
          {transformType}
        </div>
      </div>

      {/* Minimal verification dot */}
      <div
        className="margin-section"
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)"
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isValid ? "var(--color-primary)" : "#ef4444",
            opacity: 0.6
          }}
        />
      </div>

      {/* Minimal status at bottom */}
      <div className="margin-section" style={{ position: "absolute", bottom: "64px" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "var(--font-blueprint)",
            color: "var(--color-text-metadata)",
            opacity: 0.4
          }}
        >
          {isValid ? "valid" : "error"}
        </div>
      </div>
    </div>
  )
}
