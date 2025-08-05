import React from "react"

interface CommutativeSquareProps {
  fromSchema: string
  toSchema: string
  verificationState: "pending" | "processing" | "success" | "error"
}

/**
 * Visual representation of a commutative diagram showing the formal proof
 * that a transformation preserves algebraic structure.
 *
 * This is a key component of the computational manuscript - it provides
 * interactive visual verification that morphisms compose correctly.
 */
export const CommutativeSquare: React.FC<CommutativeSquareProps> = ({
  fromSchema,
  toSchema,
  verificationState
}) => {
  const getStateColor = () => {
    switch (verificationState) {
      case "success":
        return "#10b981"
      case "error":
        return "#ef4444"
      case "processing":
        return "#f59e0b"
      default:
        return "var(--color-border-pencil)"
    }
  }

  const getStateBackground = () => {
    switch (verificationState) {
      case "success":
        return "#d1fae5"
      case "error":
        return "#fee2e2"
      case "processing":
        return "#fef3c7"
      default:
        return "var(--color-surface)"
    }
  }

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: getStateBackground(),
        border: `2px solid ${getStateColor()}`,
        borderRadius: "8px",
        position: "relative"
      }}
    >
      {/* Top row of the square */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >
        <div className="schema-node">
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-ruler-lines)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-blueprint)",
              fontWeight: 600
            }}
          >
            {fromSchema}
          </div>
        </div>

        {/* Horizontal arrow */}
        <div
          style={{
            flex: 1,
            height: "2px",
            backgroundColor: getStateColor(),
            margin: "0 12px",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-4px",
              top: "-3px",
              width: "8px",
              height: "8px",
              borderRight: `2px solid ${getStateColor()}`,
              borderTop: `2px solid ${getStateColor()}`,
              transform: "rotate(45deg)"
            }}
          />
        </div>

        <div className="schema-node">
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-ruler-lines)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-blueprint)",
              fontWeight: 600
            }}
          >
            {toSchema}
          </div>
        </div>
      </div>

      {/* Vertical arrows */}
      <div
        style={{
          position: "absolute",
          left: "32px",
          top: "50px",
          width: "2px",
          height: "20px",
          backgroundColor: getStateColor()
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-4px",
            left: "-3px",
            width: "8px",
            height: "8px",
            borderRight: `2px solid ${getStateColor()}`,
            borderBottom: `2px solid ${getStateColor()}`,
            transform: "rotate(45deg)"
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          right: "32px",
          top: "50px",
          width: "2px",
          height: "20px",
          backgroundColor: getStateColor()
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-4px",
            left: "-3px",
            width: "8px",
            height: "8px",
            borderRight: `2px solid ${getStateColor()}`,
            borderBottom: `2px solid ${getStateColor()}`,
            transform: "rotate(45deg)"
          }}
        />
      </div>

      {/* Bottom row of the square */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div className="schema-node">
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-ruler-lines)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-blueprint)",
              fontWeight: 600
            }}
          >
            List&lt;{fromSchema}&gt;
          </div>
        </div>

        {/* Bottom horizontal arrow */}
        <div
          style={{
            flex: 1,
            height: "2px",
            backgroundColor: getStateColor(),
            margin: "0 12px",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-4px",
              top: "-3px",
              width: "8px",
              height: "8px",
              borderRight: `2px solid ${getStateColor()}`,
              borderTop: `2px solid ${getStateColor()}`,
              transform: "rotate(45deg)"
            }}
          />
        </div>

        <div className="schema-node">
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-ruler-lines)",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-blueprint)",
              fontWeight: 600
            }}
          >
            List&lt;{toSchema}&gt;
          </div>
        </div>
      </div>

      {/* Center verification indicator */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "1.25rem",
          color: getStateColor()
        }}
      >
        {verificationState === "success" && "✓"}
        {verificationState === "error" && "✗"}
        {verificationState === "processing" && "⟳"}
        {verificationState === "pending" && "○"}
      </div>
    </div>
  )
}
