Looking at the current API discrepancies and data flow between the layers, I can see several important gaps that need to be addressed for full cohesion. Let me analyze each layer:
Read file: packages/domain/src/graph/graph.ts
Read file: packages/domain/src/graph/node/node.ts
Ran tool
Read file: packages/domain/src/graph/node/node.ts
Now let me check the WorkspaceStateService to understand what data it actually provides:
Read file: packages/domain/src/engine/services/WorkspaceStateService.ts
Now let me create a comprehensive analysis of the API discrepancies and requirements:
Ran tool

## 📊 **API Discrepancy Analysis: Domain vs Adapter Layers**

Based on my analysis of the domain layer (`GraphWorkspaceRxRuntime.ts`), domain types (`graph.ts`, `node.ts`), and the current adapter (`GraphDataAdapter.ts`), here are the critical discrepancies and missing data requirements:

### **🔴 Major API Discrepancies**

#### **1. Graph Structure Mismatch**

**Domain Reality:**

```typescript
// packages/domain/src/graph/graph.ts
export class Graph extends Data.TaggedClass("Graph")<{
  readonly id: GraphId
  readonly nodes: HashMap.HashMap<NodeId, AnyNode>  // ← HashMap, not Array
  readonly edges: Chunk.Chunk<Edge.Edge>            // ← Chunk, not Array
}>
```

**Adapter Assumption:**

```typescript
// packages/web/src/services/GraphDataAdapter.ts
export const extractDataSections = (graph: Graph): Array<DataSection> => {
  const documentNodes = graph.nodes.filter(...)  // ❌ HashMap doesn't have .filter()
  //                          ↑ Treating as Array
}
```

#### **2. Node Structure Mismatch**

**Domain Reality:**

```typescript
// Actual node types from domain
export class SourceDataNode extends Schema.TaggedClass<SourceDataNode>()(
  "SourceDataNode",
  {
    id: NodeId,
    createdAt: Schema.DateTimeUtc,
    lastSeenBy: NodeId,
    sourceUri: Schema.String  // ← No .metadata property
  }
)

export class CanonicalEntityNode extends Schema.TaggedClass<CanonicalEntityNode>()(
  "CanonicalEntityNode",
  {
    id: NodeId,
    createdAt: Schema.DateTimeUtc,
    lastSeenBy: NodeId,
    schemaId: Schema.String,
    value: Schema.Unknown     // ← Data is in .value, not .metadata
  }
)
```

**Adapter Assumption:**

```typescript
// GraphDataAdapter.ts assumes nodes have .metadata
const documentNodes = graph.nodes.filter(
  (node) => node._tag === "SourceDataNode" && node.metadata?.level === 0 // ❌ No .metadata
)
data: documentNodes.map((node) => node.metadata?.title || "Untitled") // ❌ No .metadata.title
```

#### **3. Missing WorkspaceStats Type**

**Domain Provides:**

```typescript
// GraphWorkspaceRxRuntime.ts exports workspaceStatsRx
export const workspaceStatsRx = GraphWorkspaceRxRuntime.rx(
  Effect.gen(function* () {
    const workspace = yield* WorkspaceStateService
    return yield* workspace.getStats // ← This method doesn't exist in WorkspaceStateService
  })
)
```

**Missing Implementation:**

- `WorkspaceStateService` doesn't have a `getStats` method
- No `WorkspaceStats` type defined
- UI expects stats but domain doesn't provide them

### **🎯 Required Data for Full Cohesion**

#### **1. Fix Graph Data Access Pattern**

```typescript
// ✅ CORRECT - Use HashMap methods
export const extractDataSections = (graph: Graph): Array<DataSection> => {
  const allNodes = HashMap.values(graph.nodes) // Get all nodes as Iterable

  // Filter nodes by type and extract data properly
  const documentNodes = Array.from(allNodes).filter(
    (node) => node._tag === "SourceDataNode"
  ) as SourceDataNode[]

  // Access actual node properties, not fake metadata
  const documentData = documentNodes.map((node) => ({
    id: node.id,
    title: node.sourceUri, // Use actual property
    createdAt: node.createdAt
  }))
}
```

#### **2. Create Missing WorkspaceStats**

```typescript
// packages/domain/src/engine/services/WorkspaceStateService.ts
export class WorkspaceStats extends Data.TaggedClass("WorkspaceStats")<{
  readonly totalGraphs: number
  readonly totalNodes: number
  readonly totalEdges: number
  readonly currentGraphId: string
  readonly historySize: number
  readonly canUndo: boolean
  readonly canRedo: boolean
}> {}

// Add to WorkspaceStateService
export class WorkspaceStateService extends Context.Tag("WorkspaceStateService")<
  WorkspaceStateService,
  {
    readonly currentGraph: Effect.Effect<Graph.Graph>
    readonly getStats: Effect.Effect<WorkspaceStats> // ← Add this
    // ... other methods
  }
>() {}
```

