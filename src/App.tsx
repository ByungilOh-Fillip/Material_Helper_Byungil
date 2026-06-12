import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { NodeEncyclopedia } from "./components/NodeEncyclopedia";
import { Recipes } from "./components/Recipes";
import { Sandbox } from "./components/Sandbox";
import { VersionPanel } from "./components/VersionPanel";
import nodesData from "./data/nodes.json";
import recipesData from "./data/recipes.json";
import versionsData from "./data/versions.json";
import type { MaterialNodeInfo, Recipe, VersionInfo, VisualizationMode } from "./types";

const nodes = nodesData as MaterialNodeInfo[];
const recipes = recipesData as Recipe[];
const versions = versionsData as VersionInfo[];

function App() {
  const [activeSection, setActiveSection] = useState("encyclopedia");
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0].id);
  const [sandboxNodes, setSandboxNodes] = useState<any[]>(recipes[0].initialGraph.nodes);
  const [sandboxEdges, setSandboxEdges] = useState<any[]>(recipes[0].initialGraph.edges);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>("color");
  const [time, setTime] = useState(0);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setTime((current) => current + delta);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleViewExample = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) {
      setSandboxNodes(recipe.initialGraph.nodes);
      setSandboxEdges(recipe.initialGraph.edges);
      setActiveSection("sandbox");
    }
  };

  return (
    <div className="app">
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      <main>
        <section className="hero-band">
          <div>
            <p className="eyebrow">Learn {"->"} Example {"->"} Experiment {"->"} Understand {"->"} Apply</p>
            <h2>Node knowledge becomes reusable material effects.</h2>
          </div>
          <p>
            This sandbox focuses on UE5.7 material education: node behavior, telegraph recipes, reusable
            modules, sandbox experimentation, and visual debugging.
          </p>
        </section>

        {activeSection === "encyclopedia" && (
          <NodeEncyclopedia nodes={nodes} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        )}

        {activeSection === "learning" && (
          <Recipes recipes={recipes} onViewExample={handleViewExample} />
        )}

        {activeSection === "sandbox" && (
          <Sandbox
            nodes={sandboxNodes}
            edges={sandboxEdges}
            onNodesChange={setSandboxNodes}
            onEdgesChange={setSandboxEdges}
            visualizationMode={visualizationMode}
            onVisualizationModeChange={setVisualizationMode}
            time={time}
          />
        )}

        {activeSection === "versions" && <VersionPanel versions={versions} />}
      </main>
    </div>
  );
}

export default App;
