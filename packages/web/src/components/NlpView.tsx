import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import { Suspense } from "react"
import { nlpRx } from "../services/NlpRx.js"

const DocumentList = () => {
  const documents = useRxValue(nlpRx.documents)
  const createIndex = useRxSet(nlpRx.actions.createBM25Index)

  // Handle the Result type - for now, assume it's successful
  const docList = Array.isArray(documents) ? documents : []

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">Processed Documents</h3>
      <ul className="list-disc pl-5">
        {docList.map((doc) => (
          <li key={doc.documentId} className="mt-2">
            <span>{doc.fileName}</span>
            <button
              onClick={() => createIndex(doc.documentId)}
              className="ml-2 rounded bg-blue-500 px-2 py-1 text-white text-sm hover:bg-blue-600"
            >
              Index
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const SearchResults = () => {
  const searchResults = useRxValue(nlpRx.searchResults)
  const documents = useRxValue(nlpRx.documents)

  // Handle the reactive values properly
  const results = Array.isArray(searchResults) ? searchResults : []
  const docList = Array.isArray(documents) ? documents : []

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">Search Results</h3>
      {results.length > 0 ?
        (
          <ul className="list-disc pl-5">
            {results.map((result) => {
              const doc = docList.find((d) => d.documentId === result.documentId)
              return (
                <li key={result.documentId} className="mt-2">
                  <span>
                    {doc?.fileName ?? "Unknown Document"}: {result.score.toFixed(4)}
                  </span>
                </li>
              )
            })}
          </ul>
        ) :
        <p>No search results yet.</p>}
    </div>
  )
}

export const NlpView = () => {
  const processDocument = useRxSet(nlpRx.actions.processDocument)
  const finalizeIndex = useRxSet(nlpRx.actions.finalizeIndex)
  const searchDocuments = useRxSet(nlpRx.actions.searchDocuments)

  const handleFileUpload = async (file: File) => {
    const content = await file.text()
    const { documentId, fileId } = nlpRx.createProcessFileAction()

    await processDocument({ documentId, fileId, content })
  }

  const handleSearch = async () => {
    const query = prompt("Enter search query:")
    if (query) {
      await searchDocuments(query)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">NLP Pipeline</h2>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <input
          type="file"
          accept=".txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileUpload(file)
            }
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <Suspense fallback={<p>Loading documents...</p>}>
        <DocumentList />
      </Suspense>

      <div className="mt-4 space-x-2">
        <button
          onClick={() => finalizeIndex()}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Finalize Index
        </button>

        <button
          onClick={handleSearch}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
        >
          Search Documents
        </button>
      </div>

      <SearchResults />
    </div>
  )
}
