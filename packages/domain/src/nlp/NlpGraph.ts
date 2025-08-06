// A simplified representation of node types for the graph
export enum NodeType {
  Token = 0,
  Sentence = 1,
  Entity = 2
}

// A simplified representation of edge types
export enum EdgeType {
  Dependency = 0, // e.g., from a token to its head in a dependency parse
  NextToken = 1,
  SentenceContainsToken = 2
}

/**
 * A memory-efficient, TypedArray-based graph structure for NLP data.
 * This class uses a columnar storage layout to drastically reduce memory overhead
 * and improve cache locality for operations that iterate over graph nodes or edges.
 */
export class NlpGraph {
  // --- Node Data (Columnar) ---
  // Each index `i` corresponds to node `i`.

  // What type of thing is this node? (e.g., Token, Sentence)
  private nodeType: Uint8Array
  // For a token/sentence node, which index in the original wink-nlp result array does it correspond to?
  // This allows us to look up the full object with text, etc., when needed.
  private nodeSourceIndex: Uint32Array
  // The ID of the parent node (e.g., a token's parent is its sentence node ID).
  private nodeParentId: Uint32Array

  // --- Edge Data (Adjacency List style) ---
  // Each index `i` corresponds to edge `i`.

  private edgeSourceNodeId: Uint32Array
  private edgeTargetNodeId: Uint32Array
  private edgeType: Uint8Array

  // To make lookups fast, we need an index.
  // Maps a node ID to the starting index in the edge arrays for that node's outgoing edges.
  private nodeEdgeStartIndex: Uint32Array
  private nodeEdgeCount: Uint32Array

  private nodeCapacity: number
  private edgeCapacity: number
  private nodeCount = 0
  private edgeCount = 0

  private isIndexBuilt = false

  constructor(options: { nodeCapacity?: number; edgeCapacity?: number } = {}) {
    this.nodeCapacity = options.nodeCapacity ?? 10000
    this.edgeCapacity = options.edgeCapacity ?? this.nodeCapacity // Default to same capacity

    // Initialize TypedArrays with a given capacity
    this.nodeType = new Uint8Array(this.nodeCapacity)
    this.nodeSourceIndex = new Uint32Array(this.nodeCapacity)
    this.nodeParentId = new Uint32Array(this.nodeCapacity)

    this.edgeSourceNodeId = new Uint32Array(this.edgeCapacity)
    this.edgeTargetNodeId = new Uint32Array(this.edgeCapacity)
    this.edgeType = new Uint8Array(this.edgeCapacity)

    // These are populated by buildIndex()
    this.nodeEdgeStartIndex = new Uint32Array(this.nodeCapacity)
    this.nodeEdgeCount = new Uint32Array(this.nodeCapacity)
  }

  /**
   * Doubles the storage capacity of the graph's internal TypedArrays.
   * This is an expensive operation and should be called infrequently.
   */
  private resize(newCapacity: number) {
    // This is a simplified resize. A more robust implementation would
    // handle node and edge capacities separately.
    if (newCapacity > this.nodeCapacity) {
      this.nodeCapacity = newCapacity
      const newNodeType = new Uint8Array(newCapacity)
      const newNodeSourceIndex = new Uint32Array(newCapacity)
      const newNodeParentId = new Uint32Array(newCapacity)

      newNodeType.set(this.nodeType)
      newNodeSourceIndex.set(this.nodeSourceIndex)
      newNodeParentId.set(this.nodeParentId)

      this.nodeType = newNodeType
      this.nodeSourceIndex = newNodeSourceIndex
      this.nodeParentId = newNodeParentId
    }

    if (newCapacity > this.edgeCapacity) {
      this.edgeCapacity = newCapacity
      const newEdgeSourceNodeId = new Uint32Array(newCapacity)
      const newEdgeTargetNodeId = new Uint32Array(newCapacity)
      const newEdgeType = new Uint8Array(newCapacity)

      newEdgeSourceNodeId.set(this.edgeSourceNodeId)
      newEdgeTargetNodeId.set(this.edgeTargetNodeId)
      newEdgeType.set(this.edgeType)

      this.edgeSourceNodeId = newEdgeSourceNodeId
      this.edgeTargetNodeId = newEdgeTargetNodeId
      this.edgeType = newEdgeType
    }
  }

