import { Handle, Position } from "@xyflow/react";

export function CustomNode({ data }: { data: any }) {
  const { label, nodeType, inputs = [], outputs = [], values = {} } = data;

  return (
    <div className={`custom-node ${nodeType.toLowerCase()}`}>
      {/* Node Header Section */}
      <div className="node-header-section">
        <span className="node-type-badge">{nodeType}</span>
        <div className="node-title" title={values.name ? values.name : label}>
          {values.name ? values.name : label}
        </div>
      </div>

      {/* Node Content (Ports) Section */}
      <div className="node-ports-section">
        {/* Inputs Column */}
        <div className="node-inputs-col">
          {inputs.map((input: string) => (
            <div key={input} className="port-row input-row">
              <Handle
                type="target"
                position={Position.Left}
                id={input}
                className="port-handle target-handle"
              />
              <span className="port-label">{input}</span>
            </div>
          ))}
        </div>

        {/* Outputs Column */}
        <div className="node-outputs-col">
          {outputs.map((output: string) => (
            <div key={output} className="port-row output-row">
              <span className="port-label">{output}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={output}
                className="port-handle source-handle"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Node Preview / Value Section */}
      {(nodeType === "ScalarParameter" || nodeType === "VectorParameter" || nodeType === "FinalColor") && (
        <div className="node-preview-section">
          {nodeType === "ScalarParameter" && (
            <div className="node-preview-value">
              Value: <strong>{(values.value ?? 0).toFixed(2)}</strong>
            </div>
          )}
          {nodeType === "VectorParameter" && (
            <div className="node-preview-value vector">
              <span className="color-swatch" style={{ backgroundColor: values.color ?? "#ffffff" }} />
              <span>{values.color ?? "#ffffff"}</span>
            </div>
          )}
          {nodeType === "FinalColor" && (
            <div className="node-preview-value" style={{ fontSize: "0.68rem", color: "#e53e3e" }}>
              Material Output
            </div>
          )}
        </div>
      )}
    </div>
  );
}
