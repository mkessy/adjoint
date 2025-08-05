import React from "react"

interface TokenGroupProps {
  children: React.ReactNode
  title?: string
  className?: string
}

/**
 * Token group container for related tokens
 */
export const TokenGroup: React.FC<TokenGroupProps> = ({
  children,
  className = "",
  title
}) => {
  return (
    <div className={`token-group ${className}`}>
      {title && (
        <div className="token-block-header">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Token grid for organized display of token collections
 */
interface TokenGridProps {
  children: React.ReactNode
  className?: string
}

export const TokenGrid: React.FC<TokenGridProps> = ({
  children,
  className = ""
}) => {
  return (
    <div className={`token-grid ${className}`}>
      {children}
    </div>
  )
}

/**
 * Token schema display for transformation visualization
 */
interface TokenSchemaProps {
  label: string
  state?: "active" | "processing" | "processed" | "pending"
  className?: string
}

export const TokenSchema: React.FC<TokenSchemaProps> = ({
  className = "",
  label,
  state = "pending"
}) => {
  return (
    <div
      className={`token-schema ${className}`}
      data-state={state}
    >
      {label}
    </div>
  )
}

/**
 * Transform arrow for showing data flow
 */
export const TokenTransformArrow: React.FC = () => {
  return <div className="token-transform-arrow" />
}

/**
 * Transform stack for morphism visualization
 */
interface TokenTransformStackProps {
  children: React.ReactNode
  className?: string
}

export const TokenTransformStack: React.FC<TokenTransformStackProps> = ({
  children,
  className = ""
}) => {
  return (
    <div className={`token-transform-stack ${className}`}>
      {children}
    </div>
  )
}