  /**
   * Adds a new node to the graph.
   * @returns The ID of the newly created node.
   */
  public addNode(type: NodeType, sourceIndex: number, parentId: number): number {
    if (this.nodeCount >= this.nodeCapacity) {
      this.resize(this.nodeCapacity * 2)
    }

    const nodeId = this.nodeCount
    this.nodeType[nodeId] = type
    this.nodeSourceIndex[nodeId] = sourceIndex
    this.nodeParentId[nodeId] = parentId
    this.nodeEdgeCount[nodeId] = 0

    this.nodeCount++
    return nodeId
  }

  /**
   * Adds a new edge to the graph.
   * @returns The ID of the newly created edge.
   */
  public addEdge(sourceNodeId: number, targetNodeId: number, type: EdgeType): number {
    if (this.isIndexBuilt) {
      throw new Error("Cannot add edges after the index has been built.")
    }
    if (this.edgeCount >= this.edgeCapacity) {
      this.resize(this.edgeCapacity * 2)
    }
    if (sourceNodeId >= this.nodeCount || targetNodeId >= this.nodeCount) {
      throw new Error("Edge connects to a non-existent node.")
    }

    const edgeId = this.edgeCount
    this.edgeSourceNodeId[edgeId] = sourceNodeId
    this.edgeTargetNodeId[edgeId] = targetNodeId
    this.edgeType[edgeId] = type

    this.edgeCount++
    return edgeId
  }

  /**
   * Builds the adjacency index for fast neighbor lookups.
   * This method should be called once after all nodes and edges have been added.
   * It sorts the edges by source node ID to make them contiguous.
   */
  public buildIndex() {
    if (this.isIndexBuilt) return

    // Create a permutation array to sort all edge arrays based on sourceNodeId
    const p = Array.from({ length: this.edgeCount }, (_, i) => i)
    p.sort((a, b) => this.edgeSourceNodeId[a] - this.edgeSourceNodeId[b])

    // Reorder all edge arrays according to the permutation
    this.edgeSourceNodeId = new Uint32Array(p.map((i) => this.edgeSourceNodeId[i]))
    this.edgeTargetNodeId = new Uint32Array(p.map((i) => this.edgeTargetNodeId[i]))
    this.edgeType = new Uint8Array(p.map((i) => this.edgeType[i]))

    // Now that edges are sorted, build the start/count index for each node
    this.nodeEdgeStartIndex.fill(0)
    this.nodeEdgeCount.fill(0)

    if (this.edgeCount === 0) {
      this.isIndexBuilt = true
      return
    }

    const currentNodeId = this.edgeSourceNodeId[0]
    this.nodeEdgeStartIndex[currentNodeId] = 0

    for (let i = 0; i < this.edgeCount; i++) {
      const sourceNodeId = this.edgeSourceNodeId[i]
      this.nodeEdgeCount[sourceNodeId]++
      if (i > 0 && sourceNodeId !== this.edgeSourceNodeId[i - 1]) {
        this.nodeEdgeStartIndex[sourceNodeId] = i
      }
    }

    this.isIndexBuilt = true
  }

  /**
   * Retrieves the neighbors of a given node, optionally filtered by edge type.
   */
  public getNeighbors(nodeId: number, edgeType?: EdgeType): Uint32Array {
    if (!this.isIndexBuilt) {
      throw new Error("Index must be built before getting neighbors. Call buildIndex().")
    }
    const startIndex = this.nodeEdgeStartIndex[nodeId]
    const count = this.nodeEdgeCount[nodeId]
    const allNeighbors = this.edgeTargetNodeId.subarray(startIndex, startIndex + count)

    if (edgeType === undefined) return allNeighbors

    // If filtering by type, we have to iterate
    const filteredNeighbors: Array<number> = []
    for (let i = 0; i < count; i++) {
      if (this.edgeType[startIndex + i] === edgeType) {
        filteredNeighbors.push(allNeighbors[i])
      }
    }
    return new Uint32Array(filteredNeighbors)
  }
}
