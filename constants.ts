
import { Scenario } from './types';

// Constants for layout
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 700;

// Layout Layers
export const BUS_Y_PRIMARY = 50;     // Top overhead lines
export const BUS_Y_SECONDARY = 650;  // Bottom secondary rack
export const TRANSFORMER_Y = 250;    // Top of the transformer can

// Helper to generate terminal IDs
const pBus = (l: string) => `BUS_P_${l}`;
const sBus = (l: string) => `BUS_S_${l}`;
const tPri = (tIdx: number, term: string) => `T${tIdx}_${term}`;
const tSec = (tIdx: number, term: string) => `T${tIdx}_${term}`;

// --- CONFIG GENERATOR FOR DELTA-DELTA ---
// Generates all valid permutations for a Delta-Delta bank
const generateDeltaDeltaConfigs = () => {
  const configs: string[][][] = [];

  // Phases A, B, C
  const phases = ['A', 'B', 'C'];
  
  // Possible Primary Pairs (The delta loop legs)
  // Indices: 0=(A-B), 1=(B-C), 2=(C-A)
  const getPair = (idx: number) => [phases[idx % 3], phases[(idx + 1) % 3]];

  // Possible Secondary Pairings for the Lighting Pot
  // The Lighting Pot connects to two legs. The third leg becomes the High Leg.
  const secondaryConfigOptions = [
    { lighting: ['a', 'c'], high: 'b' }, // Standard (High Leg B)
    { lighting: ['a', 'b'], high: 'c' }, // High Leg C 
    { lighting: ['b', 'c'], high: 'a' }  // High Leg A
  ];

  // Iterate through which Transformer is the LIGHTING pot (T1, T2, or T3)
  for (let lightingT = 1; lightingT <= 3; lightingT++) {
    const powerT1_Default = (lightingT % 3) + 1; 
    const powerT2_Default = ((lightingT + 1) % 3) + 1; 

    // Iterate through Primary Rotations (Lighting Pot position)
    for (let rot = 0; rot < 3; rot++) {
      
      // Iterate Primary Polarity
      for (let swapPri = 0; swapPri < 2; swapPri++) {
        
        // Iterate Power Pot Positioning
        for (let swapPowerPots = 0; swapPowerPots < 2; swapPowerPots++) {
            
            // Determine Physical IDs for Logical Positions
            let tP1: number, tP2: number;
            if (swapPowerPots === 0) {
                tP1 = powerT1_Default;
                tP2 = powerT2_Default;
            } else {
                tP1 = powerT2_Default;
                tP2 = powerT1_Default;
            }

            // Iterate through valid Secondary placements
            for (const secOption of secondaryConfigOptions) {
                const { lighting: [L1, L2], high: H } = secOption;

                // Iterate Secondary Polarity of Lighting Pot
                for (let swapSec = 0; swapSec < 2; swapSec++) {

                    // Iterate Secondary Polarity of Power Pot 1
                    for (let swapP1 = 0; swapP1 < 2; swapP1++) {
                        
                        // Iterate Secondary Polarity of Power Pot 2
                        for (let swapP2 = 0; swapP2 < 2; swapP2++) {
                    
                            // Helper to manage sets
                            const sets = new Map<string, string[]>();
                            const getSet = (busId: string) => {
                                if (!sets.has(busId)) sets.set(busId, [busId]);
                                return sets.get(busId)!;
                            };

                            // --- PRIMARY CONNECTIONS ---
                            const setupPrimary = (tIdx: number, phaseIdx: number) => {
                                const pair = getPair(phaseIdx);
                                const p1 = pBus(pair[0]);
                                const p2 = pBus(pair[1]);
                                
                                if (swapPri === 0) {
                                    getSet(p1).push(tPri(tIdx, 'H1'));
                                    getSet(p2).push(tPri(tIdx, 'H2'));
                                } else {
                                    getSet(p2).push(tPri(tIdx, 'H1'));
                                    getSet(p1).push(tPri(tIdx, 'H2'));
                                }
                            };

                            // 1. Lighting Pot Primary
                            setupPrimary(lightingT, rot);

                            // 2. Power Pots Primary
                            const pPot1_Pos = (rot + 1) % 3;
                            const pPot2_Pos = (rot + 2) % 3;

                            setupPrimary(tP1, pPot1_Pos);
                            setupPrimary(tP2, pPot2_Pos);


                            // --- SECONDARY CONNECTIONS ---
                            
                            // 1. Lighting Pot Secondary (Connects to n, L1, L2)
                            getSet(sBus('n')).push(tSec(lightingT, 'X2'));
                            
                            let corner1: string; // Bus P1 connects to (besides H)
                            let corner2: string; // Bus P2 connects to (besides H)

                            if (swapSec === 0) {
                                // Lighting: X1->L1, X3->L2
                                getSet(sBus(L1)).push(tSec(lightingT, 'X1'));
                                getSet(sBus(L2)).push(tSec(lightingT, 'X3'));
                                corner1 = sBus(L2);
                                corner2 = sBus(L1);
                            } else {
                                // Lighting: X1->L2, X3->L1
                                getSet(sBus(L2)).push(tSec(lightingT, 'X1'));
                                getSet(sBus(L1)).push(tSec(lightingT, 'X3'));
                                corner1 = sBus(L1);
                                corner2 = sBus(L2);
                            }

                            const highLegBus = sBus(H);
                            
                            // Power Pot 1 Connections (Corner1 <-> H)
                            if (swapP1 === 0) {
                                // Standard: X1 -> Corner, X3 -> H
                                getSet(corner1).push(tSec(tP1, 'X1'));
                                getSet(highLegBus).push(tSec(tP1, 'X3'));
                            } else {
                                // Swapped: X1 -> H, X3 -> Corner
                                getSet(highLegBus).push(tSec(tP1, 'X1'));
                                getSet(corner1).push(tSec(tP1, 'X3'));
                            }

                            // Power Pot 2 Connections (H <-> Corner2)
                            if (swapP2 === 0) {
                                // Standard: X1 -> H, X3 -> Corner
                                getSet(highLegBus).push(tSec(tP2, 'X1'));
                                getSet(corner2).push(tSec(tP2, 'X3'));
                            } else {
                                // Swapped: X1 -> Corner, X3 -> H
                                getSet(corner2).push(tSec(tP2, 'X1'));
                                getSet(highLegBus).push(tSec(tP2, 'X3'));
                            }

                            // Convert Map values to array of arrays
                            configs.push(Array.from(sets.values()));
                        }
                    }
                }
            }
        }
      }
    }
  }
  return configs;
};

