/**
 * Corrected pattern definitions for wink-nlp custom entities
 *
 * Key Rules:
 * 1. [option1|option2] syntax ONLY works for single tokens
 * 2. Multi-word phrases must be written as explicit sequences
 * 3. Hyphenated words tokenize with spaces: "hip-hop" → "hip - hop"
 * 4. Special punctuation tokenizes separately: "feat." → "feat ."
 *
 * Escaping Rules (from wink-nlp docs):
 * - Use ^ to escape and match literals: ^DATE matches "DATE" not a date entity
 * - Use ^^ to match a literal caret: ^^ matches "^"
 * - With matchValue: true, our vocabulary words are matched as literals
 * - Pattern matching order: Entity → Value → POS
 */

// === SINGLE-TOKEN VOCABULARIES ===
// These can be used in [option1|option2] bracket syntax

export const ROLE_SINGLE_TOKENS = [
  "artist",
  "vocalist",
  "singer",
  "drummer",
  "guitarist",
  "bassist",
  "keyboardist",
  "pianist",
  "producer",
  "remixer",
  "dj",
  "composer",
  "arranger",
  "conductor",
  "engineer",
  "songwriter",
  "frontman",
  "bandleader",
  "beatmaker",
  "mc",
  "rapper"
]

export const RELEASE_TYPE_SINGLE_TOKENS = [
  "album",
  "ep",
  "lp",
  "single",
  "record",
  "track",
  "song",
  "mixtape",
  "compilation",
  "soundtrack",
  "demo",
  "release"
]

export const STATUS_SINGLE_TOKENS = [
  "debut",
  "sophomore",
  "latest",
  "new",
  "upcoming",
  "forthcoming",
  "recent",
  "first",
  "second",
  "third",
  "fourth",
  "fifth"
]

export const GENRE_SINGLE_TOKENS = [
  "rock",
  "pop",
  "jazz",
  "blues",
  "folk",
  "punk",
  "metal",
  "electronic",
  "techno",
  "house",
  "ambient",
  "classical",
  "rap",
  "soul",
  "funk",
  "reggae",
  "ska",
  "country",
  "indie",
  "alternative",
  "experimental"
]

export const ATTRIBUTION_SINGLE_TOKENS = [
  "featuring",
  "feat",
  "ft",
  "with",
  "presents"
]

export const GENRE_MODIFIER_SINGLE_TOKENS = [
  "post",
  "neo",
  "nu",
  "new",
  "alt",
  "avant",
  "proto",
  "synth",
  "dream",
  "noise",
  "dark",
  "death",
  "doom",
  "psychedelic",
  "progressive"
]

// === NEW VOCABULARIES ===
export const LOCATION_PREFIXES = [
  "from",
  "in",
  "based in"
]

export const LOCATION_SUFFIXES = [
  "based",
  "native",
  "born"
]

// === MULTI-TOKEN PATTERNS ===
// These must be written as explicit sequences, not in brackets

export const EVENT_VERBS = [
  "accompanying",
  "playing",
  "performing"
]

export const EVENT_MULTI_TOKENS = [
  "performing at",
  "live at",
  "on tour",
  "will play"
]

export const RELEASE_VERBS = [
  "set to release",
  "out on",
  "released",
  "dropped"
]

export const MEDIA_PLATFORMS = [
  "KEXP",
  "NPR",
  "BBC",
  "Pitchfork",
  "Tiny Desk"
]

export const GENRE_MULTI_TOKENS = [
  "hip - hop", // from "hip-hop"
  "r & b", // from "r&b"
  "drum and bass", // three words
  "trip - hop", // from "trip-hop"
  "lo - fi", // from "lo-fi"
  "nu - metal", // from "nu-metal"
  "synth - pop" // from "synth-pop"
]

export const ATTRIBUTION_MULTI_TOKENS = [
  "produced by",
  "remixed by",
  "written by",
  "composed by",
  "arranged by",
  "mixed by",
  "a collaboration with",
  "a new project from",
  "a new project by"
]

