import React from "react"

export type TokenType = "word" | "punctuation" | "subword" | "operator"
export type TokenState = "identity" | "active" | "processing" | "processed" | "pending"

interface TokenProps {
  children: React.ReactNode
  type?: TokenType
  state?: TokenState
  onClick?: () => void
  className?: string
}

/**
 * Individual token component with semantic styling
 */
export const Token: React.FC<TokenProps> = ({
  children,
  className = "",
  onClick,
  state = "identity",
  type = "word"
}) => {
  return (
    <span
      className={`token ${className}`}
      data-type={type}
      data-state={state}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </span>
  )
}

/**
 * Token line - horizontal container for flowing tokens
 */
interface TokenLineProps {
  children: React.ReactNode
  depth?: number
  className?: string
}

export const TokenLine: React.FC<TokenLineProps> = ({
  children,
  className = "",
  depth = 0
}) => {
  return (
    <div
      className={`token-line ${className}`}
      style={{ "--block-depth": depth } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * Token block - hierarchical container with optional header
 */
interface TokenBlockProps {
  children: React.ReactNode
  label?: string
  depth?: number
  className?: string
}

export const TokenBlock: React.FC<TokenBlockProps> = ({
  children,
  className = "",
  depth = 0,
  label
}) => {
  return (
    <div
      className={`token-block ${className}`}
      data-depth={depth}
      style={{ "--block-depth": depth } as React.CSSProperties}
    >
      {label && (
        <div className="token-block-header">
          {label}
        </div>
      )}
      <div className="token-block-content">
        {children}
      </div>
    </div>
  )
}

/**
 * Token stream - vertical container for token blocks
 */
interface TokenStreamProps {
  children: React.ReactNode
  className?: string
}

export const TokenStream: React.FC<TokenStreamProps> = ({
  children,
  className = ""
}) => {
  return (
    <div className={`token-stream ${className}`}>
      {children}
    </div>
  )
}
