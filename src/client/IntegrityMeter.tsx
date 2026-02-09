import React from 'react';

interface IntegrityMeterProps {
  integrityPct: number;
}

export const IntegrityMeter = ({ integrityPct }: IntegrityMeterProps) => {
  // clamp for safety
  const pct = Math.max(0, Math.min(100, integrityPct));

  // choose bar color based on danger level
  let barColor = 'bg-green-500';
  if (pct < 60) barColor = 'bg-yellow-400';
  if (pct < 30) barColor = 'bg-red-600';

  return (
    <div className="flex flex-col text-white font-mono text-xs sm:text-sm min-w-[8rem]">
      <div className="flex justify-between gap-2 mb-1">
        <span>Integrity</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="w-32 h-2 bg-gray-700 border border-gray-500 rounded overflow-hidden">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[0.7rem] leading-none text-gray-300 mt-1 text-right">
        Hold the line
      </div>
    </div>
  );
};
