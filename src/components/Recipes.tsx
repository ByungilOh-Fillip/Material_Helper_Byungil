import { useState } from "react";
import { ChevronDown, ChevronUp, Play, Settings, BookOpen } from "lucide-react";
import type { Recipe } from "../types";

interface RecipesProps {
  recipes: Recipe[];
  onViewExample: (recipeId: string) => void;
}

export function Recipes({ recipes, onViewExample }: RecipesProps) {
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(recipes[0]?.id || null);

  const toggleAccordion = (id: string) => {
    setExpandedRecipeId((current) => (current === id ? null : id));
  };

  // Group recipes by category
  const categories = ["Basic", "Intermediate", "Advanced"] as const;

  return (
    <section className="learning-recipes-page">
      <div className="recipes-header">
        <p className="eyebrow">Learning Layer</p>
        <h2>Curated Learning Recipes</h2>
        <p className="subtitle-lead">
          Explore ready-to-run material effects. Expand any recipe to inspect its node structure, material domain settings, and load it instantly in the interactive sandbox editor.
        </p>
      </div>

      <div className="categories-stack">
        {categories.map((category) => {
          const categoryRecipes = recipes.filter((r) => r.category === category);
          if (categoryRecipes.length === 0) return null;

          return (
            <div key={category} className="category-group">
              <h3 className="category-title">{category} Concepts</h3>
              
              <div className="recipes-accordion-list">
                {categoryRecipes.map((recipe) => {
                  const isExpanded = expandedRecipeId === recipe.id;
                  
                  return (
                    <div
                      key={recipe.id}
                      className={`recipe-accordion-item ${isExpanded ? "expanded" : ""}`}
                    >
                      {/* Accordion Trigger Header */}
                      <button
                        type="button"
                        className="accordion-header-btn"
                        onClick={() => toggleAccordion(recipe.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="header-left">
                          <BookOpen size={16} className="recipe-icon" />
                          <span className="recipe-name">{recipe.name}</span>
                          <span className="module-badge">Module: {recipe.moduleName}</span>
                        </div>
                        <div className="header-right">
                          <span className="recipe-goal-short">{recipe.goal}</span>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {/* Accordion Expandable Panel */}
                      {isExpanded && (
                        <div className="accordion-content-panel">
                          <div className="content-grid">
                            
                            {/* Left Side: Summary, Domain, and Common Mistakes */}
                            <div className="meta-col">
                              <div className="info-block">
                                <h4>Recipe Goal & Visuals</h4>
                                <p className="description-text">{recipe.goal}</p>
                                <div className="visual-result-badge">
                                  <strong>Visual Result: </strong> {recipe.finalVisualResult}
                                </div>
                              </div>

                              <div className="material-settings-block">
                                <h4>
                                  <Settings size={14} />
                                  <span>Material Target Settings</span>
                                </h4>
                                <div className="settings-pills">
                                  <div className="pill">
                                    <span className="label">Material Domain:</span>
                                    <strong className="val">{recipe.materialSettings.domain}</strong>
                                  </div>
                                  <div className="pill">
                                    <span className="label">Blend Mode:</span>
                                    <strong className="val">{recipe.materialSettings.blendMode}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="mistakes-block">
                                <h4>Common Pitfalls to Avoid</h4>
                                <ul>
                                  {recipe.commonMistakes.map((mistake, idx) => (
                                    <li key={idx}>{mistake}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Right Side: Graph Preview ASCII Map & Redirection */}
                            <div className="preview-col">
                              <h4>Node Layout Preview</h4>
                              <p className="subtle-help">Graph connection map:</p>
                              
                              {/* ASCII styled node connections */}
                              <div className="ascii-graph-box">
                                {renderAsciiGraph(recipe.initialGraph.edges, recipe.initialGraph.nodes)}
                              </div>

                              <div className="relationship-summary">
                                <h4>Logic Walkthrough</h4>
                                <ul>
                                  {recipe.nodeRelationships.map((rel, idx) => (
                                    <li key={idx}>{rel}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* View Example Redirection CTA */}
                              <button
                                type="button"
                                className="view-example-cta"
                                onClick={() => onViewExample(recipe.id)}
                              >
                                <Play size={16} fill="currentColor" />
                                <span>View Example in Sandbox</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Generate stylized connection list representing node map
function renderAsciiGraph(edges: any[], nodes: any[]) {
  const nodeMap = new Map<string, any>(nodes.map((n) => [n.id, n]));
  
  if (edges.length === 0) {
    return <p className="empty-graph-notice">No node connections in this graph.</p>;
  }

  return (
    <div className="ascii-graph-lines">
      {edges.map((e) => {
        const srcNode = nodeMap.get(e.source);
        const tgtNode = nodeMap.get(e.target);
        const srcLabel = srcNode ? srcNode.data.label : e.source;
        const tgtLabel = tgtNode ? tgtNode.data.label : e.target;
        
        return (
          <div key={e.id} className="ascii-line">
            <span className="ascii-node src">{srcLabel}</span>
            <span className="ascii-pin src-pin">({e.sourceHandle})</span>
            <span className="ascii-arrow">──▶</span>
            <span className="ascii-pin tgt-pin">({e.targetHandle})</span>
            <span className="ascii-node tgt">{tgtLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
