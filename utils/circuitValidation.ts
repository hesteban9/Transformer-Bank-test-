
import { Connection } from '../types';

/**
 * Validates if the user's connections match the required electrical sets.
 * This uses a Disjoint Set Union (DSU) or connected components approach.
 */
export const validateConnections = (
  userConnections: Connection[],
  validConfigurations: string[][][] // Array of valid Set Arrays
): { passed: boolean; score: number; errors: string[] } => {
  
  // 1. Build Adjacency List from User Connections
  const adj = new Map<string, string[]>();
  
  // Register all terminals found in user connections
  const registerTerminal = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
  };

  userConnections.forEach(c => {
    registerTerminal(c.from);
    registerTerminal(c.to);
    adj.get(c.from)?.push(c.to);
    adj.get(c.to)?.push(c.from);
  });

  // 2. Find Connected Components (User Sets)
  const visited = new Set<string>();
  const userSets: Set<string>[] = [];

  for (const terminal of adj.keys()) {
    if (!visited.has(terminal)) {
      const component = new Set<string>();
      const queue = [terminal];
      visited.add(terminal);
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.add(curr);
        
        const neighbors = adj.get(curr) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      userSets.push(component);
    }
  }

  // 3. Iterate through Valid Configurations
  // We check if the user matches ANY of the valid configurations.
  
  let bestScore = 0;
  let bestErrors: string[] = ["No connections made."];
  let hasPassed = false;

  for (const config of validConfigurations) {
    const requiredSets = config;
    
    // Register required terminals into the adj list for this specific check 
    // (technically redundant for finding user components, but good for completeness if we were doing more strict checks)
    requiredSets.forEach(set => set.forEach(registerTerminal));

    const currentErrors: string[] = [];
    let satisfiedCount = 0;
    let shortCircuit = false;

    // Check for Short Circuits in THIS configuration
    for (const uSet of userSets) {
      const matchedReqSetsIndices = new Set<number>();
      
      requiredSets.forEach((reqSet, index) => {
        // Check if any terminal of reqSet is in uSet
        const overlap = reqSet.some(t => uSet.has(t));
        if (overlap) {
          matchedReqSetsIndices.add(index);
        }
      });

      if (matchedReqSetsIndices.size > 1) {
        currentErrors.push("Short Circuit Detected! Distinct phases connected together.");
        shortCircuit = true;
        break; 
      }
    }

    if (shortCircuit) {
        // If this config has a short, we save the error but continue checking other configs 
        // (unless all fail, then we report the short).
        if (bestErrors.length === 0 || bestErrors[0].includes("No connections")) {
             bestErrors = currentErrors;
        }
        continue;
    }

    // Check completeness
    requiredSets.forEach((reqSet) => {
      const isSatisfied = userSets.some(uSet => {
          return reqSet.every(term => uSet.has(term));
      });

      if (isSatisfied) {
        satisfiedCount++;
      } else {
          const missing = reqSet.join(', ');
          currentErrors.push(`Incomplete: ${missing}`);
      }
    });

    const currentScore = (satisfiedCount / requiredSets.length) * 100;

    if (currentErrors.length === 0) {
        hasPassed = true;
        bestScore = 100;
        bestErrors = [];
        break; // Found a matching config!
    }

    // Keep track of the "closest" match to give helpful error messages
    if (currentScore > bestScore) {
        bestScore = currentScore;
        bestErrors = currentErrors;
    }
  }

  return { passed: hasPassed, score: hasPassed ? 100 : bestScore, errors: bestErrors };
};