// --- CONFIG GENERATOR FOR OPEN WYE - OPEN DELTA ---
// Generates all valid permutations for Open Wye - Open Delta
const generateOpenDeltaConfigs = () => {
  const configs: string[][][] = [];
  const primaryPhases = ['A', 'B', 'C'];
  const secondaryPhases = ['a', 'b', 'c'];

  // Fixed Roles for this scenario: T1 is Lighting, T2 is Power
  const tLighting = 1;
  const tPower = 2;

  // 1. Iterate Primary Phases (Pairs)
  for (let i = 0; i < 3; i++) {
    const p1 = primaryPhases[i];
    const p2 = primaryPhases[(i + 1) % 3];

    // 2. Iterate Secondary Permutations
    // Which two buses does the Lighting Pot span? (L1, L2). The third is High Leg (H).
    for (let j = 0; j < 3; j++) {
      const sL1 = secondaryPhases[j];
      const sL2 = secondaryPhases[(j + 1) % 3];
      const sHigh = secondaryPhases.find(p => p !== sL1 && p !== sL2)!;

      // The Power pot connects the High Leg to ONE of the Lighting legs (the "Common" point).
      const commonOptions = [sL1, sL2];
      
      for (const sCommon of commonOptions) {
        
        // 3. Iterate Polarities (Permissive Mode)
        // Allow H1/H2 swaps and X1/X3 swaps on both transformers
        for (let swapT1Pri = 0; swapT1Pri < 2; swapT1Pri++) {
         for (let swapT2Pri = 0; swapT2Pri < 2; swapT2Pri++) {
          for (let swapT1Sec = 0; swapT1Sec < 2; swapT1Sec++) {
           for (let swapT2Sec = 0; swapT2Sec < 2; swapT2Sec++) {
             
             const sets = new Map<string, string[]>();
             const getSet = (busId: string) => {
                 if (!sets.has(busId)) sets.set(busId, [busId]);
                 return sets.get(busId)!;
             };

             // --- Primary Connections ---
             // T1 (Lighting)
             if (swapT1Pri === 0) {
                getSet(pBus(p1)).push(tPri(tLighting, 'H1'));
                getSet(pBus('N')).push(tPri(tLighting, 'H2'));
             } else {
                getSet(pBus('N')).push(tPri(tLighting, 'H1'));
                getSet(pBus(p1)).push(tPri(tLighting, 'H2'));
             }
             // T2 (Power)
             if (swapT2Pri === 0) {
                getSet(pBus(p2)).push(tPri(tPower, 'H1'));
                getSet(pBus('N')).push(tPri(tPower, 'H2'));
             } else {
                getSet(pBus('N')).push(tPri(tPower, 'H1'));
                getSet(pBus(p2)).push(tPri(tPower, 'H2'));
             }

             // --- Secondary Connections ---
             // T1 (Lighting)
             getSet(sBus('n')).push(tSec(tLighting, 'X2')); // Neutral Center Tap
             
             if (swapT1Sec === 0) {
                 getSet(sBus(sL1)).push(tSec(tLighting, 'X1'));
                 getSet(sBus(sL2)).push(tSec(tLighting, 'X3'));
             } else {
                 getSet(sBus(sL2)).push(tSec(tLighting, 'X1'));
                 getSet(sBus(sL1)).push(tSec(tLighting, 'X3'));
             }

             // T2 (Power)
             if (swapT2Sec === 0) {
                 getSet(sBus(sCommon)).push(tSec(tPower, 'X1'));
                 getSet(sBus(sHigh)).push(tSec(tPower, 'X3'));
             } else {
                 getSet(sBus(sHigh)).push(tSec(tPower, 'X1'));
                 getSet(sBus(sCommon)).push(tSec(tPower, 'X3'));
             }

             configs.push(Array.from(sets.values()));
           }
          }
         }
        }
      }
    }
  }
  return configs;
};