#### **3. Create Proper Node-to-UI Data Mapping**

```typescript
// packages/web/src/services/GraphDataAdapter.ts
interface NodeDataExtractor {
  extractTitle(node: SourceDataNode): string
  extractContent(node: CanonicalEntityNode): string
  extractLevel(node: AnyNode): number
  extractSchemaInfo(node: AnyNode): { type: string; schema: string }
}

// Map actual node data to UI expectations
const extractNodeData = (node: AnyNode): DataSection | null => {
  switch (node._tag) {
    case "SourceDataNode":
      return {
        id: node.id,
        title: node.sourceUri, // Use actual property
        level: 0, // Source data is always level 0
        data: [node.sourceUri],
        schemaType: "SourceDocument"
      }

    case "CanonicalEntityNode":
      return {
        id: node.id,
        title: `Entity ${node.schemaId}`,
        level: inferLevelFromSchema(node.schemaId), // Derive level from schema
        data: extractValueAsStrings(node.value), // Extract from .value
        schemaType: node.schemaId
      }

    default:
      return null
  }
}
```

### **📋 Missing Data Requirements**

#### **1. Level/Hierarchy Information**

- **Current Issue**: Nodes don't have explicit level information
- **Solution**: Either add level metadata or infer from schema relationships
- **Options**:
  - Add `level: number` to node metadata
  - Create schema hierarchy mapping
  - Use graph traversal to determine depth

#### **2. Schema-to-Level Mapping**

```typescript
// Need mapping from schemaId to UI level
const SCHEMA_LEVEL_MAPPING = {
  document: 0,
  section: 1,
  sentence: 2,
  token: 3
} as const

const inferLevelFromSchema = (schemaId: string): number => {
  return (
    SCHEMA_LEVEL_MAPPING[schemaId as keyof typeof SCHEMA_LEVEL_MAPPING] ?? 0
  )
}
```

#### **3. Transformation Operations**

- **Current Issue**: `AlgebraNode` exists but transformation extraction is incomplete
- **Solution**: Map `AlgebraNode` properties to UI transformation descriptors

#### **4. Real-time Updates**

- **Current Issue**: Adapter uses static extraction, no reactive updates
- **Solution**: Make adapter functions reactive to graph changes

### **🔧 Immediate Fixes Needed**

#### **1. Fix Type Imports**

```typescript
// packages/web/src/services/GraphDataAdapter.ts
import type { Graph } from "@adjoint/domain/graph/graph" // Import actual Graph class
import type {
  AnyNode,
  SourceDataNode,
  CanonicalEntityNode
} from "@adjoint/domain/graph/node"
```

#### **2. Fix Data Access**

```typescript
// Use HashMap.values() instead of .filter()
const allNodes = Array.from(HashMap.values(graph.nodes))
const documentNodes = allNodes.filter(
  (node): node is SourceDataNode => node._tag === "SourceDataNode"
)
```

#### **3. Add Missing WorkspaceStats**

```typescript
// Add to WorkspaceStateService implementation
getStats: Effect.gen(function* () {
  const state = yield* Ref.get(this.state)
  const currentSnapshot = state.currentSnapshot

  return new WorkspaceStats({
    totalGraphs: state.history.length,
    totalNodes: Option.match(currentSnapshot, {
      onNone: () => 0,
      onSome: (snapshot) => HashMap.size(snapshot.graph.nodes)
    }),
    totalEdges: Option.match(currentSnapshot, {
      onNone: () => 0,
      onSome: (snapshot) => Chunk.size(snapshot.graph.edges)
    }),
    currentGraphId: Option.match(currentSnapshot, {
      onNone: () => "",
      onSome: (snapshot) => snapshot.graph.id
    }),
    historySize: state.history.length,
    canUndo: state.canUndo,
    canRedo: state.canRedo
  })
})
```

### **✅ Action Plan for Cohesion**

1. **Fix GraphDataAdapter types** - Use correct Graph/Node types
2. **Add WorkspaceStats** - Complete the missing domain data
3. **Create proper node extractors** - Map real node data to UI
4. **Add level inference** - Either from schema or graph traversal
5. **Make adapter reactive** - Connect to graph changes
6. **Eliminate duplication** - Single source of truth for each data type

The main issue is that the adapter was built assuming a different data structure than what the domain actually provides. We need to bridge this gap with proper type-safe extractors that work with the real HashMap/Chunk-based graph structure.
Ran tool
