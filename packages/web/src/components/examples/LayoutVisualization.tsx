import React from "react"
import { ManuscriptPage, ManuscriptPane, ThreePaneLayout } from "../layout/index.js"
import {
  Token,
  TokenBlock,
  TokenGroup,
  TokenLine,
  TokenSchema,
  TokenStream,
  TokenTransformArrow,
  TokenTransformStack
} from "../tokens/index.js"

/**
 * Comprehensive layout visualization showing the manuscript aesthetic
 * and token system in action
 */
export const LayoutVisualization: React.FC = () => {
  return (
    <ManuscriptPage title="Adjoint Engine - Token Analysis">
      <ThreePaneLayout
        leftPane={<DecompositionPane />}
        centerPane={<MorphismPane />}
        rightPane={<AnalysisPane />}
      />
    </ManuscriptPage>
  )
}

/**
 * Left pane - shows source text decomposition into tokens
 */
const DecompositionPane: React.FC = () => {
  return (
    <ManuscriptPane title="Decomposition">
      <TokenStream>
        <TokenBlock label="Document" depth={0}>
          <TokenBlock label="Chapter 1: Introduction" depth={1}>
            <TokenLine depth={2}>
              <Token>The</Token>
              <Token state="active">adjoint</Token>
              <Token state="active">engine</Token>
              <Token>processes</Token>
              <Token>natural</Token>
              <Token>language</Token>
              <Token type="punctuation">.</Token>
            </TokenLine>
            <TokenLine depth={2}>
              <Token>It</Token>
              <Token>transforms</Token>
              <Token state="processing">text</Token>
              <Token>into</Token>
              <Token state="processing">structured</Token>
              <Token state="processing">data</Token>
              <Token type="punctuation">.</Token>
            </TokenLine>
          </TokenBlock>

          <TokenBlock label="Chapter 2: Methodology" depth={1}>
            <TokenLine depth={2}>
              <Token>Each</Token>
              <Token type="subword">sub-</Token>
              <Token>token</Token>
              <Token>represents</Token>
              <Token>a</Token>
              <Token>semantic</Token>
              <Token>unit</Token>
              <Token type="punctuation">.</Token>
            </TokenLine>
          </TokenBlock>
        </TokenBlock>

        <TokenGroup title="Key Terms">
          <TokenLine>
            <Token state="processed">adjoint</Token>
            <Token state="processed">engine</Token>
            <Token state="active">semantic</Token>
            <Token state="pending">morphism</Token>
          </TokenLine>
        </TokenGroup>
      </TokenStream>
    </ManuscriptPane>
  )
}

/**
 * Center pane - shows morphism transformations
 */
const MorphismPane: React.FC = () => {
  return (
    <ManuscriptPane title="Morphism Workspace">
      <TokenTransformStack>
        <TokenSchema label="RawText" state="processed" />
        <TokenTransformArrow />
        <TokenSchema label="Sentence[]" state="processing" />
        <TokenTransformArrow />
        <TokenSchema label="Token[]" state="active" />
        <TokenTransformArrow />
        <TokenSchema label="SemanticNode[]" state="pending" />
      </TokenTransformStack>

      <div style={{ marginTop: "2rem" }}>
        <TokenGroup title="Active Transformation">
          <TokenStream>
            <TokenBlock label="Input" depth={0}>
              <TokenLine>
                <Token>"The adjoint engine processes text."</Token>
              </TokenLine>
            </TokenBlock>

            <TokenBlock label="Processing" depth={0}>
              <TokenLine>
                <Token state="processing">tokenize</Token>
                <Token type="operator">→</Token>
                <Token state="processing">parse</Token>
                <Token type="operator">→</Token>
                <Token state="processing">analyze</Token>
              </TokenLine>
            </TokenBlock>

            <TokenBlock label="Output" depth={0}>
              <TokenLine>
                <Token state="processed">DET</Token>
                <Token state="processed">ADJ</Token>
                <Token state="processed">NOUN</Token>
                <Token state="processed">VERB</Token>
                <Token state="processed">NOUN</Token>
                <Token state="processed">PUNCT</Token>
              </TokenLine>
            </TokenBlock>
          </TokenStream>
        </TokenGroup>
      </div>
    </ManuscriptPane>
  )
}

/**
 * Right pane - shows analysis results and statistics
 */
const AnalysisPane: React.FC = () => {
  return (
    <ManuscriptPane title="Analysis Results">
      <TokenStream>
        <TokenBlock label="Statistics" depth={0}>
          <TokenLine>
            <Token state="processed">Total Tokens: 14</Token>
          </TokenLine>
          <TokenLine>
            <Token state="processed">Unique Words: 12</Token>
          </TokenLine>
          <TokenLine>
            <Token state="processed">Sentences: 2</Token>
          </TokenLine>
          <TokenLine>
            <Token state="processed">Processing Time: 0.23ms</Token>
          </TokenLine>
        </TokenBlock>

        <TokenBlock label="Semantic Analysis" depth={0}>
          <TokenGroup title="Named Entities">
            <TokenLine>
              <Token state="active">adjoint engine</Token>
              <Token type="punctuation">:</Token>
              <Token>SYSTEM</Token>
            </TokenLine>
          </TokenGroup>

          <TokenGroup title="Key Phrases">
            <TokenLine>
              <Token state="processed">natural language</Token>
            </TokenLine>
            <TokenLine>
              <Token state="processed">structured data</Token>
            </TokenLine>
            <TokenLine>
              <Token state="processed">semantic unit</Token>
            </TokenLine>
          </TokenGroup>
        </TokenBlock>

        <TokenBlock label="Graph Structure" depth={0}>
          <TokenLine depth={1}>
            <Token state="active">Root</Token>
          </TokenLine>
          <TokenLine depth={2}>
            <Token>├─ Document</Token>
          </TokenLine>
          <TokenLine depth={3}>
            <Token>├─ Chapter[2]</Token>
          </TokenLine>
          <TokenLine depth={4}>
            <Token>├─ Sentence[3]</Token>
          </TokenLine>
          <TokenLine depth={5}>
            <Token>└─ Token[14]</Token>
          </TokenLine>
        </TokenBlock>
      </TokenStream>
    </ManuscriptPane>
  )
}

/**
 * Simplified example for testing individual components
 */
export const SimpleTokenExample: React.FC = () => {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "1rem", fontFamily: "var(--font-blueprint)" }}>
        Token System Example
      </h2>

      <TokenStream>
        <TokenLine>
          <Token>Simple</Token>
          <Token state="active">token</Token>
          <Token>demonstration</Token>
          <Token type="punctuation">.</Token>
        </TokenLine>

        <TokenBlock label="Nested Structure" depth={0}>
          <TokenLine depth={1}>
            <Token state="processing">Processing</Token>
            <Token>this</Token>
            <Token>text</Token>
          </TokenLine>

          <TokenBlock label="Sub-analysis" depth={1}>
            <TokenLine depth={2}>
              <Token state="processed">Result</Token>
              <Token type="operator">:</Token>
              <Token state="processed">Success</Token>
            </TokenLine>
          </TokenBlock>
        </TokenBlock>
      </TokenStream>
    </div>
  )
}
