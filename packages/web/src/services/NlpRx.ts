/**
 * Web Services Layer: NLP Reactive Objects
 * Re-exports domain Rx objects and creates web-specific UI state
 * Following the web services layer patterns
 */

import {
  nlpActionsRx,
  NlpRxRuntime,
  processedDocumentsRx,
  searchResultsRx
} from "@adjoint/domain/engine/services/NlpRxRuntime"
import * as Types from "@adjoint/domain/nlp/types"
import { Rx } from "@effect-rx/rx"

// --- Re-export Domain Reactive Values ---
export { nlpActionsRx, NlpRxRuntime, processedDocumentsRx, searchResultsRx }

// --- Web-Specific UI State ---

// UI state for file upload progress
export const isUploadingRx = Rx.make<boolean>(false)

// UI state for current search query
export const currentSearchQueryRx = Rx.make<string>("")

// UI state for selected document
export const selectedDocumentIdRx = Rx.make<Types.DocumentId | null>(null)

// UI state for processing status
export const processingStatusRx = Rx.make<"idle" | "processing" | "indexing" | "searching">("idle")

// --- Helper Functions for File Processing ---

export const createProcessFileAction = () => {
  const documentId = Types.generateDocumentId()
  const fileId = Types.generateFileId()

  return {
    documentId,
    fileId,
    // This will be used with useRxSetPromise in React components
    params: { documentId, fileId, content: "" } // Content will be read in the component
  }
}

// --- Grouped Exports ---

export const nlpRx = {
  // Domain reactive values
  documents: processedDocumentsRx,
  searchResults: searchResultsRx,

  // UI state
  isUploading: isUploadingRx,
  currentSearchQuery: currentSearchQueryRx,
  selectedDocumentId: selectedDocumentIdRx,
  processingStatus: processingStatusRx,

  // Actions
  actions: nlpActionsRx,

  // Helper functions
  createProcessFileAction
}
