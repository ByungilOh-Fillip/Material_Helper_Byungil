export type VisualizationMode = "motion" | "color" | "debug";

export interface MaterialNodeInfo {
  id: string;
  name: string;
  category: string;
  difficulty: "Intro" | "Core" | "Intermediate" | "Advanced";
  description: string;
  inputs: string[];
  outputs: string[];
  expectedRange: string;
  commonUses: string[];
  relatedNodes: string[];
  relatedModules: string[];
  relatedEffects: string[];
  supportedVersions: string[];
  versionWarnings: string[];
  learningOrder: number;
}

export interface MaterialModule {
  id: string;
  name: string;
  goal: string;
  contains: string[];
  parameters: ParameterDefinition[];
  internalStructure: string[];
  inspectNotes: string[];
  recommendedEffects: string[];
}

export interface Recipe {
  id: string;
  name: string;
  category: "Basic" | "Intermediate" | "Advanced";
  moduleName: string;
  goal: string;
  finalVisualResult: string;
  requiredNodes: string[];
  nodeRelationships: string[];
  requiredParameters: ParameterDefinition[];
  commonMistakes: string[];
  expectedBehavior: string;
  motionPreview: string;
  colorPreview: string;
  debugInformation: string[];
  materialSettings: {
    domain: string;
    blendMode: string;
  };
  initialGraph: {
    nodes: any[];
    edges: any[];
  };
}

export interface VersionInfo {
  version: string;
  target: boolean;
  notes: string[];
  substrateNotes: string[];
  materialAttributeNotes: string[];
  deprecatedWorkflows: string[];
  recommendedAlternatives: string[];
  migrationTips: string[];
}

export interface ParameterDefinition {
  id: string;
  name: string;
  type: "scalar" | "color";
  min?: number;
  max?: number;
  default: number | string;
  description: string;
}

export interface SandboxParameter {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
}
