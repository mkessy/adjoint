Let me align the token design system with the layout elements from your attached document, creating a cohesive Tailwind v4-based manuscript aesthetic.

## Unified Layout & Token System

### 1. **Grid Foundation: Aligning with Your 3-Pane Layout**

```css
/* Extend the existing layout with token-specific adaptations */
:root {
  /* Maintain your existing spacing system */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2.5rem;
  --space-6: 4rem;

  /* Token-specific spacing that aligns with the grid */
  --token-block-gap: var(--space-3);
  --token-line-height: calc(var(--space-3) * 1.5);
  --pane-padding: var(--space-4);
}
```

### 2. **Integration with Pane Structure**

```tsx
// DecompositionPane with token visualization
export function DecompositionPane() {
  return (
    <div className="flex flex-col h-full border-r border-ruler-lines">
      <PaneHeader title="Decomposition" />
      <div className="flex-grow overflow-y-auto p-4">
        {/* Token stream integrated with recursive structure */}
        <div className="token-stream">
          <TokenBlock depth={0} label="Book">
            <TokenBlock depth={1} label="Chapter 1">
              <TokenLine depth={2}>
                <Token type="word">The</Token>
                <Token type="word">quick</Token>
                <Token type="word">brown</Token>
                <Token type="word">fox</Token>
              </TokenLine>
              <TokenLine depth={2}>
                <Token type="word">jumps</Token>
                <Token type="word">over</Token>
                <Token type="punctuation">.</Token>
              </TokenLine>
            </TokenBlock>
          </TokenBlock>
        </div>
      </div>
    </div>
  )
}
```

### 3. **Fluid Block Layout CSS**

```css
/* Token blocks that respect the manuscript grid */
.token-block {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-2);
  position: relative;

  /* Inherit depth from parent */
  --block-depth: attr(data-depth number, 0);
  padding-left: calc(var(--block-depth) * var(--space-4));
}

/* Block header - aligns with your PaneHeader style */
.token-block-header {
  font-family: var(--font-blueprint);
  font-size: var(--text-sm);
  color: var(--pencil-gray);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-technical);
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--grid-lines);
  margin-bottom: var(--space-2);
}

/* Token lines - fluid containers */
.token-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  min-height: var(--token-line-height);
  padding: var(--space-1) 0;

  /* Subtle hover state */
  transition: background-color var(--transition-fast);
}

.token-line:hover {
  background-color: var(--highlight-subtle);
}

/* Ensure tokens flow naturally */
.token {
  /* Remove fixed sizing, allow natural flow */
  display: inline-flex;
  align-items: baseline;
  padding: calc(var(--space-1) * 0.5) var(--space-2);
  margin: 0;

  /* Maintain clean borders */
  border: 1px solid transparent;
  border-radius: calc(var(--space-1) * 0.5);

  /* Typography */
  font-family: var(--font-notation);
  font-size: var(--text-base);
  line-height: 1.5;

  /* Smooth transitions */
  transition: all var(--transition-fast) ease-out;
}

/* Active tokens align with your highlight system */
.token:hover,
.token[data-state="active"] {
  border-color: var(--ruler-lines);
  background-color: var(--highlight-subtle);
}
```

### 4. **Margin & Grouping Alignment**

```css
/* Token groups with proper manuscript margins */
.token-group {
  margin: var(--space-3) 0;
  padding: var(--space-3);
  position: relative;

  /* Clean border styling */
  border: 1px solid var(--grid-lines);
  border-radius: var(--space-1);

  /* Nested groups create visual hierarchy */
  .token-group {
    margin: var(--space-2);
    padding: var(--space-2);
    border-style: dashed;
    opacity: 0.95;
  }
}

/* Alignment helpers */
.token-align-left {
  justify-content: flex-start;
}

.token-align-center {
  justify-content: center;
}

.token-align-right {
  justify-content: flex-end;
}

/* Fluid grid for token collections */
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--space-3);
  padding: var(--space-3);
}
```

### 5. **Integration with MorphismWorkspace**

