export function exportGraphToT3D(nodes: any[], edges: any[]): string {
  // -----------------------------------------------------------------------
  // Step 1: Map each React Flow node to UE5 naming conventions
  // -----------------------------------------------------------------------
  const nodeMap = new Map<
    string,
    { ueNodeName: string; ueExprName: string; ueClass: string; node: any; index: number }
  >();

  let nodeIndex = 0;
  const exprCounts: Record<string, number> = {};

  nodes.forEach((node) => {
    const type = node.data?.nodeType;
    const ueClass = resolveUEClass(type);

    const count = exprCounts[ueClass] || 0;
    exprCounts[ueClass] = count + 1;

    const ueNodeName = `MaterialGraphNode_${nodeIndex}`;
    const ueExprName = `${ueClass}_${count}`;

    nodeMap.set(node.id, { ueNodeName, ueExprName, ueClass, node, index: nodeIndex });
    nodeIndex++;
  });

  // -----------------------------------------------------------------------
  // Step 2: Generate unique PinIds for every input/output handle on every node
  // -----------------------------------------------------------------------
  const pinIdMap = new Map<string, { inputs: Record<string, string>; outputs: Record<string, string> }>();

  nodeMap.forEach((info) => {
    const inputs: Record<string, string> = {};
    const outputs: Record<string, string> = {};

    const nodeInputs: string[] = info.node.data?.inputs || [];
    const nodeOutputs: string[] = info.node.data?.outputs || [];

    nodeInputs.forEach((_name: string, i: number) => {
      inputs[_name] = makeGuid(info.index, "i", i);
    });
    nodeOutputs.forEach((_name: string, i: number) => {
      outputs[_name] = makeGuid(info.index, "o", i);
    });

    pinIdMap.set(info.node.id, { inputs, outputs });
  });

  // -----------------------------------------------------------------------
  // Step 3: Build connection lookups for both Expression-level and Pin-level
  // -----------------------------------------------------------------------

  // Expression-level: targetNodeId -> { targetHandle -> sourceExprName + sourceClass }
  const exprConnMap: Record<string, Record<string, { exprName: string; ueClass: string }>> = {};

  // Pin-level LinkedTo: nodeId -> handleName -> [{ linkedNodeName, linkedPinId }]
  const inputLinkedTo = new Map<string, Map<string, { nodeName: string; pinId: string }[]>>();
  const outputLinkedTo = new Map<string, Map<string, { nodeName: string; pinId: string }[]>>();

  edges.forEach((edge) => {
    const srcInfo = nodeMap.get(edge.source);
    const tgtInfo = nodeMap.get(edge.target);
    if (!srcInfo || !tgtInfo) return;

    const srcPins = pinIdMap.get(edge.source);
    const tgtPins = pinIdMap.get(edge.target);
    if (!srcPins || !tgtPins) return;

    const srcOutPinId = srcPins.outputs[edge.sourceHandle];
    const tgtInPinId = tgtPins.inputs[edge.targetHandle];
    if (!srcOutPinId || !tgtInPinId) return;

    // Expression-level connection
    if (!exprConnMap[edge.target]) exprConnMap[edge.target] = {};
    exprConnMap[edge.target][edge.targetHandle] = {
      exprName: srcInfo.ueExprName,
      ueClass: srcInfo.ueClass,
    };

    // Pin-level: target's input pin LinkedTo source's output pin
    if (!inputLinkedTo.has(edge.target)) inputLinkedTo.set(edge.target, new Map());
    const tgtMap = inputLinkedTo.get(edge.target)!;
    if (!tgtMap.has(edge.targetHandle)) tgtMap.set(edge.targetHandle, []);
    tgtMap.get(edge.targetHandle)!.push({ nodeName: srcInfo.ueNodeName, pinId: srcOutPinId });

    // Pin-level: source's output pin LinkedTo target's input pin
    if (!outputLinkedTo.has(edge.source)) outputLinkedTo.set(edge.source, new Map());
    const srcMap = outputLinkedTo.get(edge.source)!;
    if (!srcMap.has(edge.sourceHandle)) srcMap.set(edge.sourceHandle, []);
    srcMap.get(edge.sourceHandle)!.push({ nodeName: tgtInfo.ueNodeName, pinId: tgtInPinId });
  });

  // -----------------------------------------------------------------------
  // Step 4: Build the T3D text
  // -----------------------------------------------------------------------
  let t3d = "";

  nodeMap.forEach((info, nodeId) => {
    const { ueNodeName, ueExprName, ueClass, node } = info;
    const values = node.data?.values || {};
    const posX = Math.round(node.position.x);
    const posY = Math.round(node.position.y);
    const exprConns = exprConnMap[nodeId] || {};

    // --- Outer MaterialGraphNode ---
    t3d += `Begin Object Class=/Script/UnrealEd.MaterialGraphNode Name="${ueNodeName}"\n`;

    // --- Inner Expression: forward declaration ---
    t3d += `   Begin Object Class=/Script/Engine.${ueClass} Name="${ueExprName}"\n`;
    t3d += `   End Object\n`;

    // --- Inner Expression: properties ---
    t3d += `   Begin Object Name="${ueExprName}"\n`;

    // Parameter-specific properties
    if (ueClass === "MaterialExpressionScalarParameter") {
      const pName = values.name || node.id;
      const defVal = values.value ?? 0.5;
      t3d += `      ParameterName="${pName}"\n`;
      t3d += `      DefaultValue=${defVal.toFixed(6)}\n`;
    } else if (ueClass === "MaterialExpressionVectorParameter") {
      const pName = values.name || node.id;
      const hex = values.color || "#ffffff";
      const clean = hex.replace("#", "");
      const r = (parseInt(clean.substring(0, 2), 16) / 255 || 0).toFixed(6);
      const g = (parseInt(clean.substring(2, 4), 16) / 255 || 0).toFixed(6);
      const b = (parseInt(clean.substring(4, 6), 16) / 255 || 0).toFixed(6);
      t3d += `      ParameterName="${pName}"\n`;
      t3d += `      DefaultValue=(R=${r},G=${g},B=${b},A=1.000000)\n`;
    } else if (ueClass === "MaterialExpressionComponentMask") {
      const r = values.maskR ? "True" : "False";
      const g = values.maskG ? "True" : "False";
      const b = values.maskB ? "True" : "False";
      const a = values.maskA ? "True" : "False";
      t3d += `      R=${r}\n`;
      t3d += `      G=${g}\n`;
      t3d += `      B=${b}\n`;
      t3d += `      A=${a}\n`;
    }

    // Expression-level connections: A=(Expression=Class'"ExprName"')
    Object.keys(exprConns).forEach((pinName) => {
      const srcConn = exprConns[pinName];
      const uePinName = mapPinName(pinName, ueClass);
      t3d += `      ${uePinName}=(Expression=${srcConn.ueClass}'"${srcConn.exprName}"')\n`;
    });

    // Editor position on the expression itself
    t3d += `      MaterialExpressionEditorX=${posX}\n`;
    t3d += `      MaterialExpressionEditorY=${posY}\n`;
    t3d += `      MaterialExpressionGuid=${generateGuid()}\n`;
    t3d += `   End Object\n`;

    // --- Outer: link to inner expression ---
    t3d += `   MaterialExpression=${ueClass}'"${ueExprName}"'\n`;
    t3d += `   NodePosX=${posX}\n`;
    t3d += `   NodePosY=${posY}\n`;
    t3d += `   NodeGuid=${generateGuid()}\n`;

    // --- CustomProperties Pin: INPUT pins ---
    const nodeInputs: string[] = node.data?.inputs || [];
    const pins = pinIdMap.get(nodeId);
    const inLinks = inputLinkedTo.get(nodeId);

    nodeInputs.forEach((handleName: string) => {
      const uePinName = mapPinName(handleName, ueClass);
      const pinId = pins?.inputs[handleName] || generateGuid();
      const linked = inLinks?.get(handleName);

      let line = `   CustomProperties Pin (PinId=${pinId},PinName="${uePinName}",PinType.PinCategory="optional"`;
      if (linked && linked.length > 0) {
        const refs = linked.map((l) => `${l.nodeName} ${l.pinId}`).join(",");
        line += `,LinkedTo=(${refs},)`;
      }
      line += `,)\n`;
      t3d += line;
    });

    // --- CustomProperties Pin: OUTPUT pins ---
    const nodeOutputs: string[] = node.data?.outputs || [];
    const outLinks = outputLinkedTo.get(nodeId);

    nodeOutputs.forEach((handleName: string) => {
      const pinId = pins?.outputs[handleName] || generateGuid();
      const linked = outLinks?.get(handleName);

      let line = `   CustomProperties Pin (PinId=${pinId},PinName="Output",Direction="EGPD_Output",PinType.PinCategory=""`;
      if (linked && linked.length > 0) {
        const refs = linked.map((l) => `${l.nodeName} ${l.pinId}`).join(",");
        line += `,LinkedTo=(${refs},)`;
      }
      line += `,)\n`;
      t3d += line;
    });

    t3d += `End Object\n`;
  });

  return t3d;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveUEClass(nodeType: string): string {
  switch (nodeType) {
    case "ScalarParameter":  return "MaterialExpressionScalarParameter";
    case "VectorParameter":  return "MaterialExpressionVectorParameter";
    case "Add":              return "MaterialExpressionAdd";
    case "Multiply":         return "MaterialExpressionMultiply";
    case "Lerp":             return "MaterialExpressionLinearInterpolate";
    case "Sine":             return "MaterialExpressionSine";
    case "Time":             return "MaterialExpressionTime";
    case "TexCoord":         return "MaterialExpressionTextureCoordinate";
    case "SphereMask":       return "MaterialExpressionSphereMask";
    case "BoxMask":          return "MaterialExpressionBoxMask2D";
    case "ConeMask":         return "MaterialExpressionConeMask";
    case "ComponentMask":    return "MaterialExpressionComponentMask";
    case "OneMinus":         return "MaterialExpressionOneMinus";
    case "Step":             return "MaterialExpressionStep";
    case "RadialGradientExponential": return "MaterialExpressionRadialGradientExponential";
    case "FinalColor":       return "MaterialExpressionMultiply";
    default:                 return "MaterialExpressionAdd";
  }
}

/** Maps React Flow handle names to Unreal Engine material expression pin property names. */
function mapPinName(pinName: string, ueClass: string): string {
  if (pinName === "Value" && ueClass === "MaterialExpressionSine") return "Input";
  if (ueClass === "MaterialExpressionSphereMask") {
    if (pinName === "Radius") return "AttenuationRadius";
    if (pinName === "Hardness") return "HardnessPercent";
  }
  if (ueClass === "MaterialExpressionBoxMask2D") {
    if (pinName === "Width") return "BoxWidth";
    if (pinName === "Height") return "BoxHeight";
    if (pinName === "Hardness") return "HardnessPercent";
  }
  if (ueClass === "MaterialExpressionConeMask") {
    if (pinName === "Radius") return "FarRadius";
    if (pinName === "Angle") return "SpreadAngle";
  }
  // FinalColor (Material Result) mapped to Multiply — map first connected input to "A"
  if (ueClass === "MaterialExpressionMultiply") {
    if (pinName === "BaseColor" || pinName === "Color" || pinName === "EmissiveColor") return "A";
  }
  return pinName;
}

/** Generates a random 32-char hex GUID (uppercase). */
function generateGuid(): string {
  const chars = "ABCDEF0123456789";
  let guid = "";
  for (let i = 0; i < 32; i++) {
    guid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return guid;
}

/** Generates a deterministic 32-char hex GUID based on node index, direction, and pin index. */
function makeGuid(nodeIdx: number, dir: string, pinIdx: number): string {
  // Simple deterministic GUID: pad nodeIdx (8 hex), dir marker (8 hex), pinIdx (8 hex), filler (8 hex)
  const n = nodeIdx.toString(16).toUpperCase().padStart(8, "0");
  const d = dir === "i" ? "AAAAAAAA" : "BBBBBBBB";
  const p = pinIdx.toString(16).toUpperCase().padStart(8, "0");
  const f = ((nodeIdx * 31 + pinIdx * 17 + 12345) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return (n + d + p + f).substring(0, 32);
}
