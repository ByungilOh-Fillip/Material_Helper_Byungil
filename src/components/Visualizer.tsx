import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Activity, Bug, Palette } from "lucide-react";
import type { VisualizationMode } from "../types";
import { evaluateGraph, clamp } from "../utils/materialEngine";

interface VisualizerProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  nodes: any[];
  edges: any[];
  time: number;
}

const modes: Array<{ id: VisualizationMode; label: string; icon: typeof Activity }> = [
  { id: "color", label: "Color Blend", icon: Palette },
  { id: "motion", label: "Motion Shape", icon: Activity },
  { id: "debug", label: "Debug Node", icon: Bug }
];

export function Visualizer({ mode, onModeChange, nodes, edges, time }: VisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Extract variables dynamically from parameters nodes in graph
  const params = useMemo(() => {
    const map: Record<string, any> = {};
    nodes.forEach((node) => {
      if (node.data?.nodeType === "ScalarParameter") {
        const name = node.data.values?.name || node.id;
        map[name] = node.data.values?.value ?? 0.5;
      } else if (node.data?.nodeType === "VectorParameter") {
        const name = node.data.values?.name || node.id;
        map[name] = node.data.values?.color ?? "#ffffff";
      }
    });
    return map;
  }, [nodes]);

  // Center sample evaluations
  const centerSample = useMemo(() => {
    return evaluateGraph(nodes, edges, 0.5, 0.5, time, params);
  }, [nodes, edges, time, params]);

  // Edge sample evaluations
  const edgeSample = useMemo(() => {
    return evaluateGraph(nodes, edges, 0.8, 0.5, time, params);
  }, [nodes, edges, time, params]);

  // Three.js Plane mesh animation sync
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Initialize Three.js scene once per mode change
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || mode === "debug") return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      console.warn("WebGL Renderer creation failed", err);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const geometry = new THREE.PlaneGeometry(3, 3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0, 0, 0),
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;

    camera.position.set(0, 0, 4.2);
    scene.add(mesh);
    mount.appendChild(renderer.domElement);

    let frameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      meshRef.current = null;
    };
  }, [mode]);

  // Dynamically update mesh color in active animation loop
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || mode === "debug") return;

    const material = mesh.material as THREE.MeshBasicMaterial;
    if (mode === "motion") {
      const val = clamp(centerSample.value);
      material.color.setRGB(val, val, val);
    } else {
      material.color.setStyle(centerSample.color);
    }
  }, [centerSample.color, centerSample.value, mode]);

  // 40x40 grid evaluation loop for texture simulation
  const gridSamples = useMemo(() => {
    const samples = [];
    const gridSize = 40;
    for (let index = 0; index < gridSize * gridSize; index++) {
      const x = (index % gridSize) / (gridSize - 1);
      const y = Math.floor(index / gridSize) / (gridSize - 1);
      const sample = evaluateGraph(nodes, edges, x, y, time, params);
      const background =
        mode === "motion"
          ? `rgb(${Math.round(clamp(sample.value) * 255)}, ${Math.round(clamp(sample.value) * 255)}, ${Math.round(clamp(sample.value) * 255)})`
          : sample.color;
      samples.push(background);
    }
    return samples;
  }, [nodes, edges, time, params, mode]);

  return (
    <div className="visualizer-container">
      <div className="viewport-header">
        <p className="eyebrow">Viewport</p>
        <h2>Live View</h2>
      </div>

      {/* Segmented Buttons for Mode Toggle */}
      <div className="segmented-controls">
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mode-btn ${mode === item.id ? "active" : ""}`}
              onClick={() => onModeChange(item.id)}
              title={`${item.label} mode`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Output View Area */}
      <div className="render-area">
        {mode === "debug" ? (
          <div className="debug-metrics-list">
            <h3 className="debug-title">Interpreter Values</h3>
            <Metric label="Emissive Output Value" value={centerSample.value} />
            <Metric label="Dynamic Sine Remap" value={centerSample.pulse} />
            <Metric label="Calculated SphereMask" value={centerSample.mask} />
            <Metric label="Edge Mask Value (UV 0.8, 0.5)" value={edgeSample.mask} />
            <div className="debug-vars-inspect">
              <h4>Active Variable Context:</h4>
              {Object.keys(params).length === 0 ? (
                <p>No variables defined</p>
              ) : (
                <pre>{JSON.stringify(params, null, 2)}</pre>
              )}
            </div>
          </div>
        ) : (
          <div className="visualizer-canvas-stack">
            {/* ThreeJS mesh canvas */}
            <div ref={mountRef} className="threejs-canvas-frame" aria-label="3D mesh preview" />
            
            {/* Simulated 2D grid matrix */}
            <div className="pixel-2d-matrix grid-40x40">
              {gridSamples.map((bg, idx) => (
                <span key={idx} className="pixel-dot" style={{ backgroundColor: bg }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Educational Copy Text */}
      <div className="viewport-explain-block">
        <h3>{modeCopy(mode).title}</h3>
        <p>{modeCopy(mode).body}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="debug-metric-row">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value.toFixed(3)}</strong>
    </div>
  );
}

function modeCopy(mode: VisualizationMode) {
  if (mode === "motion") {
    return {
      title: "Shape & Motion View",
      body: "Removes color values to display shape outlines and time-based animations in grayscale."
    };
  }
  if (mode === "color") {
    return {
      title: "Color Blending View",
      body: "Shows how RGB colors are combined using the graph's masks and Lerp nodes."
    };
  }
  return {
    title: "Numeric Graph Data",
    body: "Provides precise calculation values of node outputs for math verification."
  };
}
