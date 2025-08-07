import React, { useCallback, useState } from "react"

interface FileUploadProps {
  onFileProcessed?: (result: unknown) => void
  onError?: (error: Error) => void
  className?: string
}

// Utility function to validate file type and size
const validateFile = async (file: File): Promise<boolean> => {
  const allowedTypes = [".txt", ".md", ".csv", ".json", ".html"]
  const maxSize = 10 * 1024 * 1024 // 10MB

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
  return allowedTypes.includes(extension) && file.size <= maxSize
}

// Utility function to compute file hash for deduplication
const computeFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Utility function to create file upload handler with progress tracking
const createFileUploadHandler = (
  onProgress: (progress: number) => void,
  onError: (error: Error) => void
) => {
  return async (file: File): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadstart = () => onProgress(0)
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded / e.total)
        }
      }

      reader.onload = () => {
        onProgress(1)
        // Simulate processing result
        resolve({
          content: reader.result,
          fileName: file.name,
          size: file.size,
          type: file.type,
          processedAt: new Date().toISOString()
        })
      }

      reader.onerror = () => {
        const error = new Error("Failed to read file")
        onError(error)
        reject(error)
      }

      reader.readAsText(file)
    })
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({
  className = "",
  onError,
  onFileProcessed
}) => {
  // Local component state
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle")

  // File upload handler with progress tracking
  const handleFileUpload = useCallback(
    createFileUploadHandler(
      (progress: number) => setProgress(progress),
      (error: Error) => {
        setIsProcessing(false)
        onError?.(error)
      }
    ),
    [onError]
  )

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setValidationStatus("idle")
    setFileHash(null)

    // Validate file
    const isValid = await validateFile(file)
    setValidationStatus(isValid ? "valid" : "invalid")

    if (isValid) {
      // Compute hash for deduplication check
      try {
        const hash = await computeFileHash(file)
        setFileHash(hash)
      } catch (error) {
        console.warn("Failed to compute file hash:", error)
      }
    }
  }, [])

  // Handle file processing
  const handleProcess = useCallback(async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const result = await handleFileUpload(selectedFile)
      onFileProcessed?.(result)
      setSelectedFile(null)
      setValidationStatus("idle")
      setFileHash(null)
    } catch (error) {
      console.error("File processing failed:", error)
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [selectedFile, handleFileUpload, onFileProcessed])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setValidationStatus("idle")
    setFileHash(null)
    setProgress(0)
  }, [])

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-150 ease-out cursor-pointer
          ${
          isDragging
            ? "border-blue-400 bg-blue-50/50"
            : validationStatus === "valid"
            ? "border-green-300 bg-green-50/30"
            : validationStatus === "invalid"
            ? "border-red-300 bg-red-50/30"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
        }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.html"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
          disabled={isProcessing}
        />

        <label htmlFor="file-upload" className="block p-8 text-center cursor-pointer">
          {selectedFile ?
            (
              <div className="space-y-4">
                {/* File Icon */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{selectedFile.type || "Unknown type"}</span>
                  </div>
                  {fileHash && (
                    <div className="text-xs text-gray-400 font-mono">
                      Hash: {fileHash.substring(0, 12)}...
                    </div>
                  )}
                </div>

                {/* Validation Status */}
                <div className="flex justify-center">
                  {validationStatus === "valid" && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Valid file
                    </div>
                  )}
                  {validationStatus === "invalid" && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Invalid file
                    </div>
                  )}
                  {validationStatus === "idle" && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4">
                        </circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        >
                        </path>
                      </svg>
                      Validating...
                    </div>
                  )}
                </div>
              </div>
            ) :
            (
              <div className="space-y-4">
                {/* Upload Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                </div>

                {/* Upload Text */}
                <div className="space-y-2">
                  <p className="text-base text-gray-700 font-medium">
                    Drop a file here or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports: .txt, .md, .csv, .json, .html (max 10MB)
                  </p>
                </div>
              </div>
            )}
        </label>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Processing file...</span>
            <span className="text-gray-500">{(progress * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {selectedFile && (
          <button
            onClick={handleClear}
            disabled={isProcessing}
            className="
              px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300
              transition-colors duration-150 ease-out
            "
          >
            Clear
          </button>
        )}

        <button
          onClick={handleProcess}
          disabled={!selectedFile || validationStatus !== "valid" || isProcessing}
          className="
            px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600
            transition-colors duration-150 ease-out
          "
        >
          {isProcessing ?
            (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  >
                  </path>
                </svg>
                Processing...
              </span>
            ) :
            (
              "Process File"
            )}
        </button>
      </div>
    </div>
  )
}

export default FileUpload
