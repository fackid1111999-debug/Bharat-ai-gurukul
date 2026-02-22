
import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { APP_COLORS } from '../constants';

interface RoadmapProps {
  currentStage: number;
  onSelectStage: (stage: number) => void;
}

const Roadmap: React.FC<RoadmapProps> = ({ currentStage, onSelectStage }) => {
  const stages = Array.from({ length: 202 }, (_, i) => i); // 0 to 201
  const mapRef = useRef<HTMLDivElement>(null);

  // Function to calculate position along the winding path
  const getPosition = (stage: number) => {
    const total = 201;
    const progress = stage / total;
    
    // Vertical progress (bottom to top)
    // God level (201) will be at ~6%, which is the location of the top Mahal
    const y = 94 - (progress * 88); 
    
    // Horizontal winding (zigzag)
    // The path in the image has a specific winding flow that narrows as it reaches the peak
    const turns = 8;
    const xBase = 50; 
    
    // Amplitude narrows towards the top to hit the center Mahal
    const amplitude = 36 * (1 - progress * 0.6); 
    
    // Phase adjustment: 
    // At progress 1 (God Level), we want x = 50.
    // sin(1 * PI * 8 + phase) = 0 => phase should be 0 or PI.
    // We'll use PI to start the winding from the left side at the bottom.
    const phase = Math.PI;
    const x = xBase + Math.sin(progress * Math.PI * turns + phase) * (stage === 201 ? 0 : amplitude);
    
    return { x, y };
  };

  const scrollToCurrent = () => {
    const { y } = getPosition(currentStage);
    const container = mapRef.current?.closest('main');
    if (container) {
      const scrollPos = (y / 100) * mapRef.current!.scrollHeight - container.clientHeight / 2;
      container.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  };

  return (
    <div ref={mapRef} className="relative w-full bg-[#1a140e] overflow-hidden rounded-3xl shadow-2xl border border-white/10">
      {/* The Map Image - Using an img tag to ensure it defines the container height and is fully visible */}
      <img 
        src="https://i.ibb.co/8q6H0tG/New-map.png" 
        alt="World Map" 
        className="w-full h-auto block relative z-0"
        referrerPolicy="no-referrer"
      />
      
      {/* Subtle overlay for better readability of text */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none z-10" />
      
      <div className="absolute inset-0 z-20 p-4">
        <div className="sticky top-6 z-50 flex flex-col items-center space-y-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl text-center"
          >
            <h2 className="text-2xl font-gurukul text-orange-400 tracking-[0.3em] uppercase font-black">
              Shat-Sopan
            </h2>
            <p className="text-[7px] text-orange-200/50 uppercase tracking-[0.4em] mt-1 font-bold">The Path of Mastery</p>
          </motion.div>

          {currentStage === 1 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={scrollToCurrent}
              className="bg-orange-600 text-white px-6 py-3 rounded-full font-black text-xs tracking-widest shadow-2xl shadow-orange-600/40 border-2 border-white animate-bounce"
            >
              BEGIN THE JOURNEY ➔
            </motion.button>
          )}
        </div>
        
        <div className="relative h-full w-full">
          {/* Path Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <path
              d={stages.map((s, i) => {
                const { x, y } = getPosition(s);
                return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              }).join(' ')}
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          </svg>

          {stages.map((stage) => {
            if (stage === 0) return null;
            const isCompleted = stage < currentStage;
            const isActive = stage === currentStage;
            const isGodLevel = stage === 201;
            const isBossLevel = stage % 20 === 0 && !isGodLevel;
            const isSpecialLevel = stage % 10 === 0 && !isBossLevel && !isGodLevel;
            const isChapterStart = (stage - 1) % 20 === 0 && stage <= 200;
            
            const { x, y } = getPosition(stage);

            return (
              <React.Fragment key={stage}>
                {isChapterStart && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-[300%] z-20"
                  >
                    <span className="text-[6px] font-black text-orange-400 uppercase tracking-[0.2em] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-orange-500/10 whitespace-nowrap">
                      Chapter {Math.floor((stage - 1) / 20) + 1}
                    </span>
                  </motion.div>
                )}
                
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-10px" }}
                  whileHover={stage <= currentStage ? { scale: 1.5, zIndex: 30 } : {}}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => stage <= currentStage && onSelectStage(stage)}
                  className={`
                    absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300
                    ${isGodLevel ? 'w-24 h-24' : isBossLevel ? 'w-6 h-6' : isSpecialLevel ? 'w-4 h-4' : 'w-2.5 h-2.5'}
                    rounded-full flex items-center justify-center
                    ${isGodLevel ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-2 border-white shadow-[0_0_50px_rgba(168,85,247,0.8)]' : ''}
                    ${isBossLevel ? 'bg-red-900 border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : ''}
                    ${isSpecialLevel ? 'bg-indigo-900 border border-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.2)]' : 'bg-slate-800/90 border border-white/5'}
                    ${isActive ? 'bg-orange-500 scale-150 ring-1 ring-white shadow-[0_0_15px_rgba(249,115,22,0.6)]' : ''}
                    ${isCompleted ? 'bg-teal-500 border-teal-200' : ''}
                    ${stage > currentStage ? 'grayscale opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex flex-col items-center justify-center">
                    {isGodLevel ? (
                      <div className="relative">
                        <motion.span 
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="text-5xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        >
                          🕉️
                        </motion.span>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[10px] font-black text-white tracking-[0.2em] drop-shadow-lg">SIDDHI</span>
                        </div>
                      </div>
                    ) : isBossLevel ? (
                      <span className="text-[8px]">👹</span>
                    ) : isSpecialLevel ? (
                      <span className="text-[5px]">⭐</span>
                    ) : (
                      <span className={`font-black ${isActive ? 'text-[5px]' : 'text-[3px]'} ${isCompleted || isActive ? 'text-white' : 'text-gray-500'}`}>{stage}</span>
                    )}
                  </div>
                  
                  {isActive && (
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute -top-8 bg-orange-600 text-white px-1.5 py-0.5 rounded-md text-[6px] whitespace-nowrap font-black shadow-xl border border-white z-50"
                    >
                      YOU
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-t-[3px] border-t-orange-600"></div>
                    </motion.div>
                  )}
                </motion.button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Roadmap;
