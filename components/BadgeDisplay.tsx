
import React from 'react';
import { BADGES } from '../constants';

interface BadgeDisplayProps {
  earnedBadgeIds: string[];
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ earnedBadgeIds }) => {
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id));

  if (earnedBadges.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl">
      <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Your Siddhis (Badges)</h3>
      <div className="flex flex-wrap gap-3">
        {earnedBadges.map(badge => (
          <div 
            key={badge.id} 
            className="group relative flex flex-col items-center p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-orange-500 transition-all cursor-help"
            title={badge.description}
          >
            <span className="text-2xl mb-1">{badge.icon}</span>
            <span className="text-[10px] font-bold text-gray-300 text-center">{badge.name}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block w-32 p-2 bg-black border border-gray-700 rounded text-[9px] text-center z-50">
              {badge.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeDisplay;
