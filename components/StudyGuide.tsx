import React from 'react';
import { WireCanvas } from './WireCanvas';
import { SCENARIOS } from '../constants';
import { Connection } from '../types';
import { ArrowLeft, Printer, Home, Info } from 'lucide-react';

interface StudyGuideProps {
  onBack: () => void;
}

export const StudyGuide: React.FC<StudyGuideProps> = ({ onBack }) => {
  
  // Helper to determine phase color based on the set's components
  const getColorForSet = (set: string[]) => {
    // Check all IDs in the required set to determine the phase
    const flat = set.join('_');
    
    // Neutral (N/n)
    if (flat.includes('_N') || flat.includes('_n')) return '#94a3b8'; // Grey
    
    // Phase A (A/a)
    if (flat.includes('_A') || flat.includes('_a')) return '#ef4444'; // Red
    
    // Phase B (B/b)
    if (flat.includes('_B') || flat.includes('_b')) return '#d97706'; // Amber (Darker yellow for readability)
    
    // Phase C (C/c)
    if (flat.includes('_C') || flat.includes('_c')) return '#3b82f6'; // Blue
    
    // Fallback
    return '#10b981'; 
  };

  const generateCorrectConnections = (scenarioId: string): Connection[] => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return [];

    const connections: Connection[] = [];
    
    // Use the first valid configuration as the standard example
    const standardConfig = scenario.validConfigurations[0];

    standardConfig.forEach((set, setIdx) => {
        // Determine color for this entire set of connections
        const setColor = getColorForSet(set);

        for(let i = 0; i < set.length - 1; i++) {
            connections.push({
                id: `study-${scenarioId}-${setIdx}-${i}`,
                from: set[i],
                to: set[i+1],
                color: setColor // Inject semantic color
            });
        }
    });

    return connections;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:min-h-0 print:h-auto pb-24">
      {/* Header - Hidden when printing */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 print:hidden shadow-lg flex justify-between items-center">
        <button onClick={onBack} type="button" className="flex items-center gap-2 hover:text-blue-300">
           <ArrowLeft /> Back to Lab
        </button>
        <h1 className="font-bold text-xl">Reference Manual (Answer Key)</h1>
        <button onClick={handlePrint} type="button" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold">
           <Printer size={20} /> Print / Save PDF
        </button>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-12 print:p-0 print:space-y-0 print:block print:w-full print:max-w-none">
        
        <div className="text-center mb-8 print:mb-8 print:pt-4">
             <h1 className="text-3xl font-bold uppercase tracking-widest border-b-4 border-slate-900 inline-block pb-2">Transformer Test Reference Manual</h1>
             <p className="mt-2 text-slate-600">Standard Transformer Bank Connections</p>
             
             <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-2xl mx-auto flex gap-3 print:hidden">
                <Info className="text-blue-500 shrink-0" />
                <p className="text-sm text-slate-700">
                    <strong>Note:</strong> These diagrams show one standard wiring configuration. 
                    In the simulator (and in the field), <em>any</em> configuration that establishes the same electrical nodes is considered correct. 
                    (e.g., The order in which you daisy-chain neutrals or hots does not matter as long as they are all connected to the correct bus).
                </p>
             </div>
        </div>

        {SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="break-inside-avoid break-after-page mb-12 print:mb-4 print:pb-8 print:border-b print:border-slate-200 last:border-0">
                <div className="mb-4 border-l-4 border-slate-900 pl-4">
                    <h2 className="text-2xl font-bold">{scenario.title}</h2>
                    <p className="text-slate-600">{scenario.description}</p>
                </div>
                
                {/* 
                   Canvas Container
                */}
                <div className="h-[500px] w-full border border-slate-300 rounded-lg overflow-hidden bg-white print:border-2 print:border-black print:h-[400px]">
                    <WireCanvas 
                        scenario={scenario}
                        connections={generateCorrectConnections(scenario.id)}
                        setConnections={() => {}} // No-op
                        onSubmit={() => {}} // No-op
                        isLastScenario={false}
                        readonly={true}
                    />
                </div>
                <div className="mt-2 text-xs text-slate-400 font-mono text-center print:text-black">
                    Colors: A=Red, B=Amber, C=Blue, N=Grey.
                </div>
            </div>
        ))}
        
        {/* Bottom Navigation for usability */}
        <div className="flex justify-center mt-12 mb-8 print:hidden">
             <button 
                type="button"
                onClick={onBack} 
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-lg font-bold shadow-lg transition-all z-50 relative cursor-pointer active:scale-95 transform hover:shadow-xl"
             >
                <Home size={20} className="pointer-events-none" /> Return to Main Menu
             </button>
        </div>

        <div className="text-center text-xs text-slate-400 mt-8 print:text-black print:mt-10">
            Generated by Transformer Test Simulator
        </div>
      </div>
    </div>
  );
};