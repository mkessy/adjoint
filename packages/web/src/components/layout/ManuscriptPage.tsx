import React from "react"

interface ManuscriptPageProps {
  children: React.ReactNode
  title?: string
}

/**
 * Main manuscript page container with grid background and proper spacing
 */
export const ManuscriptPage: React.FC<ManuscriptPageProps> = ({
  children,
  title
}) => {
  return (
    <div className="manuscript-page">
      {title && (
        <header className="pane-header">
          <h1>{title}</h1>
        </header>
      )}
      <main className="manuscript-content">
        {children}
      </main>
    </div>
  )
}

/**
 * Three-pane layout for decomposition, morphism, and analysis
 */
interface ThreePaneLayoutProps {
  leftPane: React.ReactNode
  centerPane: React.ReactNode
  rightPane: React.ReactNode
}

export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({
  centerPane,
  leftPane,
  rightPane
}) => {
  return (
    <div className="three-pane-layout">
      {leftPane}
      {centerPane}
      {rightPane}
    </div>
  )
}

/**
 * Individual pane container with header and scrollable content
 */
interface ManuscriptPaneProps {
  title: string
  children: React.ReactNode
  className?: string
}

export const ManuscriptPane: React.FC<ManuscriptPaneProps> = ({
  children,
  className = "",
  title
}) => {
  return (
    <div className={`manuscript-pane ${className}`}>
      <header className="pane-header">
        {title}
      </header>
      <div className="pane-content">
        {children}
      </div>
    </div>
  )
}
