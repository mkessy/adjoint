# High-Performance In-Browser NLP Pipeline: Implementation Plan

## 1. Introduction

This document outlines the implementation plan for a high-performance, in-browser NLP processing pipeline. The primary goals are:

1.  **UI Responsiveness:** To offload all heavy computation to a Web Worker pool, ensuring the main UI thread remains completely unblocked and responsive at all times.
2.  **Memory & Performance:** To implement a memory-efficient and computationally-fast graph data structure using `TypedArray`s. This is critical for handling hundreds of thousands of nodes (tokens, sentences, etc.) derived from large documents.
3.  **Clarity & Maintainability:** To establish a clear, type-safe, and efficient communication protocol between the main thread and the worker pool, leveraging `effect-ts`.

## 2. Architecture Overview

The system will be split into two main contexts: the **Main Thread** and the **NLP Worker**.

*   **Main Thread:** Responsible for the UI, user interactions, and overall application state. It will not perform any NLP computation. It will host a "proxy" `NlpProcessingService` that delegates all work to the worker.
*   **NLP Worker:** A dedicated background thread that runs the actual `NlpProcessingServiceLive` implementation from `processing.ts`. It will handle file parsing, NLP processing (tokenization, etc.), indexing, and storing the resulting data structures.

```
+-------------------------------------------------++
|                  Main Thread                    |
| +-------------------------------------------+   |
| |              Application UI               |   |
| +-------------------------------------------+   |
| +-------------------------------------------+   |
| |         NlpProcessingService Proxy        |   |
| | (Implements the service interface)        |   |
| +-------------------------------------------+   |
+----------------------|--------------------------++
                       |
            postMessage(request) / onmessage(response)
                       |
+----------------------|--------------------------++
|                   NLP Worker                    |
| +-------------------------------------------+   |
| |        NlpProcessingServiceLive           |   |
| | (Actual implementation from processing.ts)|   |
| +-------------------------------------------+   |
| +-------------------------------------------+   |
| |             NlpGraph Storage              |   |
| |           (TypedArray-based)              |   |
| +-------------------------------------------+   |
+-------------------------------------------------++
```

## 3. Data Structure: `NlpGraph`

To handle large graphs efficiently, we will move away from standard JavaScript objects (`{id: ..., text: ...}`) for in-memory nodes and edges. Instead, we'll use a columnar, `TypedArray`-based approach.

### Rationale

*   **Memory Efficiency:** `TypedArray`s store numeric data compactly with no per-object overhead, drastically reducing memory usage for large graphs.
*   **Cache Locality:** Iterating over a single property for all nodes (e.g., `nodeType`) is extremely fast because the data is contiguous in memory, leading to fewer CPU cache misses. This is the key to "rapid manipulation".
*   **Zero-Copy Transfers:** The underlying `ArrayBuffer`s can be transferred between the main thread and workers instantly using the Transferable Objects API, making communication near-instantaneous.

### Proposed Schema (`NlpGraph.ts`)

This class will hold the structured data for a single processed document.

```typescript
// A simplified representation of node types for the graph
export enum NodeType {
  Token = 0,
  Sentence = 1,
  Entity = 2,
}

// A simplified representation of edge types
export enum EdgeType {
  Dependency = 0, // e.g., from a token to its head in a dependency parse
  NextToken = 1,
  SentenceContainsToken = 2,
}

export class NlpGraph {
  // --- Node Data (Columnar) ---
  // Each index `i` corresponds to node `i`.

  // What type of thing is this node? (e.g., Token, Sentence)
  private nodeType: Uint8Array;
  // For a token/sentence node, which index in the original wink-nlp result array does it correspond to?
  // This allows us to look up the full object with text, etc., when needed.
  private nodeSourceIndex: Uint32Array;
  // The ID of the parent node (e.g., a token's parent is its sentence node ID).
  private nodeParentId: Uint32Array;

  // --- Edge Data (Adjacency List style) ---
  // Each index `i` corresponds to edge `i`.

  private edgeSourceNodeId: Uint32Array;
  private edgeTargetNodeId: Uint32Array;
  private edgeType: Uint8Array;

  // To make lookups fast, we need an index.
  // Maps a node ID to the starting index in the edge arrays for that node's outgoing edges.
  private nodeEdgeStartIndex: Uint32Array;
  private nodeEdgeCount: Uint32Array;

  private capacity: number;
  private nodeCount = 0;
  private edgeCount = 0;

  constructor(initialCapacity = 10000) {
    this.capacity = initialCapacity;
    // Initialize TypedArrays with a given capacity
    this.nodeType = new Uint8Array(this.capacity);
    this.nodeSourceIndex = new Uint32Array(this.capacity);
    this.nodeParentId = new Uint32Array(this.capacity);
    // ... and so on for all arrays
  }

  // Implementation details for addNode, addEdge, getNeighbors...
}
```

