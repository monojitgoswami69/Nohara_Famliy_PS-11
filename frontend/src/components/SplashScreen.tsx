import React, { useEffect, useState } from 'react';


interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_MESSAGES = [
  'INITIALIZING YJS CRDT ENGINE...',
  'CONNECTING WEBSOCKET SERVER...',
  'LOADING MONACO SYNTAX ENGINE...',
  'MOUNTING WORKSPACE...',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth progress bar
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    // Dynamic message ticker
    const messageTimer = setInterval(() => {
      setStepIndex(prev => (prev < BOOT_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 380);

    // Complete transition after 1.5s
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 450);
    }, 1500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#FFFDF5] text-black transition-transform duration-500 ease-in-out ${
        isExiting ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{
        backgroundImage: 'radial-gradient(#000000 1.2px, transparent 1.2px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Sleek Minimalist Window Box */}
      <div className="w-[90%] max-w-sm border-3 border-black bg-white shadow-neo-xl overflow-hidden transition-all duration-300 transform">
        
        {/* Minimal Window Header */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-neo-yellow border-b-2.5 border-black">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-black" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-black" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-black" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">codecollab.boot</span>
        </div>

        {/* Card Content */}
        <div className="p-6 text-center space-y-5">
          
          {/* Minimal Floating Logo */}
          <div className="relative inline-block mx-auto">
            <div className="w-16 h-16 border-2.5 border-black bg-neo-purple flex items-center justify-center shadow-neo mx-auto">
              <img src="/CodeCollab-logo.png" alt="CodeCollab" className="w-10 h-10 object-contain" />
            </div>
            <span className="absolute -bottom-1.5 -right-2 neo-badge bg-neo-green text-black px-1.5 py-0.2 text-[8px]">
              v3.0
            </span>
          </div>

          {/* Minimalist Title */}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight quantico-font drop-shadow-[2px_2px_0px_#FFDC58]">
              CODECOLLAB
            </h1>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              REAL-TIME WORKSPACE
            </p>
          </div>

          {/* Clean Progress Bar & Ticker */}
          <div className="space-y-2 pt-1 text-left">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className="text-slate-800 tracking-wide font-mono truncate max-w-[200px]">
                {BOOT_MESSAGES[stepIndex]}
              </span>
              <span className="font-mono text-black">{progress}%</span>
            </div>

            <div className="w-full h-2.5 border-2 border-black bg-slate-100 p-0.5 shadow-neo-sm overflow-hidden">
              <div
                className="h-full bg-neo-purple border-r border-black transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </div>

        {/* Bottom Footer Ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-t-2 border-black flex items-center justify-between text-[10px] font-bold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neo-green animate-pulse border border-black" />
            <span>CRDT SYNC READY</span>
          </div>
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(onComplete, 250);
            }}
            className="font-black text-black hover:underline uppercase tracking-wider text-[9px]"
          >
            SKIP [ESC]
          </button>
        </div>

      </div>
    </div>
  );
};
