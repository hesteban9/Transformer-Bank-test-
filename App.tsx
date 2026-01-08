import React, { useState } from 'react';
import { WireCanvas } from './components/WireCanvas';
import { StudyGuide } from './components/StudyGuide';
import { SCENARIOS } from './constants';
import { Connection, ExamState, QuestionResult } from './types';
import { validateConnections } from './utils/circuitValidation';
import { Zap, CheckCircle, XCircle, ArrowRight, BookOpen, RotateCcw, Activity, FileText, Lock, Home, LogOut, AlertTriangle } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<ExamState>(ExamState.MENU);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentConnections, setCurrentConnections] = useState<Connection[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  
  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Exit Modal State
  const [showExitModal, setShowExitModal] = useState(false);

  const startExam = () => {
    setResults([]);
    setCurrentScenarioIndex(0);
    setCurrentConnections([]);
    setGameState(ExamState.TESTING);
  };

  const handleExitRequest = () => {
     setShowExitModal(true);
  };

  const confirmExit = () => {
     setShowExitModal(false);
     setGameState(ExamState.MENU);
  };

  const handleOpenStudyGuideClick = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError(false);
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'local 84') {
        setShowPasswordModal(false);
        setGameState(ExamState.STUDY_GUIDE);
    } else {
        setPasswordError(true);
    }
  };

  const submitCurrentQuestion = () => {
    const scenario = SCENARIOS[currentScenarioIndex];
    // Pass validConfigurations (all permutations) to the validator
    const validation = validateConnections(currentConnections, scenario.validConfigurations);
    
    const result: QuestionResult = {
      scenarioId: scenario.id,
      passed: validation.passed,
      score: validation.score 
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (currentScenarioIndex < SCENARIOS.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      setCurrentConnections([]);
    } else {
      setGameState(ExamState.RESULTS);
    }
  };

  const calculateFinalScore = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((acc, r) => acc + r.score, 0);
    return Math.round(total / results.length);
  };

  // --- Views ---

  if (gameState === ExamState.STUDY_GUIDE) {
    return <StudyGuide onBack={() => setGameState(ExamState.MENU)} />;
  }

  if (gameState === ExamState.MENU) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative">
        
        {/* Password Modal Overlay */}
        {showPasswordModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3 mb-4 text-white">
                        <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <Lock className="w-5 h-5 text-yellow-500"/>
                        </div>
                        <div>
                             <h3 className="font-bold text-lg leading-tight">Restricted Access</h3>
                             <p className="text-xs text-slate-400">Authorization Required</p>
                        </div>
                    </div>
                    
                    <p className="text-slate-300 text-sm mb-4">Enter the access code to view the Reference Manual.</p>
                    
                    <form onSubmit={verifyPassword}>
                        <div className="mb-4">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                                className={`w-full bg-slate-900 border ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'} rounded-lg p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all font-mono tracking-widest`}
                                placeholder="Enter Code"
                                autoFocus
                            />
                            {passwordError && (
                                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <XCircle size={12} /> Access Denied: Incorrect Code
                                </p>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                             <button
                                type="button"
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold transition-colors"
                             >
                                CANCEL
                             </button>
                             <button
                                type="submit"
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/30 transition-colors"
                             >
                                UNLOCK
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <div className="max-w-2xl w-full bg-[#1e293b] rounded-xl border border-slate-700 shadow-2xl overflow-hidden relative z-10">
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-10 text-center border-b border-slate-700">
            <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-blue-500/50">
              <Zap className="text-blue-400 w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Transformer Test</h1>
            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Lineman Qualification Simulator</p>
          </div>
          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold text-white">Assessment Protocol</h2>
               <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-mono rounded border border-yellow-500/20">VER 2.1</span>
            </div>
            
            <ul className="space-y-4 mb-10 text-slate-300">
              <li className="flex items-start gap-4">
                <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span>Simulate connections for <strong>{SCENARIOS.length}</strong> standard banks.</span>
              </li>
              <li className="flex items-start gap-4">
                <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span>Observe tank labels (Lighting/Power) for correct phasing.</span>
              </li>
              <li className="flex items-start gap-4">
                <Activity className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span>Passing grade threshold is <strong>70%</strong>.</span>
              </li>
            </ul>
            
            <div className="space-y-4">
              <button 
                onClick={startExam}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-blue-900/50"
              >
                INITIALIZE LAB <ArrowRight />
              </button>

              <button 
                onClick={handleOpenStudyGuideClick}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-3 border border-slate-600 group"
              >
                <FileText size={18} className="group-hover:text-white transition-colors"/> 
                OPEN REFERENCE MANUAL 
                <Lock size={14} className="text-slate-500 group-hover:text-yellow-500 transition-colors ml-1"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === ExamState.RESULTS) {
    const finalScore = calculateFinalScore();
    const passed = finalScore >= 70;

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-[#1e293b] rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className={`p-10 text-center ${passed ? 'bg-green-900/30 border-b border-green-800' : 'bg-red-900/30 border-b border-red-800'}`}>
            <h1 className={`text-5xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'QUALIFIED' : 'UNQUALIFIED'}
            </h1>
            <p className="text-slate-300 text-xl font-mono mt-4">SCORE: {finalScore}%</p>
          </div>
          
          <div className="p-8">
            <h3 className="text-sm font-mono uppercase text-slate-500 mb-6 tracking-wider">Performance Log</h3>
            <div className="grid gap-3 mb-8">
              {SCENARIOS.map((scenario, idx) => {
                const result = results.find(r => r.scenarioId === scenario.id);
                return (
                  <div key={scenario.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-500 text-sm">#{String(idx + 1).padStart(2, '0')}</span>
                      <div>
                        <h4 className="font-bold text-slate-200">{scenario.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`font-mono font-bold ${result?.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {result?.score.toFixed(0)}%
                       </span>
                       {result?.passed ? <CheckCircle size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-500" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4">
               <button 
                onClick={() => setGameState(ExamState.MENU)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-600"
              >
                <Home size={18} /> MAIN MENU
              </button>
               <button 
                onClick={startExam}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                <RotateCcw size={18} /> RESTART
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- TESTING STATE ---
  const currentScenario = SCENARIOS[currentScenarioIndex];

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col overflow-hidden relative">
      
      {/* Exit Modal Overlay */}
      {showExitModal && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-white">
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <AlertTriangle className="w-5 h-5 text-orange-500"/>
                    </div>
                    <div>
                            <h3 className="font-bold text-lg leading-tight">Abort Lab?</h3>
                            <p className="text-xs text-slate-400">Confirm Action</p>
                    </div>
                </div>
                
                <p className="text-slate-300 text-sm mb-6">
                    Are you sure you want to return to the main menu? <br/>
                    <span className="text-orange-400">Current progress will be lost.</span>
                </p>
                
                <div className="flex gap-3">
                        <button
                        type="button"
                        onClick={() => setShowExitModal(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold transition-colors"
                        >
                        RESUME
                        </button>
                        <button
                        type="button"
                        onClick={confirmExit}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-900/30 transition-colors"
                        >
                        EXIT EXAM
                        </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1e293b] border-b border-slate-700 px-6 py-3 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
             <BookOpen className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-200 tracking-tight">Transformer Test</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase">Scenario {currentScenarioIndex + 1} / {SCENARIOS.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block">
             <span className="block text-[10px] text-slate-500 uppercase tracking-widest">Target</span>
             <span className="text-sm font-mono font-bold text-green-400">70% PASS</span>
          </div>
          <button 
            onClick={handleExitRequest}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2 rounded-full transition-all"
            title="Exit to Main Menu"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {/* Canvas takes full remaining height */}
        <div className="flex-1 relative bg-[#0f172a]">
            <WireCanvas 
                scenario={currentScenario}
                connections={currentConnections}
                setConnections={setCurrentConnections}
                onSubmit={submitCurrentQuestion}
                isLastScenario={currentScenarioIndex === SCENARIOS.length - 1}
            />
        </div>
        
        {/* Helper overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <div className="bg-slate-900/80 backdrop-blur text-slate-300 px-4 py-2 rounded-full border border-slate-700 text-xs shadow-xl">
               Double-click a wire to remove it. Observe tank labels for phasing.
            </div>
        </div>
      </main>
    </div>
  );
}