// Scenarios
export const SCENARIOS: Scenario[] = [
  {
    id: 'wye-wye-120-208',
    title: 'Wye - Wye Bank (120/208V)',
    description: 'Connect a 3-transformer bank. Primary 4-wire Wye, Secondary 4-wire Wye. (Neutrals must be tied)',
    numTransformers: 3,
    transformerHints: ['120/208', '120/208', '120/208'],
    busConfig: { primary: ['A', 'B', 'C', 'N'], secondary: ['a', 'b', 'c', 'n'] },
    validConfigurations: [
      // CONFIG 1: Standard (T1=A, T2=B, T3=C)
      [
        [pBus('A'), tPri(1, 'H1')],
        [pBus('B'), tPri(2, 'H1')],
        [pBus('C'), tPri(3, 'H1')],
        [pBus('N'), tPri(1, 'H2'), tPri(2, 'H2'), tPri(3, 'H2')],
        [sBus('a'), tSec(1, 'X1')],
        [sBus('b'), tSec(2, 'X1')],
        [sBus('c'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')], // Neutrals tied
      ],
      // CONFIG 2: Rotation (T1=B, T2=C, T3=A)
      [
        [pBus('B'), tPri(1, 'H1')],
        [pBus('C'), tPri(2, 'H1')],
        [pBus('A'), tPri(3, 'H1')],
        [pBus('N'), tPri(1, 'H2'), tPri(2, 'H2'), tPri(3, 'H2')],
        [sBus('b'), tSec(1, 'X1')],
        [sBus('c'), tSec(2, 'X1')],
        [sBus('a'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')],
      ],
      // CONFIG 3: Rotation (T1=C, T2=A, T3=B)
      [
        [pBus('C'), tPri(1, 'H1')],
        [pBus('A'), tPri(2, 'H1')],
        [pBus('B'), tPri(3, 'H1')],
        [pBus('N'), tPri(1, 'H2'), tPri(2, 'H2'), tPri(3, 'H2')],
        [sBus('c'), tSec(1, 'X1')],
        [sBus('a'), tSec(2, 'X1')],
        [sBus('b'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')],
      ]
    ]
  },
  {
    id: 'delta-delta-240',
    title: 'Delta - Delta Bank (240V)',
    description: 'Primary Delta, Secondary Delta with 120/240V High Leg. Ensure the High Leg connects to the Orange Bus (b).',
    numTransformers: 3,
    transformerHints: ['XFMR', 'XFMR', 'XFMR'],
    busConfig: { primary: ['A', 'B', 'C'], secondary: ['a', 'b', 'c', 'n'] },
    validConfigurations: generateDeltaDeltaConfigs() 
  },
  {
    id: 'delta-wye-120-208',
    title: 'Delta - Wye Bank (120/208V)',
    description: 'Connect a 3-transformer bank. Primary Delta, Secondary Wye.',
    numTransformers: 3,
    transformerHints: ['120/208', '120/208', '120/208'],
    busConfig: { primary: ['A', 'B', 'C'], secondary: ['a', 'b', 'c', 'n'] },
    validConfigurations: [
      // === OPTION 1: Standard (T1=A-B -> a) ===
      [
        [pBus('A'), tPri(1, 'H1'), tPri(3, 'H2')],
        [pBus('B'), tPri(2, 'H1'), tPri(1, 'H2')],
        [pBus('C'), tPri(3, 'H1'), tPri(2, 'H2')],
        
        [sBus('a'), tSec(1, 'X1')],
        [sBus('b'), tSec(2, 'X1')],
        [sBus('c'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')],
      ],
      // === OPTION 2: Rotation (T1=B-C -> b) ===
      [
        [pBus('A'), tPri(3, 'H1'), tPri(2, 'H2')],
        [pBus('B'), tPri(1, 'H1'), tPri(3, 'H2')],
        [pBus('C'), tPri(2, 'H1'), tPri(1, 'H2')],
        
        [sBus('b'), tSec(1, 'X1')],
        [sBus('c'), tSec(2, 'X1')],
        [sBus('a'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')],
      ],
      // === OPTION 3: Rotation (T1=C-A -> c) ===
      [
        [pBus('A'), tPri(2, 'H1'), tPri(1, 'H2')],
        [pBus('B'), tPri(3, 'H1'), tPri(2, 'H2')],
        [pBus('C'), tPri(1, 'H1'), tPri(3, 'H2')],
        
        [sBus('c'), tSec(1, 'X1')],
        [sBus('a'), tSec(2, 'X1')],
        [sBus('b'), tSec(3, 'X1')],
        [sBus('n'), tSec(1, 'X2'), tSec(2, 'X2'), tSec(3, 'X2')],
      ]
    ]
  },
  {
    id: 'open-wye-open-delta',
    title: 'Open Wye - Open Delta',
    description: 'Primary Open Wye, Secondary Open Delta (4-wire). T1 is Lighting, T2 is Power.',
    numTransformers: 2,
    transformerHints: ['LIGHTING', 'POWER'],
    busConfig: { primary: ['A', 'B', 'C', 'N'], secondary: ['a', 'b', 'c', 'n'] },
    validConfigurations: generateOpenDeltaConfigs()
  }
];
