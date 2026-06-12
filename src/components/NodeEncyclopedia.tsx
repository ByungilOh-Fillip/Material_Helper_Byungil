import type { MaterialNodeInfo } from "../types";

interface NodeEncyclopediaProps {
  nodes: MaterialNodeInfo[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export function NodeEncyclopedia({ nodes, selectedNodeId, onSelectNode }: NodeEncyclopediaProps) {
  const selected = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const grouped = nodes.reduce<Record<string, MaterialNodeInfo[]>>((acc, node) => {
    acc[node.category] = [...(acc[node.category] ?? []), node];
    return acc;
  }, {});

  return (
    <section className="two-column" id="learn">
      <div className="panel">
        <div className="section-heading">
          <p className="eyebrow">Knowledge Layer</p>
          <h2>Node Encyclopedia</h2>
        </div>
        <div className="node-list">
          {Object.entries(grouped).map(([category, categoryNodes]) => (
            <div key={category}>
              <h3>{category}</h3>
              {categoryNodes
                .sort((a, b) => a.learningOrder - b.learningOrder)
                .map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={selected.id === node.id ? "selected row-button" : "row-button"}
                    onClick={() => onSelectNode(node.id)}
                  >
                    <span>{node.name}</span>
                    <small>{node.difficulty}</small>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
      <article className="panel detail-panel">
        <p className="eyebrow">{selected.category}</p>
        <h2>{selected.name}</h2>
        <p className="lead">{selected.description}</p>
        <div className="fact-grid">
          <Info label="Inputs" value={selected.inputs.length ? selected.inputs.join(", ") : "None"} />
          <Info label="Outputs" value={selected.outputs.join(", ")} />
          <Info label="Expected Range" value={selected.expectedRange} />
          <Info label="UE Support" value={selected.supportedVersions.join(", ")} />
        </div>
        <TagBlock title="Common Uses" items={selected.commonUses} />
        <TagBlock title="Related Nodes" items={selected.relatedNodes} />
        <TagBlock title="Version Notes" items={selected.versionWarnings} />
      </article>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="tag-block">
      <h3>{title}</h3>
      <div>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
