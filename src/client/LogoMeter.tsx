interface LogoMeterProps {
  logoCompletionPct: number;
}

export const LogoMeter = ({ logoCompletionPct }: LogoMeterProps) => {
  const pctClamped = Math.max(0, Math.min(100, logoCompletionPct));

  return (
    <div className="flex flex-col items-end text-right text-white font-mono text-xs sm:text-sm">
      <div className="font-bold text-yellow-300 text-sm">
        Logo Intact {pctClamped.toFixed(0)}%
      </div>
      <div className="logo-meter w-24 h-2 bg-gray-700 rounded overflow-hidden border border-gray-500">
        <div
          className="logo-meter-fill h-full bg-yellow-400"
          style={{ width: `${pctClamped}%` }}
        />
      </div>
    </div>
  );
};
