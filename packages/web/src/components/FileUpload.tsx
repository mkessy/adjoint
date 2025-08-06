import { useRxSetPromise, useRxSuspenseSuccess } from "@effect-rx/rx-react"
import React, { useCallback, useState } from "react"
import {
  cacheStats,
  computeFileHash,
  createFileUploadHandler,
  processFile,
  validateFileBeforeUpload
} from "../services/FileRx.js"

interface FileUploadProps {
  onFileProcessed?: (result: unknown) => void
  onError?: (error: Error) => void
  className?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  className = "",
  onError,
  onFileProcessed
}) => {
  // RX state and actions
  const stats = useRxSuspenseSuccess(cacheStats)
  const processFileAction = useRxSetPromise(processFile)

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
      (progress) => setProgress(progress),
      (error) => {
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
    const isValid = await validateFileBeforeUpload(file)
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

  return (
    <div className={`file-upload ${className}`}>
      {/* Cache Statistics */}
      <div className="cache-stats">
        <small>
          Cache: {stats.size} documents, {(stats.hitRate * 100).toFixed(1)}% hit rate
        </small>
      </div>

      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""} ${validationStatus}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.html"
          onChange={handleFileInputChange}
          className="file-input"
          id="file-upload"
        />

        <label htmlFor="file-upload" className="drop-zone-content">
          {selectedFile ?
            (
              <div className="file-selected">
                <div className="file-info">
                  <strong>{selectedFile.name}</strong>
                  <div className="file-details">
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span>{selectedFile.type || "Unknown type"}</span>
                  </div>
                  {fileHash && (
                    <div className="file-hash">
                      <small>Hash: {fileHash.substring(0, 12)}...</small>
                    </div>
                  )}
                </div>

                <div className={`validation-status ${validationStatus}`}>
                  {validationStatus === "valid" && "✓ Valid"}
                  {validationStatus === "invalid" && "✗ Invalid"}
                  {validationStatus === "idle" && "⏳ Checking..."}
                </div>
              </div>
            ) :
            (
              <div className="drop-zone-placeholder">
                <div className="upload-icon">📁</div>
                <p>Drop a file here or click to select</p>
                <small>Supports: .txt, .md, .csv, .json, .html (max 10MB)</small>
              </div>
            )}
        </label>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="processing-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <small>Processing... {(progress * 100).toFixed(0)}%</small>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={handleProcess}
          disabled={!selectedFile || validationStatus !== "valid" || isProcessing}
          className="process-button"
        >
          {isProcessing ? "Processing..." : "Process File"}
        </button>

        {selectedFile && (
          <button
            onClick={() => {
              setSelectedFile(null)
              setValidationStatus("idle")
              setFileHash(null)
            }}
            className="clear-button"
            disabled={isProcessing}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

export default FileUpload
