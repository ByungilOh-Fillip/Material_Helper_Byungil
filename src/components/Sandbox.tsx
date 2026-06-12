import { useCallback, useState, useMemo, useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange
} from "@xyflow/react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { CustomNode } from "./CustomNode";
import { Visualizer } from "./Visualizer";
import { exportGraphToT3D } from "../utils/ueExporter";
import type { VisualizationMode } from "../types";

// Register custom node type
const nodeTypes = {
  customNode: CustomNode
};

interface SandboxProps {
  nodes: any[];
  edges: any[];
  onNodesChange: (nodes: any[]) => void;
  onEdgesChange: (edges: any[]) => void;
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  time: number;
}

const NODE_TEMPLATES = [
  { nodeType: "ScalarParameter", label: "Scalar Parameter", inputs: [], outputs: ["Float"], defaultValues: { name: "Scalar", value: 0.5, min: 0, max: 1 } },
  { nodeType: "VectorParameter", label: "Vector Parameter", inputs: [], outputs: ["Color"], defaultValues: { name: "Color", color: "#ff3000" } },
  { nodeType: "TexCoord", label: "Texture Coordinate", inputs: [], outputs: ["UV"], defaultValues: {} },
  { nodeType: "Time", label: "Time", inputs: [], outputs: ["Time"], defaultValues: {} },
  { nodeType: "Sine", label: "Sine", inputs: ["Value"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "Add", label: "Add", inputs: ["A", "B"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "Multiply", label: "Multiply", inputs: ["A", "B"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "Lerp", label: "Linear Interpolation (Lerp)", inputs: ["A", "B", "Alpha"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "SphereMask", label: "Sphere Mask", inputs: ["A", "B", "Radius", "Hardness"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "BoxMask", label: "Box Mask", inputs: ["A", "B", "Width", "Height", "Hardness"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "ConeMask", label: "Cone Mask", inputs: ["A", "B", "Radius", "Angle"], outputs: ["Result"], defaultValues: {} },
  { nodeType: "FinalColor", label: "Material Result", inputs: ["BaseColor", "Metallic", "Roughness", "EmissiveColor", "Normal"], outputs: [], defaultValues: {} }
];

// Create a shared module-level memory buffer for web-side copy-paste fallback
let localGraphClipboardBuffer: any = null;

export function Sandbox({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  visualizationMode,
  onVisualizationModeChange,
  time
}: SandboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState(false);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(applyNodeChanges(changes, nodes));
    },
    [nodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(applyEdgeChanges(changes, edges));
    },
    [edges, onEdgesChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      onEdgesChange(addEdge(connection, edges));
    },
    [edges, onEdgesChange]
  );

  // Connection validation: prevent invalid wiring
  const isValidConnection = useCallback(
    (connection: any) => {
      // 1. No self-loops
      if (connection.source === connection.target) return false;

      // 2. No duplicate connections to the same target handle (input pin)
      const alreadyConnected = edges.some(
        (e) => e.target === connection.target && e.targetHandle === connection.targetHandle
      );
      if (alreadyConnected) return false;

      // 3. Output nodes (FinalColor/Material Result) cannot be used as sources
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      // 4. Nodes with no outputs cannot be sources
      const sourceOutputs: string[] = sourceNode.data?.outputs || [];
      if (sourceOutputs.length === 0) return false;

      // 5. Nodes with no inputs cannot be targets
      const targetInputs: string[] = targetNode.data?.inputs || [];
      if (targetInputs.length === 0) return false;

      return true;
    },
    [edges, nodes]
  );

  const addNode = (template: typeof NODE_TEMPLATES[0]) => {
    const id = `node_${template.nodeType.toLowerCase()}_${Date.now()}`;
    const newNode = {
      id,
      type: "customNode",
      position: { x: 300 + Math.random() * 50, y: 150 + Math.random() * 50 },
      data: {
        label: template.label,
        nodeType: template.nodeType,
        inputs: template.inputs,
        outputs: template.outputs,
        values: { ...template.defaultValues }
      }
    };
    onNodesChange([...nodes, newNode]);
  };

  const removeSelected = () => {
    onNodesChange(nodes.filter((node) => !node.selected));
    onEdgesChange(edges.filter((edge) => !edge.selected));
  };

  // Explicitly clear selection when clicking on empty canvas panel (Pane)
  const handlePaneClick = useCallback(() => {
    onNodesChange(nodes.map((node) => ({ ...node, selected: false })));
    onEdgesChange(edges.map((edge) => ({ ...edge, selected: false })));
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  // Sync parameter inputs from active graph nodes (Scalar and Vector Parameters)
  const activeParameters = useMemo(() => {
    return nodes.filter(
      (n) => n.data?.nodeType === "ScalarParameter" || n.data?.nodeType === "VectorParameter"
    );
  }, [nodes]);

  const updateParameterNodeValue = (nodeId: string, field: "value" | "color" | "name", val: any) => {
    onNodesChange(
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              values: {
                ...node.data.values,
                [field]: val
              }
            }
          };
        }
        return node;
      })
    );
  };

  // -------------------------------------------------------------------------
  // React Flow Clipboard Copy/Paste Implementation with UE T3D Output
  // -------------------------------------------------------------------------

  // COPY ACTION: Copies SELECTED nodes & edges (auto-collects edges between selected nodes)
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);

    if (selectedNodes.length === 0) return;

    // Auto-collect all edges where BOTH source and target are in the selected node set
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const relevantEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    // 1. Pack JSON payload for web-to-web memory buffer copy fallback
    const webPayload = {
      type: "material-helper-graph",
      version: "1.0",
      nodes: selectedNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data
      })),
      edges: relevantEdges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle
      }))
    };

    localGraphClipboardBuffer = webPayload;

    // 2. Generate Unreal Engine compatible T3D text copy syntax
    try {
      const t3dText = exportGraphToT3D(selectedNodes, relevantEdges);
      
      // Write UE T3D text to system clipboard so Ctrl+V inside Unreal works!
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t3dText).catch((err) => {
          console.warn("System clipboard write blocked.", err);
        });
      }
    } catch (err) {
      console.error("Failed to generate T3D copy text", err);
    }
  }, [nodes, edges]);

  // EXPORT ALL ACTION: Copies the ENTIRE graph (all nodes and edges) in T3D format
  const handleCopyAllToUE = () => {
    if (nodes.length === 0) return;

    try {
      const t3dText = exportGraphToT3D(nodes, edges);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t3dText).then(() => {
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 2000);
        }).catch((err) => {
          console.warn("System clipboard write blocked.", err);
        });
      }
    } catch (err) {
      console.error("Failed to generate complete T3D copy text", err);
    }
  };

  const handlePaste = useCallback(() => {
    const processPastePayload = (payload: any) => {
      if (!payload || payload.type !== "material-helper-graph") {
        alert("Paste failed:\n- Invalid clipboard data format.");
        return;
      }

      const pastedNodes = payload.nodes || [];
      const pastedEdges = payload.edges || [];

      if (pastedNodes.length === 0) return;

      const errors: string[] = [];
      const validNodes: any[] = [];
      const idMap: Record<string, string> = {};

      const REGISTERED_TYPES = [
        "ScalarParameter", "VectorParameter", "TexCoord", "Time",
        "Sine", "Add", "Multiply", "Lerp", "SphereMask", "BoxMask",
        "ConeMask", "FinalColor"
      ];

      pastedNodes.forEach((node: any, idx: number) => {
        if (!node.id || !node.position) {
          errors.push(`Node #${idx + 1} is missing key specifications (id, position).`);
          return;
        }

        const nodeType = node.data?.nodeType;
        if (!nodeType || !REGISTERED_TYPES.includes(nodeType)) {
          errors.push(`Node "${node.id}" type "${nodeType || "undefined"}" is not supported.`);
          return;
        }

        node.type = "customNode";
        const newId = `node_${nodeType.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        idMap[node.id] = newId;

        const clonedNode = {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 40,
            y: node.position.y + 40
          },
          selected: true
        };

        validNodes.push(clonedNode);
      });

      if (errors.length > 0) {
        alert(`Paste failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
        return;
      }

      const validEdges: any[] = [];
      pastedEdges.forEach((edge: any) => {
        const newSource = idMap[edge.source];
        const newTarget = idMap[edge.target];

        if (newSource && newTarget) {
          validEdges.push({
            ...edge,
            id: `edge_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            source: newSource,
            target: newTarget
          });
        }
      });

      // Deselect old items
      const deselectedNodes = nodes.map((n) => ({ ...n, selected: false }));
      const deselectedEdges = edges.map((e) => ({ ...e, selected: false }));

      onNodesChange([...deselectedNodes, ...validNodes]);
      onEdgesChange([...deselectedEdges, ...validEdges]);
    };

    // Attempt to read system clipboard first
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then((text) => {
          try {
            const payload = JSON.parse(text);
            if (payload && payload.type === "material-helper-graph") {
              processPastePayload(payload);
              return;
            }
          } catch (err) {
            // Not a JSON, fallback to local memory buffer
          }

          if (localGraphClipboardBuffer) {
            processPastePayload(localGraphClipboardBuffer);
          } else {
            alert("Paste failed:\n- Clipboard is empty or contains non-graph data.");
          }
        })
        .catch((err) => {
          console.warn("System clipboard blocked. Using fallback memory buffer.", err);
          if (localGraphClipboardBuffer) {
            processPastePayload(localGraphClipboardBuffer);
          } else {
            alert("Paste failed:\n- Clipboard access denied by browser, and copy buffer is empty.");
          }
        });
    } else {
      if (localGraphClipboardBuffer) {
        processPastePayload(localGraphClipboardBuffer);
      } else {
        alert("Paste failed:\n- Clipboard API not supported, and copy buffer is empty.");
      }
    }
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  // -------------------------------------------------------------------------
  // Shift + Node Drag Cloning Functionality
  // -------------------------------------------------------------------------
  const handleNodeDragStart = useCallback((event: any, node: any) => {
    // If user holds Shift key while starting to drag a node, clone the node in-place
    if (event.shiftKey) {
      const nodeType = node.data?.nodeType;
      const newId = `node_${nodeType.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const clonedNode = {
        ...node,
        id: newId,
        selected: false, // Keep original static node deselected
        position: { ...node.position } // Lock coordinates to starting drag position
      };

      onNodesChange([...nodes, clonedNode]);
    }
  }, [nodes, onNodesChange]);

  // Bind Keyboard Listeners for Ctrl+C and Ctrl+V
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        event.preventDefault();
        handleCopy();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopy, handlePaste]);

  // -------------------------------------------------------------------------

  const filteredTemplates = NODE_TEMPLATES.filter((template) =>
    template.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.nodeType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="page2-layout" id="sandbox-split">
      {/* 30% Width Viewport Panel */}
      <div className="viewport-col">
        <Visualizer
          mode={visualizationMode}
          onModeChange={onVisualizationModeChange}
          nodes={nodes}
          edges={edges}
          time={time}
        />
      </div>

      {/* 70% Width Graph Editor Panel */}
      <div className="editor-col">
        <div className="sandbox-toolbar">
          <div>
            <p className="eyebrow">Sandbox Layer</p>
            <h2>Interactive Material Editor</h2>
          </div>
          <div className="actions-cluster">
            {/* Copy ALL nodes to clipboard in UE T3D format */}
            <button
              type="button"
              className={`action-btn ue-copy ${copyStatus ? "copied" : ""}`}
              onClick={handleCopyAllToUE}
              title="Copy ALL nodes/edges to clipboard for pasting into Unreal Engine"
            >
              {copyStatus ? <Check size={16} /> : <Copy size={16} />}
              <span>{copyStatus ? "Copied All T3D!" : "Copy to UE (All)"}</span>
            </button>
            <button
              type="button"
              className="action-btn delete-btn"
              onClick={removeSelected}
              title="Delete selected nodes/edges"
            >
              <Trash2 size={16} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>

        {/* Node Graph Editor Canvas */}
        <div className="graph-canvas-shell">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeDragStart={handleNodeDragStart}
            nodeTypes={nodeTypes}
            onPaneClick={handlePaneClick}
            selectionOnDrag={true}
            panOnDrag={[2]} // Drag with Right Click or mouse wheel to Pan. Left click drag draws selection boxes!
            selectionKeyCode={null}
            multiSelectionKeyCode={"Shift"}
            fitView
          >
            <Background color="#3a4049" gap={16} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        {/* Parameter (Variable) Box - Placed between graph and bottom search */}
        <div className="parameter-box-panel">
          <h3 className="section-subtitle">Dynamic Variables (Parameters)</h3>
          {activeParameters.length === 0 ? (
            <p className="empty-message">No active Scalar or Vector parameters in the graph. Add parameters below to see sliders.</p>
          ) : (
            <div className="params-sliders-grid">
              {activeParameters.map((paramNode) => {
                const isScalar = paramNode.data?.nodeType === "ScalarParameter";
                const values = paramNode.data?.values || {};
                
                return (
                  <div key={paramNode.id} className="param-item-card">
                    <div className="param-meta">
                      <input
                        type="text"
                        className="param-rename-input"
                        value={values.name || ""}
                        placeholder="Parameter Name"
                        onChange={(e) => updateParameterNodeValue(paramNode.id, "name", e.target.value)}
                        title="Click to rename parameter"
                      />
                      <span className="node-badge">{isScalar ? "Scalar" : "Vector (Color)"}</span>
                    </div>

                    {isScalar ? (
                      <div className="slider-control">
                        <input
                          type="range"
                          min={values.min ?? 0}
                          max={values.max ?? 1}
                          step={0.01}
                          value={values.value ?? 0.5}
                          onChange={(e) => updateParameterNodeValue(paramNode.id, "value", Number(e.target.value))}
                        />
                        <span className="value-display">{(values.value ?? 0.5).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="color-control">
                        <input
                          type="color"
                          value={values.color ?? "#ff3000"}
                          onChange={(e) => updateParameterNodeValue(paramNode.id, "color", e.target.value)}
                        />
                        <span className="value-display">{values.color ?? "#ff3000"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Node Box - Bottom searchable nodes area */}
        <div className="node-box-panel">
          <div className="node-box-header">
            <h3 className="section-subtitle">Node Palette</h3>
            <input
              type="text"
              className="node-search-bar"
              placeholder="Search nodes (e.g. Lerp, Multiply, Sine...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="node-items-flex">
            {filteredTemplates.map((template) => (
              <button
                key={template.nodeType}
                type="button"
                className="palette-node-item"
                onClick={() => addNode(template)}
                title={`Spawn a ${template.label} node`}
              >
                <Plus size={14} />
                <span>{template.nodeType}</span>
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="no-nodes-found">No matching nodes found.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
