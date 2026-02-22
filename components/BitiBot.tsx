
import React from 'react';
import { BitiEmotion } from '../types';

interface BitiBotProps {
  emotion: BitiEmotion;
  isSpeaking: boolean;
}

const BitiBot: React.FC<BitiBotProps> = ({ emotion, isSpeaking }) => {
  const getEmotionStyles = () => {
    switch (emotion) {
      case BitiEmotion.EXCITED: return 'bg-yellow-400 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.6)]';
      case BitiEmotion.STUDIOUS: return 'bg-blue-500 border-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.6)]';
      case BitiEmotion.ENCOURAGING: return 'bg-teal-400 border-teal-200 shadow-[0_0_30px_rgba(45,212,191,0.6)]';
      case BitiEmotion.PROFESSIONAL: return 'bg-indigo-600 border-indigo-400 shadow-[0_0_30px_rgba(79,70,229,0.6)]';
      default: return 'bg-white';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`w-32 h-32 rounded-full border-4 animate-float transition-all duration-500 flex items-center justify-center relative overflow-hidden ${getEmotionStyles()}`}>
        {/* Abstract Eyes/Face */}
        <div className="flex space-x-6">
          <div className={`w-3 h-5 bg-white rounded-full ${isSpeaking ? 'animate-bounce' : ''}`} />
          <div className={`w-3 h-5 bg-white rounded-full ${isSpeaking ? 'animate-bounce' : ''}`} />
        </div>
        
        {/* Glow Ring */}
        <div className={`absolute inset-0 border-2 rounded-full opacity-50 ${isSpeaking ? 'animate-ping' : ''}`} />
        
        {/* Accessory for Studious */}
        {emotion === BitiEmotion.STUDIOUS && (
            <div className="absolute top-8 w-full h-1 bg-white opacity-40"></div>
        )}
      </div>
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-white/60">AI Saathi: Biti</span>
      </div>
    </div>
  );
};

export default BitiBot;
