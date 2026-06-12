import type { VersionInfo } from "../types";

interface VersionPanelProps {
  versions: VersionInfo[];
}

export function VersionPanel({ versions }: VersionPanelProps) {
  const target = versions.find((version) => version.target) ?? versions[0];

  return (
    <section className="panel version-panel" id="versions">
      <p className="eyebrow">Version-Aware Learning System</p>
      <h2>{target.version} Guidance</h2>
      <div className="version-grid">
        <VersionBlock title="Notes" items={target.notes} />
        <VersionBlock title="Substrate Notes" items={target.substrateNotes} />
        <VersionBlock title="Material Attributes" items={target.materialAttributeNotes} />
        <VersionBlock title="Deprecated Workflows" items={target.deprecatedWorkflows} />
        <VersionBlock title="Recommended Alternatives" items={target.recommendedAlternatives} />
        <VersionBlock title="Migration Tips" items={target.migrationTips} />
      </div>
    </section>
  );
}

function VersionBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="content-block">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
