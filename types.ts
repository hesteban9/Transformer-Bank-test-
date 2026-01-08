
export interface Terminal {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'primary_bus' | 'secondary_bus' | 'primary_bushing' | 'secondary_bushing' | 'neutral';
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  color?: string; // Optional hex color override
}

export interface Transformer {
  id: string;
  x: number;
  y: number;
  label: string;
  terminals: Terminal[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  numTransformers: number; // 2 or 3
  transformerHints?: string[]; // Optional labels for tanks (e.g. ["LIGHTING", "POWER"])
  
  // CHANGED: validConfigurations is an array of "requiredSets".
  // The user only needs to match ONE of the configurations in this array to pass.
  // This allows for phase rotations (ABC vs BCA) or different valid construction methods.
  validConfigurations: string[][][]; 
  
  busConfig: {
    primary: string[]; // e.g. ['A', 'B', 'C', 'N']
    secondary: string[]; // e.g. ['a', 'b', 'c', 'n']
  };
}

export enum ExamState {
  MENU = 'MENU',
  TESTING = 'TESTING',
  RESULTS = 'RESULTS',
  STUDY_GUIDE = 'STUDY_GUIDE'
}

export interface QuestionResult {
  scenarioId: string;
  passed: boolean;
  score: number;
}
