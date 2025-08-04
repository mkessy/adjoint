/**
 * Configuration schema for the NlpService.
 * Allows for declarative and type-safe configuration.
 */
interface WinkConfig {
  includeCustomEntities: boolean
  customEntities: Array<CustomEntityExample>
}

const DefaultConfig: WinkConfig = {
  includeCustomEntities: true,
  customEntities: COMPOSED_PATTERNS as unknown as Array<CustomEntityExample>
}

/**
 * Creates the NlpService layer with optional configuration.
 * This is the primary entry point for creating the service.
 *
 * @param config Optional configuration for the NLP service.
 * @returns A Layer providing the live NlpService.
 */
export const Make = (config: WinkConfig = DefaultConfig): Layer.Layer<Nlp.Nlp> =>
  Layer.sync(
    Nlp.Nlp,
    () => {
      // --- 1. Configure and Initialize the NLP Engine ---
      const nlp = winkNLP(model, ["sbd", "ner", "pos", "cer"])
      const its = nlp.its

      // Conditionally add our custom entity patterns.
      if (config.includeCustomEntities) {
        nlp.learnCustomEntities(config.customEntities, {
          matchValue: true,
          usePOS: true,
          useEntity: true
        })
      }

      // --- 2. Core Implementation ---

      /**
       * Process text and produce complete AnalyzedText
       * Following the exact algorithm provided in the documentation
       */
      const _processText = (text: string): Nlp.AnalyzedText => {
        const doc = nlp.readDoc(text)
        const sentences: Array<Nlp.Sentence> = []
        const allMentions: Array<EntityResolution.Mention> = []

        // Step 1: Process the document sentence by sentence
        doc.sentences().each((sentenceItem: any, sentenceIndex: number) => {
          // Step 3: Get sentence span and text
          const sentenceSpan = sentenceItem.out(its.span) // [start, end] tuple
          const sentenceText = sentenceItem.out() // raw text of sentence
          const sentenceTokens: Array<Nlp.Token> = []

          // Step 6: Track position within the sentence
          let currentSentenceOffset = 0

          // Step 5: Iterate through tokens within the sentence
          sentenceItem.tokens().each((tokenItem: any, _tokenIdx: number) => {
            // Step 7a: Get token text
            const tokenText = tokenItem.out()

            // Step 7b: Find token position within sentence text
            const tokenStartInSentence = sentenceText.indexOf(
              tokenText,
              currentSentenceOffset
            )

            // Step 7c-d: Calculate absolute positions
            const absoluteStart = sentenceSpan[0] + tokenStartInSentence
            const absoluteEnd = absoluteStart + tokenText.length

            // Step 8: Construct Token with span
            const domainToken = new Nlp.Token({
              text: tokenText,
              span: Nlp.Span(absoluteStart, absoluteEnd),
              sentenceIndex
            })
            sentenceTokens.push(domainToken)

            // Step 7f: Update cursor for next token
            currentSentenceOffset = tokenStartInSentence + tokenText.length
          })

          // Create Sentence object with its tokens
          const domainSentence = new Nlp.Sentence({
            text: sentenceText,
            span: Nlp.Span(sentenceSpan[0], sentenceSpan[1]),
            tokens: sentenceTokens,
            index: sentenceIndex
          })
          sentences.push(domainSentence)
        })

        // Extract entities as Mentions
        doc.entities().each((entity: any) => {
          const entityDetail = entity.out(its.detail)
          const entitySpan = entity.out(its.span)

          allMentions.push(
            new EntityResolution.Mention({
              id: EntityResolution.MentionId.make(Crypto.randomUUID()),
              text: entityDetail.value,
              span: Nlp.Span(entitySpan[0], entitySpan[1]),
              status: EntityResolution.ResolutionStatus.Pending({ method: "search" })
            })
          )
        })

        // Extract custom entities if enabled
        if (config.includeCustomEntities) {
          doc.customEntities().each((entity: any) => {
            const entityDetail = entity.out(its.detail)
            const entitySpan = entity.out(its.span)

            allMentions.push(
              new EntityResolution.Mention({
                id: EntityResolution.MentionId.make(Crypto.randomUUID()),
                text: entityDetail.value,
                span: Nlp.Span(entitySpan[0], entitySpan[1]),
                status: EntityResolution.ResolutionStatus.Pending({ method: "search" })
              })
            )
          })
        }

        // Generate deterministic ID from text hash
        const id = Crypto.createHash("sha256")
          .update(text)
          .digest("hex")
          .substring(0, 12)

        return new Nlp.AnalyzedText({
          id,
          rawText: text,
          sentences,
          mentions: allMentions
        })
      }

      // --- 3. Public Service Interface Implementation ---

      return Nlp.Nlp.of({
        processText: (text: string) => Effect.sync(() => _processText(text))
      })
    }
  )

/**
 * A default, pre-configured NlpService layer for common use cases.
 */
export const Default = Make()