## 4. Implementation Plan

### Phase 1: Worker Setup and Communication Protocol

1.  **Create Worker Entry Point (`nlp.worker.ts`):**
    *   This file will be the main script for the Web Worker.
    *   It will import `Layer`, `Effect`, and `NlpProcessingServiceLive` from your domain package.
    *   It will create the live layer and run an `Effect` that listens for messages from the main thread, executes the corresponding service method, and posts the result back.

2.  **Define Message Protocol:**
    *   The existing `Data.TaggedClass` and `Data.TaggedError` models (`FileUploadSuccess`, `NlpProcessingError`, etc.) are already perfectly serializable and can be used directly as message payloads.
    *   We will wrap them in a request/response structure to handle asynchronous replies.

    ```typescript
    // Example message types
    type NlpWorkerRequest = {
      requestId: string;
      method: keyof NlpProcessingService;
      args: any[];
    };

    type NlpWorkerResponse = {
      requestId: string;
      result: { _tag: "Success"; value: any } | { _tag: "Failure"; error: any };
    };
    ```

3.  **Create Main Thread Proxy (`NlpProcessingServiceProxy.ts`):**
    *   This will be a new `Layer` that provides the `NlpProcessingService`.
    *   It will implement the service interface (`uploadFile`, `processDocument`, etc.).
    *   Each method will:
        *   Generate a unique `requestId`.
        *   `postMessage` to the worker with the `NlpWorkerRequest`.
        *   Return an `Effect` that asynchronously resolves when a `NlpWorkerResponse` with the matching `requestId` is received. This can be managed with a `Map<requestId, Deferred>` or by using helpers from `@effect/platform-browser`.

### Phase 2: `NlpGraph` Implementation & Integration

1.  **Build the `NlpGraph` Class:**
    *   Implement the methods `addNode`, `addEdge`, `getNeighbors`, etc.
    *   `addNode` will increment `nodeCount` and append data to the `node*` arrays. It must handle resizing the underlying `ArrayBuffer`s if `nodeCount` exceeds `capacity`.
    *   `getNeighbors(nodeId: number, edgeType?: EdgeType)` will use the `nodeEdgeStartIndex` and `nodeEdgeCount` to efficiently find all outgoing edges for a given node and filter them.

2.  **Integrate `NlpGraph` into `NlpProcessingServiceLive`:**
    *   The `NlpProcessingServiceLive` (running in the worker) will be modified.
    *   The service will now manage a map of `documentId -> { graph: NlpGraph, originalTokens: Types.Token[], ... }`.
    *   The `processDocument` function will, after getting `sentences` and `tokens` from `wink-nlp`, instantiate and populate the `NlpGraph` for that document.
        *   For each sentence, call `graph.addNode(...)`.
        *   For each token, call `graph.addNode(...)`, storing the sentence's node ID as its parent.
        *   Create edges (e.g., `EdgeType.SentenceContainsToken`) between the sentence and its tokens.

### Phase 3: Access Patterns and Performance Imperatives

1.  **Implement Graph Access Patterns:**
    *   **The main thread will never receive the entire `NlpGraph` object.** This is a core principle.
    *   To query the graph, the main thread will send specific messages to the worker, e.g., `{ requestId: '...', method: 'getNeighbors', args: [documentId, nodeId] }`.
    *   The worker will execute the query on its stored `NlpGraph` instance and `postMessage` the results back. The results must be simple, serializable data, not complex objects.

2.  **Performance Imperatives (Checklist):**
    *   **[ ] Use Transferable Objects:** When sending the initial file `content` (a large string) to the worker, it must be encoded into a `Uint8Array` and its `buffer` **transferred**, not copied.
        ```javascript
        // Main Thread
        const encoder = new TextEncoder();
        const contentBuffer = encoder.encode(fileContent).buffer;
        worker.postMessage({ ... }, [contentBuffer]); // The array in the 2nd arg lists transferables
        ```
    *   **[ ] Minimize Worker->Main Thread Data:** Only send back the data the UI actually needs to display. For example, a search result should return a list of document IDs and scores, not the full document content.
    *   **[ ] Batching:** The `processBatch` function is already well-suited for this architecture. The proxy can send multiple `processDocument` requests, and the worker can process them concurrently using `Effect.forEach`.
    *   **[ ] Hot Path Optimization:** All loops inside `NlpGraph` methods must avoid object allocation and use direct array index access for maximum speed.

---

This plan provides a clear path to building a robust, scalable, and highly performant NLP system within the browser, leveraging modern APIs and the power of `effect-ts` for structured concurrency and state management.
