import React, { useState, useRef, useMemo } from 'react';
import { Terminal, Connection, Transformer, Scenario } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BUS_Y_PRIMARY, BUS_Y_SECONDARY, TRANSFORMER_Y } from '../constants';
import { clsx } from 'clsx';
import { Trash2, CheckCircle, ArrowRight } from 'lucide-react';

interface WireCanvasProps {
  scenario: Scenario;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  onSubmit: () => void;
  isLastScenario: boolean;
  readonly?: boolean; // New prop for Study Guide mode
}

export const WireCanvas: React.FC<WireCanvasProps> = ({ 
  scenario, 
  connections, 
  setConnections, 
  onSubmit, 
  isLastScenario,
  readonly = false
}) => {
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate Layout Data
  const layout = useMemo(() => {
    const transformers: Transformer[] = [];
    const busTerminals: Terminal[] = [];

    // Bus Generators
    const generateBus = (labels: string[], yBase: number, prefix: string, type: 'primary_bus' | 'secondary_bus') => {
      const totalWidth = CANVAS_WIDTH * 0.8;
      const startX = (CANVAS_WIDTH - totalWidth) / 2;
      
      labels.forEach((label, i) => {
        const x = (CANVAS_WIDTH / (labels.length + 1)) * (i + 1);
        busTerminals.push({
          id: `BUS_${prefix}_${label}`,
          x: x,
          y: yBase,
          label,
          type
        });
      });
    };

    generateBus(scenario.busConfig.primary, BUS_Y_PRIMARY, 'P', 'primary_bus');
    generateBus(scenario.busConfig.secondary, BUS_Y_SECONDARY, 'S', 'secondary_bus');

    // Transformer Generators
    const tSpacing = CANVAS_WIDTH / (scenario.numTransformers + 1);

    for (let i = 1; i <= scenario.numTransformers; i++) {
      const tx = tSpacing * i;
      const ty = TRANSFORMER_Y;
      
      const terms: Terminal[] = [
        { id: `T${i}_H1`, x: tx - 30, y: ty - 10, label: 'H1', type: 'primary_bushing' },
        { id: `T${i}_H2`, x: tx + 30, y: ty - 10, label: 'H2', type: 'primary_bushing' },
        
        { id: `T${i}_X1`, x: tx - 45, y: ty + 90, label: 'X1', type: 'secondary_bushing' },
        { id: `T${i}_X2`, x: tx, y: ty + 90, label: 'X2', type: 'secondary_bushing' },
        { id: `T${i}_X3`, x: tx + 45, y: ty + 90, label: 'X3', type: 'secondary_bushing' },
      ];

      transformers.push({
        id: `T${i}`,
        x: tx,
        y: ty,
        label: `T${i}`,
        terminals: terms
      });
    }

    return { transformers, busTerminals };
  }, [scenario]);

  const allTerminals = useMemo(() => {
    return [
      ...layout.busTerminals,
      ...layout.transformers.flatMap(t => t.terminals)
    ];
  }, [layout]);

  const getTerminalPos = (id: string) => allTerminals.find(t => t.id === id);

  // Helper to determine wire color
  const getWireColor = (c: Connection, index: number) => {
    if (c.color) return c.color; // Use override if present (from Study Guide)

    const ids = [c.from, c.to];
    
    // 1. Identify Phase/Neutral by connection to Bus
    // Neutral (White/Grey)
    if (ids.some(id => id.endsWith('_N') || id.endsWith('_n'))) return '#94a3b8'; 
    // Phase A (Red)
    if (ids.some(id => id.endsWith('_A') || id.endsWith('_a'))) return '#ef4444'; 
    // Phase B (Amber/Orange - High vis)
    if (ids.some(id => id.endsWith('_B') || id.endsWith('_b'))) return '#d97706'; 
    // Phase C (Blue)
    if (ids.some(id => id.endsWith('_C') || id.endsWith('_c'))) return '#3b82f6'; 

    // 2. Fallback for Internal Jumpers (Cycle distinct colors)
    // This makes distinct wires easy to see even if they don't touch the bus directly
    const PALETTE = [
      '#ec4899', // Pink
      '#a855f7', // Purple
      '#14b8a6', // Teal
      '#f97316', // Orange
      '#84cc16', // Lime
    ];
    return PALETTE[index % PALETTE.length];
  };

  // Handlers
  const handleTerminalClick = (id: string) => {
    if (readonly) return;

    if (activeTerminal === null) {
      setActiveTerminal(id);
    } else {
      if (activeTerminal !== id) {
        const newConn: Connection = {
          id: `${activeTerminal}-${id}-${Date.now()}`,
          from: activeTerminal,
          to: id
        };
        const exists = connections.some(c => 
          (c.from === newConn.from && c.to === newConn.to) || 
          (c.from === newConn.to && c.to === newConn.from)
        );
        
        if (!exists) {
          setConnections(prev => [...prev, newConn]);
        }
      }
      setActiveTerminal(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readonly) return;
    if (activeTerminal && svgRef.current) {
      const CTM = svgRef.current.getScreenCTM();
      if (CTM) {
        setMousePos({
          x: (e.clientX - CTM.e) / CTM.a,
          y: (e.clientY - CTM.f) / CTM.d
        });
      }
    }
  };

  const removeConnection = (id: string) => {
    if (readonly) return;
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setConnections([]);
    setActiveTerminal(null);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSubmit();
  };

  // SVG ID Namespace to prevent collisions in Study Guide
  const sid = scenario.id;

  return (
    <div className={`relative bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 overflow-hidden select-none h-full flex flex-col ${readonly ? 'print:shadow-none print:border-2 print:border-black print:bg-white' : ''}`}>
      
      {/* --- Footer Control Bar (Integrated) --- */}
      {!readonly && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-4 flex items-center justify-between z-20">
          <div className="flex-1 max-w-lg">
             <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase text-yellow-500 tracking-wider">Job Order</span>
              </div>
              <h3 className="font-mono text-lg font-bold text-white tracking-tight leading-tight truncate">{scenario.title}</h3>
              <p className="text-slate-400 text-xs hidden sm:block truncate">{scenario.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Trash2 size={16} /> Reset
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-500 shadow-lg shadow-green-900/30 text-xs font-bold uppercase tracking-wider transition-all transform hover:translate-y-px"
            >
              {isLastScenario ? 'Finish Exam' : 'Next Bank'} {isLastScenario ? <CheckCircle size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Readonly Header */}
      {readonly && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-slate-800/50 print:bg-transparent print:border-b print:border-black z-10">
           <h3 className="font-mono text-xl font-bold text-white print:text-black">{scenario.title}</h3>
           <p className="text-slate-400 text-sm print:text-black">{scenario.description}</p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className={`w-full h-full touch-none cursor-crosshair bg-[#0f172a] ${!readonly ? 'pb-24' : ''} print:bg-white`} 
        onMouseMove={handleMouseMove}
        onClick={() => setActiveTerminal(null)}
      >
        <defs>
          <pattern id={`grid-${sid}`} width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="1" className="print:stroke-gray-200" />
          </pattern>
          <linearGradient id={`ceramic-${sid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id={`spool-${sid}`} x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#d1d5db" />
             <stop offset="50%" stopColor="#f3f4f6" />
             <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id={`tank-${sid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${sid})`} />

        <text x="20" y={BUS_Y_PRIMARY + 10} className="fill-slate-700 font-mono text-xs font-bold uppercase tracking-widest pointer-events-none print:fill-black">PRIMARY FEEDER (SOURCE)</text>
        <text x="20" y={BUS_Y_SECONDARY - 20} className="fill-slate-700 font-mono text-xs font-bold uppercase tracking-widest pointer-events-none print:fill-black">SECONDARY BUS (LOAD)</text>

        {/* --- Buses --- */}
        {layout.busTerminals.filter(t => t.type === 'primary_bus').map((t) => (
          <g key={t.id}>
             <line x1="0" y1={t.y} x2={CANVAS_WIDTH} y2={t.y} stroke={t.label === 'N' ? '#9ca3af' : '#1e293b'} strokeWidth={t.label === 'N' ? 2 : 4} strokeDasharray={t.label === 'N' ? '5,5' : 'none'} className="opacity-50 print:stroke-black" />
             <line x1="0" y1={t.y} x2={CANVAS_WIDTH} y2={t.y} stroke={t.label === 'N' ? '#e2e8f0' : '#000000'} strokeWidth="2" strokeDasharray={t.label === 'N' ? '5,5' : 'none'} className="print:stroke-black" />
             <g transform={`translate(${t.x}, ${t.y})`}>
                <rect x="-6" y="-12" width="12" height="24" rx="2" fill={`url(#ceramic-${sid})`} stroke="#451a03" />
                <text y="-20" textAnchor="middle" className="text-sm font-bold fill-white font-mono print:fill-black">{t.label}</text>
                <circle 
                  r="12" 
                  className={clsx(
                    "transition-all opacity-80",
                    !readonly && "cursor-pointer",
                    activeTerminal === t.id ? "fill-yellow-400/50 stroke-2 stroke-yellow-400" : "fill-transparent hover:fill-yellow-400/30"
                  )}
                  onClick={(e) => { e.stopPropagation(); handleTerminalClick(t.id); }}
                />
                <circle r="3" fill="#000" />
             </g>
          </g>
        ))}

        {layout.busTerminals.filter(t => t.type === 'secondary_bus').map(t => (
          <g key={t.id}>
             <line x1="0" y1={t.y} x2={CANVAS_WIDTH} y2={t.y} stroke={t.label === 'n' ? '#94a3b8' : '#d97706'} strokeWidth="3" className="opacity-60 print:stroke-black" />
             <g transform={`translate(${t.x}, ${t.y})`}>
                <g transform="rotate(90)">
                   <rect x="-10" y="-12" width="20" height="24" rx="4" fill={`url(#spool-${sid})`} stroke="#6b7280" strokeWidth="1" />
                   <line x1="-10" y1="-4" x2="10" y2="-4" stroke="#9ca3af" />
                   <line x1="-10" y1="4" x2="10" y2="4" stroke="#9ca3af" />
                </g>
                <text y="30" textAnchor="middle" className="text-lg font-bold fill-white font-mono print:fill-black">{t.label}</text>
                <circle 
                  r="14" 
                  className={clsx(
                    "transition-all",
                    !readonly && "cursor-pointer",
                    activeTerminal === t.id ? "fill-yellow-400/50 stroke-2 stroke-yellow-400" : "fill-transparent hover:fill-yellow-400/30"
                  )}
                  onClick={(e) => { e.stopPropagation(); handleTerminalClick(t.id); }}
                />
                <line x1="-15" y1="0" x2="15" y2="0" stroke={t.label === 'n' ? '#fff' : '#000'} strokeWidth="2" className="print:stroke-white" />
             </g>
          </g>
        ))}

        {/* --- Transformers --- */}
        {layout.transformers.map((tx, idx) => (
          <g key={tx.id}>
            <g filter="drop-shadow(3px 5px 8px rgba(0,0,0,0.5))">
                <rect x={tx.x - 65} y={tx.y} width="130" height="180" rx="4" fill={`url(#tank-${sid})`} stroke="#334155" strokeWidth="2" />
                <ellipse cx={tx.x} cy={tx.y} rx="65" ry="10" fill="#94a3b8" stroke="#334155" />
                <g transform={`translate(${tx.x}, ${tx.y + 70})`} opacity="0.4">
                     <path d="M -20 -30 Q -10 -30 -10 -20 Q -10 -10 -20 -10" fill="none" stroke="black" strokeWidth="2" />
                     <path d="M -20 -10 Q -10 -10 -10 0 Q -10 10 -20 10" fill="none" stroke="black" strokeWidth="2" />
                     <path d="M -20 10 Q -10 10 -10 20 Q -10 30 -20 30" fill="none" stroke="black" strokeWidth="2" />
                     <path d="M 20 -30 Q 10 -30 10 -20 Q 10 -10 20 -10" fill="none" stroke="black" strokeWidth="2" transform="scale(-1, 1)" />
                     <path d="M 20 -10 Q 10 -10 10 0 Q 10 10 20 10" fill="none" stroke="black" strokeWidth="2" transform="scale(-1, 1)" />
                     <path d="M 20 10 Q 10 10 10 20 Q 10 30 20 30" fill="none" stroke="black" strokeWidth="2" transform="scale(-1, 1)" />
                     <line x1="0" y1="-35" x2="0" y2="35" stroke="black" strokeWidth="2" strokeDasharray="4,2" />
                </g>
                <rect x={tx.x - 30} y={tx.y + 120} width="60" height="30" fill="#1e293b" className="print:fill-black" />
                <text x={tx.x} y={tx.y + 138} textAnchor="middle" className="fill-yellow-500 font-mono text-[10px] font-bold">
                    {scenario.transformerHints ? scenario.transformerHints[idx] : '25kVA'}
                </text>
            </g>

            {tx.terminals.map(t => {
              const isPri = t.type === 'primary_bushing';
              return (
                <g key={t.id} transform={`translate(${t.x}, ${t.y})`}>
                  {isPri ? (
                    <g transform="translate(0, 0)">
                        <rect x="-8" y="-25" width="16" height="30" rx="2" fill={`url(#ceramic-${sid})`} stroke="#451a03" />
                        <line x1="-8" y1="-18" x2="8" y2="-18" stroke="#451a03" strokeWidth="1" />
                        <line x1="-8" y1="-10" x2="8" y2="-10" stroke="#451a03" strokeWidth="1" />
                        <line x1="-8" y1="-2" x2="8" y2="-2" stroke="#451a03" strokeWidth="1" />
                    </g>
                  ) : (
                    <g transform="translate(0, -10)">
                         <rect x="-10" y="-10" width="20" height="20" rx="4" fill={`url(#ceramic-${sid})`} stroke="#451a03" />
                         <circle cx="0" cy="0" r="5" fill="#1e293b" />
                    </g>
                  )}
                  <circle 
                    r={isPri ? 8 : 10} 
                    cy={isPri ? -25 : -10}
                    className={clsx(
                      "transition-all",
                      !readonly && "cursor-pointer",
                      activeTerminal === t.id ? "fill-yellow-400 stroke-4 stroke-white" : "fill-transparent hover:fill-yellow-400/50 hover:stroke-yellow-400 hover:stroke-2"
                    )}
                    onClick={(e) => { e.stopPropagation(); handleTerminalClick(t.id); }}
                  />
                  <text y={isPri ? 20 : 25} textAnchor="middle" className="text-[10px] font-bold fill-slate-800 pointer-events-none drop-shadow-sm bg-white/50 px-1 rounded print:fill-black print:bg-white">{t.label}</text>
                </g>
              );
            })}
          </g>
        ))}

        {/* --- Connections with Colors --- */}
        {connections.map((c, idx) => {
          const start = getTerminalPos(c.from);
          const end = getTerminalPos(c.to);
          if (!start || !end) return null;

          const sy = start.type === 'primary_bushing' ? start.y - 25 : (start.type === 'secondary_bushing' ? start.y - 10 : start.y);
          const ey = end.type === 'primary_bushing' ? end.y - 25 : (end.type === 'secondary_bushing' ? end.y - 10 : end.y);
          const midX = (start.x + end.x) / 2;
          const dist = Math.abs(start.x - end.x);
          const sag = Math.min(100, dist * 0.5); 
          const midY = (sy + ey) / 2 + sag;
          const isVertical = Math.abs(start.x - end.x) < 20;
          const curvePath = isVertical 
            ? `M ${start.x} ${sy} Q ${start.x - 30} ${(sy+ey)/2} ${end.x} ${ey}`
            : `M ${start.x} ${sy} Q ${midX} ${Math.max(sy, ey) + 40} ${end.x} ${ey}`;
          
          const wireColor = getWireColor(c, idx);

          return (
            <g key={c.id} className="group">
              {/* Shadow for depth */}
              <path d={curvePath} stroke="black" strokeWidth="5" fill="none" opacity="0.3" transform="translate(2,4)" />
              {/* Invisible Hitbox */}
              <path
                d={curvePath}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
                className={!readonly ? "cursor-pointer" : ""}
                onDoubleClick={(e) => { e.stopPropagation(); removeConnection(c.id); }}
              />
              {/* Actual Colored Wire */}
              <path
                d={curvePath}
                stroke={wireColor}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none drop-shadow-md transition-all print:stroke-width-2"
              />
            </g>
          );
        })}

        {activeTerminal && mousePos && !readonly && (() => {
          const start = getTerminalPos(activeTerminal);
          if(!start) return null;
          const sy = start.type === 'primary_bushing' ? start.y - 25 : (start.type === 'secondary_bushing' ? start.y - 10 : start.y);
          return (
            <path
              d={`M ${start.x} ${sy} L ${mousePos.x} ${mousePos.y}`}
              stroke="#fbbf24"
              strokeWidth="3"
              strokeDasharray="5,5"
              fill="none"
              className="pointer-events-none opacity-80"
            />
          );
        })()}

      </svg>
    </div>
  );
};