```tsx
// MorphismWorkspace with token transformation
export function MorphismWorkspace() {
  return (
    <div className="flex flex-col h-full border-r border-ruler-lines">
      <PaneHeader title="Morphism" />
      <div className="flex-grow overflow-y-auto p-3">
        {/* Schema tokens that show transformation state */}
        <div className="token-transform-stack">
          <TokenSchema label="Book" state="processed" />
          <TokenTransformArrow />
          <TokenSchema label="Page[]" state="processing" />
          <TokenTransformArrow />
          <TokenSchema label="Sentence[]" state="active" />
          <TokenTransformArrow />
          <TokenSchema label="Person[]" state="pending" />
        </div>
      </div>
    </div>
  )
}
```

### 6. **Responsive Token Components**

```tsx
// Token component that integrates with Tailwind v4
function Token({ type = "word", state = "identity", children }: TokenProps) {
  return (
    <span
      className={`
        token
        ${type === "punctuation" ? "text-pencil-gray" : ""}
        ${type === "subword" ? "text-sm opacity-90" : ""}
        ${state === "active" ? "bg-highlight-subtle border-ruler-lines" : ""}
      `}
      data-type={type}
      data-state={state}
    >
      {children}
    </span>
  )
}

// Block container that maintains manuscript aesthetics
function TokenBlock({ depth = 0, label, children }: TokenBlockProps) {
  return (
    <div
      className="token-block"
      data-depth={depth}
      style={{ "--block-depth": depth } as React.CSSProperties}
    >
      {label && <div className="token-block-header">{label}</div>}
      <div className="token-block-content">{children}</div>
    </div>
  )
}
```

### 7. **Overall Page Blocking**

```css
/* Main content areas respect the manuscript grid */
.manuscript-page {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-4);
  padding: var(--space-4);
  max-width: 100%;
  height: 100%;

  /* Subtle background grid */
  background-image: linear-gradient(var(--grid-lines) 1px, transparent 1px);
  background-size: var(--space-5) var(--space-5);
}

/* Content blocks with proper spacing */
.content-block {
  background: var(--paper-base);
  border: 1px solid var(--ruler-lines);
  border-radius: var(--space-1);
  padding: var(--space-4);
  margin-bottom: var(--space-3);

  /* Ensure content doesn't touch edges */
  > *:first-child {
    margin-top: 0;
  }

  > *:last-child {
    margin-bottom: 0;
  }
}

/* Token containers within content blocks */
.content-block .token-stream {
  margin: calc(var(--space-3) * -1);
  padding: var(--space-3);
  background: transparent;
}
```

### 8. **Tailwind v4 Utilities Integration**

```tsx
// Using Tailwind v4 with our custom token system
export function TokenExample() {
  return (
    <div className="manuscript-page">
      {/* Header section */}
      <header className="content-block">
        <h1 className="font-blueprint text-2xl text-text-charcoal">
          Token Analysis
        </h1>
      </header>

      {/* Main content area */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input pane */}
        <div className="content-block">
          <h2 className="font-technical text-lg mb-3">Source Text</h2>
          <div className="token-stream">
            <TokenLine>
              <Token>The</Token>
              <Token>adjoint</Token>
              <Token>engine</Token>
              <Token>processes</Token>
              <Token>text</Token>
              <Token type="punctuation">.</Token>
            </TokenLine>
          </div>
        </div>

        {/* Output pane */}
        <div className="content-block">
          <h2 className="font-technical text-lg mb-3">Token Tree</h2>
          <TokenBlock depth={0} label="ROOT">
            <TokenBlock depth={1} label="SENTENCE">
              <TokenLine depth={2}>
                <Token state="active">adjoint</Token>
                <Token state="active">engine</Token>
              </TokenLine>
            </TokenBlock>
          </TokenBlock>
        </div>
      </main>
    </div>
  )
}
```

This integrated system:

1. **Maintains your manuscript aesthetic** - Clean, minimal, paper-like
2. **Respects your grid system** - All spacing aligns with your base units
3. **Integrates with your panes** - Tokens work within DecompositionPane, MorphismWorkspace, etc.
4. **Provides fluid layouts** - Tokens flow naturally, no fixed widths
5. **Uses Tailwind v4 patterns** - Leverages CSS variables and modern features
6. **Creates visual hierarchy** - Through consistent spacing and subtle borders

The design ensures that tokens feel like natural extensions of your existing manuscript theme while providing the specialized functionality needed for text manipulation and visualization.