export const ROLE_MULTI_TOKENS = [
  "singer - songwriter", // from "singer-songwriter"
  "multi - instrumentalist", // from "multi-instrumentalist"
  "session musician"
]

// === PATTERN BUILDERS ===

/**
 * Creates a bracket pattern from single-token options
 */
const bracket = (tokens: Array<string>): string => `[${tokens.join("|")}]`

/**
 * Combines parts with spaces
 */
const seq = (...parts: Array<string>): string => parts.join(" ")

// === COMPOSED PATTERNS ===

const buildPatterns = () => {
  const _EVENT_BRACKET = bracket(EVENT_VERBS)
  const ROLE_BRACKET = bracket(ROLE_SINGLE_TOKENS)
  const TYPE_BRACKET = bracket(RELEASE_TYPE_SINGLE_TOKENS)
  const STATUS_BRACKET = bracket(STATUS_SINGLE_TOKENS)
  const GENRE_BRACKET = bracket(GENRE_SINGLE_TOKENS)
  const ATTR_BRACKET = bracket(ATTRIBUTION_SINGLE_TOKENS)
  const MOD_BRACKET = bracket(GENRE_MODIFIER_SINGLE_TOKENS)

  return {
    // Basic vocabulary patterns

    // In buildPatterns()
    LOCATION: {
      name: "LOCATION",
      patterns: [
        { pattern: seq("[PROPN]", "-", bracket(LOCATION_SUFFIXES)), mark: [0, 0] },

        // Matches "French band", "Nigerian singer". Tokenizes to `[ADJ] [NOUN]`.
        // Extracts the full two-word phrase.
        { pattern: seq("[ADJ]", ROLE_BRACKET), mark: [0, 1] },
        { pattern: seq("[ADJ]", "band"), mark: [0, 1] }, // Literal fallback for "band"
        { pattern: seq("[ADJ]", "group"), mark: [0, 1] }, // Literal fallback for "group"

        // Matches "from Chicago", "from New Zealand". Tokenizes to `[ADP] [PROPN]...`.
        // Extracts the preposition and the location name.
        { pattern: seq("from", "[PROPN]"), mark: [1, 1] },
        { pattern: seq("from", "[PROPN]", "[PROPN]"), mark: [1, 2] },

        // Matches "based in Montreal". Tokenizes to `[VERB] [ADP] [PROPN]...`.
        // Extracts the full phrase.
        { pattern: seq("based", "in", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("based", "in", "[PROPN]", "[PROPN]"), mark: [2, 3] },

        // Matches "PNW artist".
        // Extracts the full phrase as a known acronym-based location.
        { pattern: "PNW artist", mark: [0, 1] }
      ]
    },

    ROLE: {
      name: "ROLE",
      patterns: [
        ...ROLE_SINGLE_TOKENS,
        ...ROLE_MULTI_TOKENS
      ]
    },

    RELEASE_TYPE: {
      name: "RELEASE_TYPE",
      patterns: RELEASE_TYPE_SINGLE_TOKENS
    },

    STATUS: {
      name: "STATUS",
      patterns: STATUS_SINGLE_TOKENS
    },

    GENRE: {
      name: "GENRE",
      patterns: [
        ...GENRE_SINGLE_TOKENS,
        ...GENRE_MULTI_TOKENS
      ]
    },

    // Attribution patterns
    ATTRIBUTION: {
      name: "ATTRIBUTION",
      patterns: [
        // Single tokens
        // ...ATTRIBUTION_SINGLE_TOKENS,
        // Multi-token phrases
        ...ATTRIBUTION_MULTI_TOKENS,
        // With punctuation variants
        "feat .",
        "ft .",
        // Combined with POS tags - these consume artist names
        // We'll still include them but ARTIST patterns should also match
        seq(ATTR_BRACKET, "[PROPN]"),
        seq(ATTR_BRACKET, "[PROPN]", "[PROPN]"),
        ...ATTRIBUTION_MULTI_TOKENS.map((attr) => seq(attr, "[PROPN]")),
        ...ATTRIBUTION_MULTI_TOKENS.map((attr) => seq(attr, "[PROPN]", "[PROPN]"))
      ]
    },

    // Recording patterns
    RECORDING: {
      name: "RECORDING",
      patterns: [
        // Type only
        TYPE_BRACKET,
        // Status + type
        seq(STATUS_BRACKET, TYPE_BRACKET),
        // For quoted titles, we'll need a different approach
        // For now, focusing on non-quoted patterns
        // Possessive patterns
        seq("[PUNCT]", "[PROPN]", "[PROPN]", "[PROPN]", "[PUNCT]"),
        seq("[PROPN]", "'s", STATUS_BRACKET, TYPE_BRACKET),
        seq("[PROPN]", "[PROPN]", "'s", STATUS_BRACKET, TYPE_BRACKET),
        // The + type patterns
        seq("[DET]", STATUS_BRACKET, TYPE_BRACKET),
        seq("[DET]", TYPE_BRACKET)
      ]
    },

    // Artist patterns
    ARTIST: {
      name: "ARTIST",
      patterns: [
        // Multi-token patterns first to avoid single-letter matches
        "[PROPN] [PROPN]",
        "[PROPN] [PROPN] [PROPN]",
        // The + band name
        // "[DET] [PROPN]",
        "[DET] [PROPN] [PROPN]",
        // Role + name
        seq(ROLE_BRACKET, "[PROPN]"),
        seq(ROLE_BRACKET, "[PROPN]", "[PROPN]"),
        // Name + role (with comma)
        seq("[PROPN]", ",", ROLE_BRACKET),
        seq("[PROPN]", "[PROPN]", ",", ROLE_BRACKET),
        // Titles - these are specific enough
        seq("DJ", "[PROPN]"),
        seq("MC", "[PROPN]"),
        seq("Dr", ".", "[PROPN]"),
        // REMOVED single [PROPN] to prevent matching single letters like "r"
        // But we can add specific single-name artist patterns if needed:
        // Common single-name artists (add more as needed)
        // "[PROPN]",
        // Add pattern for single proper nouns after "from" or "in"
        // seq("from", "[PROPN]"),
        seq("[PROPN]", "[PROPN]?", ",", ROLE_BRACKET),
        // Group with 'and': "Simon and Garfunkel"
        "[PROPN] and [PROPN]",

        // seq("[PROPN] [AUX]"), // Drake is a rapper, Clairo is a
        seq("[PROPN] [PROPN]", "[AUX]", ROLE_BRACKET),
        seq("in", "[PROPN]")
      ]
    },

    // Additional artist patterns that extract from attributions using mark
    // These will extract just the artist name from phrases like "produced by X"
    ARTIST_FROM_ATTR: {
      name: "ARTIST",
      patterns: [
        // Mark extracts just the artist name (last 1-2 tokens)

        { pattern: seq("[PROPN] [AUX]"), mark: [0, 0] }, // Drake is a rapper, Clairo is a
        { pattern: seq("produced", "by", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("produced", "by", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("written", "by", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("written", "by", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("featuring", "[PROPN]"), mark: [1, 1] },
        { pattern: seq("featuring", "[PROPN]", "[PROPN]"), mark: [1, 2] },
        { pattern: seq("feat", ".", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("feat", ".", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("produced by", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("produced by", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("remixed by", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("remixed by", "[PROPN]"), mark: [2, 2] },
        { pattern: seq("featuring", "[PROPN]", "[PROPN]"), mark: [1, 2] },
        { pattern: seq("featuring", "[PROPN]"), mark: [1, 1] },
        { pattern: seq("feat .", "[PROPN]", "[PROPN]"), mark: [2, 3] },
        { pattern: seq("feat .", "[PROPN]"), mark: [2, 2] }
      ]
    },

    // Modified genre patterns
    GENRE_MODIFIED: {
      name: "GENRE_MODIFIED",
      patterns: [
        // Modifier + genre
        seq(MOD_BRACKET, GENRE_BRACKET),
        // Modifier + hyphen + genre (for compound genres)
        seq(MOD_BRACKET, "-", GENRE_BRACKET),
        // Geographic + genre
        seq("[PROPN]", GENRE_BRACKET),
        // Era + genre
        seq("[CARDINAL]", "s", GENRE_BRACKET), // "80s rock"
        seq("'", "[CARDINAL]", "s", GENRE_BRACKET) // "'90s hip-hop"
      ]
    }
    // In buildPatterns()
  }
}

// === EXPORT PATTERNS ===

const patterns = buildPatterns()

export type PATTERN_ENTITY =
  | "LOCATION"
  | "GENRE"
  | "GENRE_MODIFIED"
  | "ROLE"
  | "RELEASE_TYPE"
  | "STATUS"
  | "RECORDING"
  | "ATTRIBUTION"
  | "ARTIST_FROM_ATTR"
  | "ARTIST"

/**
 * Get patterns in wink-nlp format
 * Order matters! More specific patterns should come before more general ones.
 */
export const getWinkPatterns = () => {
  // Define explicit order to ensure specific patterns match before general ones
  const orderedKeys = [
    "LOCATION",
    "GENRE", // Match genres before they could be consumed by ARTIST
    "GENRE_MODIFIED", // Modified genres before basic genres
    "ROLE", // Roles before they're part of ARTIST patterns
    "RELEASE_TYPE", // Release types
    "STATUS", // Status modifiers
    "RECORDING", // Recording patterns (can include quotes)
    "ATTRIBUTION", // Attribution patterns
    "ARTIST_FROM_ATTR", // Extract artists from attribution phrases
    "ARTIST" // ARTIST should be last as it has general [PROPN] patterns
  ]

  return orderedKeys.flatMap((key) => {
    const pattern = patterns[key as keyof typeof patterns]
    if (!pattern) {
      throw new Error(`Pattern ${key} not found in patterns object`)
    }
    // Patterns can be either strings or objects with mark
    const processedPatterns = pattern.patterns.flatMap((p) => {
      // If it's an object with pattern and mark, return it properly formatted
      if (typeof p === "object" && p.pattern && p.mark) {
        return {
          name: pattern.name,
          patterns: [p.pattern],
          mark: p.mark
        }
      }
      // For regular string patterns, we'll batch them together
      return null
    }).filter(Boolean)

    // Get all string patterns
    const stringPatterns = pattern.patterns.filter((p) => typeof p === "string")

    // If we have string patterns, add them as a single entry
    if (stringPatterns.length > 0) {
      processedPatterns.unshift({
        name: pattern.name,
        patterns: stringPatterns
      } as any)
    }

    return processedPatterns
  })
}

/**
 * Named exports for direct access
 */
export const COMPOSED_PATTERNS = getWinkPatterns()

/**
 * Debug helper
 */
export const inspectPatterns = () => {
  console.log("=== MUSIC NLP PATTERNS ===\n")

  Object.entries(patterns).forEach(([key, { name: _name, patterns }]) => {
    console.log(`${key} (${patterns.length} patterns):`)

    // Show first 5 examples
    patterns.slice(0, 5).forEach((p) => {
      if (typeof p === "string") {
        console.log(`  - "${p}"`)
      } else if (p && p.pattern) {
        console.log(`  - "${p.pattern}" (with mark: [${p.mark}])`)
      }
    })

    if (patterns.length > 5) {
      console.log(`  ... and ${patterns.length - 5} more\n`)
    } else {
      console.log()
    }
  })

  // Show tokenization examples
  console.log("TOKENIZATION REMINDERS:")
  console.log("  \"hip-hop\" → \"hip - hop\"")
  console.log("  \"r&b\" → \"r & b\"")
  console.log("  \"feat.\" → \"feat .\"")
  console.log("  \"Dr. Dre\" → \"Dr . Dre\"")
}
