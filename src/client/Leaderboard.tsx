// src/client/Leaderboard.tsx
import { DefenderStat } from '../shared/types/api';

interface LeaderboardProps {
  currentUser: string;
  defenders: DefenderStat[];
}

export const Leaderboard = ({
  currentUser,
  defenders,
}: LeaderboardProps) => {
  return (
    <div className="ui-card text-white font-mono text-sm w-full max-w-[600px] mx-auto">
      <ol className="text-xs leading-snug w-full space-y-1">
        {defenders.map((d, idx) => {
          const me = d.user === currentUser || d.user === 'you';
          return (
            <li
              key={d.user + idx}
              className="flex flex-row justify-between text-white"
            >
              <span className="flex flex-row gap-2">
                <span className={me ? 'text-yellow-400 font-bold' : 'text-gray-200'}>
                  {idx + 1}.
                </span>
                <span className={me ? 'text-yellow-400 font-bold' : 'text-gray-200'}>
                  {me ? 'You' : d.user}
                </span>
              </span>
              <span className={me ? 'text-yellow-400 font-bold' : 'text-gray-300'}>
                {d.placed}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
