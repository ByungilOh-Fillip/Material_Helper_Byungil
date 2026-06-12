import { Boxes, Plus } from "lucide-react";
import type { MaterialModule } from "../types";

interface ModulesProps {
  modules: MaterialModule[];
  onInsertModule: (moduleId: string) => void;
}

export function Modules({ modules, onInsertModule }: ModulesProps) {
  return (
    <section className="module-grid" id="modules">
      {modules.map((module) => (
        <article className="panel module-card" key={module.id}>
          <div className="module-card-header">
            <Boxes size={20} />
            <div>
              <p className="eyebrow">Reusable Module</p>
              <h2>{module.name}</h2>
            </div>
          </div>
          <p className="lead">{module.goal}</p>
          <div className="tag-block">
            <h3>Internal Nodes</h3>
            <div>
              {module.contains.map((node) => (
                <span key={node}>{node}</span>
              ))}
            </div>
          </div>
          <div className="content-block">
            <h3>Inspect Structure</h3>
            <ul>
              {module.internalStructure.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <button className="primary-action" type="button" onClick={() => onInsertModule(module.id)}>
            <Plus size={17} />
            <span>Insert Into Sandbox</span>
          </button>
        </article>
      ))}
    </section>
  );
}
