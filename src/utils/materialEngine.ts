import type { SandboxParameter } from "../types";

export interface SampleResult {
  mask: number;
  pulse: number;
  finalValue: number;
  color: string;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function remapSine(value: number) {
  return (Math.sin(value) + 1) * 0.5;
}

// Keep legacy for backward compatibility
export function evaluateTelegraph(
  x: number,
  y: number,
  time: number,
  params: Record<string, number>
): SampleResult {
  const radius = params.radius ?? 0.45;
  const edge = params.edge ?? 0.09;
  const fade = params.fade ?? 0.82;
  const speed = params.speed ?? 1.3;
  const intensity = params.intensity ?? 0.7;

  const dx = x - 0.5;
  const dy = y - 0.5;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const inner = radius - edge;
  const mask = 1 - clamp((distance - inner) / Math.max(edge, 0.001));
  const pulse = remapSine(time * speed * Math.PI * 2) * intensity + (1 - intensity);
  const finalValue = clamp(mask * fade * pulse);
  const red = Math.round(42 + finalValue * 210);
  const green = Math.round(48 + finalValue * 72);
  const blue = Math.round(55 - finalValue * 25);

  return {
    mask,
    pulse,
    finalValue,
    color: `rgb(${red}, ${green}, ${blue})`
  };
}

export function parameterMap(parameters: SandboxParameter[]) {
  return parameters.reduce<Record<string, number>>((acc, param) => {
    acc[param.id] = param.value;
    return acc;
  }, {});
}

export function initialSandboxParameters(): SandboxParameter[] {
  return [
    { id: "radius", label: "Radius", value: 0.45, min: 0.05, max: 0.95, step: 0.01 },
    { id: "edge", label: "Edge Width", value: 0.09, min: 0.01, max: 0.35, step: 0.01 },
    { id: "fade", label: "Fade", value: 0.82, min: 0, max: 1, step: 0.01 },
    { id: "speed", label: "Pulse Speed", value: 1.3, min: 0.1, max: 5, step: 0.1 },
    { id: "intensity", label: "Pulse Intensity", value: 0.7, min: 0, max: 1, step: 0.01 }
  ];
}

// -------------------------------------------------------------------------
// NEW GENERATION: Dynamic Graph Interpreter
// -------------------------------------------------------------------------

type Vector4 = [number, number, number, number];

// Helpers
function hexToRgba(hex: string): Vector4 {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
  return [r, g, b, 1.0];
}

function broadcast(val: number): Vector4 {
  return [val, val, val, val];
}

export function evaluateGraph(
  nodes: any[],
  edges: any[],
  x: number,
  y: number,
  time: number,
  params: Record<string, any>
): { color: string; value: number; mask: number; pulse: number } {
  // Find FinalColor node
  const finalNode = nodes.find((n) => n.data?.nodeType === "FinalColor");
  if (!finalNode) {
    return { color: "rgb(0, 0, 0)", value: 0, mask: 0, pulse: 0 };
  }

  // Build connection map: targetNodeId -> targetHandle -> { sourceNodeId, sourceHandle }
  const connections: Record<string, Record<string, { source: string; handle: string }>> = {};
  edges.forEach((edge) => {
    if (!connections[edge.target]) {
      connections[edge.target] = {};
    }
    connections[edge.target][edge.targetHandle] = {
      source: edge.source,
      handle: edge.sourceHandle
    };
  });

  const nodeMap = new Map<string, any>(nodes.map((n) => [n.id, n]));
  const evaluated = new Map<string, Vector4>();

  function evalNode(nodeId: string, handleName: string, depth = 0): Vector4 {
    if (depth > 25) return [0, 0, 0, 0]; // Loop guard

    const cacheKey = `${nodeId}:${handleName}`;
    if (evaluated.has(cacheKey)) {
      return evaluated.get(cacheKey)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) return [0, 0, 0, 0];

    const type = node.data?.nodeType;
    const values = node.data?.values || {};

    let result: Vector4 = [0, 0, 0, 0];

    // Helper to evaluate connected inputs or return fallback
    const evalInput = (inputName: string, fallback: Vector4 = [0, 0, 0, 0]): Vector4 => {
      const conn = connections[nodeId]?.[inputName];
      if (conn) {
        return evalNode(conn.source, conn.handle, depth + 1);
      }
      return fallback;
    };

    switch (type) {
      case "TexCoord":
        result = [x, y, 0.0, 1.0];
        break;

      case "Time":
        result = [time, time, time, time];
        break;

      case "ScalarParameter": {
        const pName = values.name || node.id;
        const val = typeof params[pName] === "number" ? params[pName] : (values.value ?? 0);
        result = broadcast(val);
        break;
      }

      case "VectorParameter": {
        const pName = values.name || node.id;
        const colStr = typeof params[pName] === "string" ? params[pName] : (values.color ?? "#ffffff");
        result = hexToRgba(colStr);
        break;
      }

      case "Sine": {
        const val = evalInput("Value", [0, 0, 0, 0]);
        // Unreal sine cycles every 1.0 unit: sin(val * 2 * PI)
        result = [
          Math.sin(val[0] * Math.PI * 2),
          Math.sin(val[1] * Math.PI * 2),
          Math.sin(val[2] * Math.PI * 2),
          Math.sin(val[3] * Math.PI * 2)
        ];
        break;
      }

      case "Add": {
        const a = evalInput("A", [0, 0, 0, 0]);
        const b = evalInput("B", [0, 0, 0, 0]);
        result = [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
        break;
      }

      case "Multiply": {
        const a = evalInput("A", [1, 1, 1, 1]);
        const b = evalInput("B", [1, 1, 1, 1]);
        result = [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
        break;
      }

      case "Lerp": {
        const a = evalInput("A", [0, 0, 0, 0]);
        const b = evalInput("B", [1, 1, 1, 1]);
        const alpha = evalInput("Alpha", [0.5, 0.5, 0.5, 0.5]);
        result = [
          a[0] + (b[0] - a[0]) * clamp(alpha[0]),
          a[1] + (b[1] - a[1]) * clamp(alpha[1]),
          a[2] + (b[2] - a[2]) * clamp(alpha[2]),
          a[3] + (b[3] - a[3]) * clamp(alpha[3])
        ];
        break;
      }

      case "SphereMask": {
        const coord = evalInput("A", [x, y, 0, 1]);
        const center = evalInput("B", [0.5, 0.5, 0, 1]);
        const radius = evalInput("Radius", [0.35, 0.35, 0.35, 0.35])[0];
        const hardness = evalInput("Hardness", [0.8, 0.8, 0.8, 0.8])[0]; // Edge softness proxy

        const dx = coord[0] - center[0];
        const dy = coord[1] - center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Simple smoothstep or linear soft border mapping
        // hardness: 1.0 is hard, 0.0 is completely fuzzy
        const edge = Math.max(1.0 - hardness, 0.001) * 0.3; 
        const inner = radius - edge;
        const maskVal = 1.0 - clamp((distance - inner) / edge);

        result = broadcast(maskVal);
        break;
      }

      case "BoxMask": {
        const coord = evalInput("A", [x, y, 0, 1]);
        const center = evalInput("B", [0.5, 0.5, 0, 1]);
        const width = evalInput("Width", [0.2, 0.2, 0.2, 0.2])[0];
        const height = evalInput("Height", [0.4, 0.4, 0.4, 0.4])[0];
        const hardness = evalInput("Hardness", [0.8, 0.8, 0.8, 0.8])[0];

        const dx = Math.abs(coord[0] - center[0]);
        const dy = Math.abs(coord[1] - center[1]);

        // Smooth boundary transition
        const edge = Math.max(1.0 - hardness, 0.001) * 0.1;
        const maskX = 1.0 - clamp((dx - (width - edge)) / edge);
        const maskY = 1.0 - clamp((dy - (height - edge)) / edge);
        const maskVal = maskX * maskY;

        result = broadcast(maskVal);
        break;
      }

      case "ConeMask": {
        const coord = evalInput("A", [x, y, 0, 1]);
        const center = evalInput("B", [0.5, 0.85, 0, 1]); // default origin at bottom-center
        const radius = evalInput("Radius", [0.7, 0.7, 0.7, 0.7])[0];
        const angle = evalInput("Angle", [90, 90, 90, 90])[0]; // spread angle in degrees

        const dx = coord[0] - center[0];
        const dy = coord[1] - center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
          result = [0, 0, 0, 0];
          break;
        }

        // Forward vector in UV space is (0, -1) (upward)
        const dot = -dy / distance; // Normalized dot product with (0, -1)
        const radLimit = Math.cos((angle * Math.PI) / 180 / 2);

        // Angle mask with soft border transition
        const angleMask = clamp((dot - radLimit) / 0.05 + 0.5);

        // Distance mask (linear decline)
        const distMask = clamp(1.0 - (distance / Math.max(radius, 0.001)));

        const maskVal = angleMask * distMask;
        result = broadcast(maskVal);
        break;
      }

      case "FinalColor":
        result = evalInput("Color", [0, 0, 0, 1]);
        // Also fallback to check expanded material result pins if EmissiveColor is wired
        if (result[0] === 0 && result[1] === 0 && result[2] === 0) {
          const emissive = evalInput("EmissiveColor", [0, 0, 0, 1]);
          const baseColor = evalInput("BaseColor", [0, 0, 0, 1]);
          result = [
            emissive[0] + baseColor[0],
            emissive[1] + baseColor[1],
            emissive[2] + baseColor[2],
            emissive[3]
          ];
        }
        break;

      default:
        result = [0, 0, 0, 1];
    }

    evaluated.set(cacheKey, result);
    return result;
  }

  // Evaluate final emissive/color output
  const finalVal = evalNode(finalNode.id, "Color");

  // Derive debug metrics (like Pulse and Mask) by inspecting active node outputs
  let maskVal = finalVal[0];
  let pulseVal = 1.0;

  // Attempt to scan for specific nodes to return meaningful debug components
  const activeSmask = nodes.find((n) => n.data?.nodeType === "SphereMask" || n.data?.nodeType === "BoxMask" || n.data?.nodeType === "ConeMask");
  if (activeSmask) {
    const smaskRes = evalNode(activeSmask.id, "Result");
    maskVal = smaskRes[0];
  }

  const activeSine = nodes.find((n) => n.data?.nodeType === "Sine");
  if (activeSine) {
    const sineRes = evalNode(activeSine.id, "Result");
    // Remap sine (-1..1) to (0..1) for visualization debug pulse
    pulseVal = (sineRes[0] + 1) * 0.5;
  }

  const r = Math.round(clamp(finalVal[0]) * 255);
  const g = Math.round(clamp(finalVal[1]) * 255);
  const b = Math.round(clamp(finalVal[2]) * 255);

  return {
    color: `rgb(${r}, ${g}, ${b})`,
    value: finalVal[0],
    mask: maskVal,
    pulse: pulseVal
  };
}
