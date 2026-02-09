import { useMemo } from 'react';

interface PresenceStripProps {
  users: string[];
  currentUser: string;
}

export const PresenceStrip: React.FC<PresenceStripProps> = ({
  users,
  currentUser,
}) => {
  // unique + prioritize currentUser
  const displayUsers = useMemo(() => {
    const uniq: string[] = [];
    for (const u of users) {
      if (!u) continue;
      if (!uniq.includes(u)) {
        uniq.push(u);
      }
    }

    uniq.sort((a, b) => {
      if (a === currentUser && b !== currentUser) return -1;
      if (b === currentUser && a !== currentUser) return 1;
      return a.localeCompare(b);
    });

    return uniq;
  }, [users, currentUser]);

  // show up to 8 chips inline; rest collapsed into +N
  const visible = displayUsers.slice(0, 8);
  const extra = displayUsers.length - visible.length;

  return (
    <div className="flex flex-col gap-1 font-mono text-[10px] leading-tight text-gray-300">
      <div className="uppercase tracking-wide text-[10px] text-gray-400">
        Active defenders
      </div>

      {/* horizontal scroll on tiny screens, wrap on desktop */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
        {visible.map((user) => {
          const label = user === currentUser ? 'You' : user;
          const initials = user.slice(0, 2).toUpperCase();
          const isYou = user === currentUser;

          return (
            <div
              key={user}
              className={
                'flex flex-none items-center gap-1 px-2 py-[2px] rounded-full border text-[10px] max-w-[120px] ' +
                (isYou
                  ? 'border-yellow-400 text-yellow-300 bg-yellow-500/10 shadow-[0_0_8px_rgba(255,215,0,0.6)]'
                  : 'border-gray-600 bg-gray-800/60 text-gray-200')
              }
            >
              <div
                className={
                  'w-5 h-5 flex-none rounded-full flex items-center justify-center text-[9px] font-bold ' +
                  (isYou
                    ? 'bg-yellow-400 text-black shadow-[0_0_6px_rgba(255,215,0,0.8)]'
                    : 'bg-gray-600 text-white shadow-[0_0_4px_rgba(255,255,255,0.4)]')
                }
              >
                {initials}
              </div>
              <div className="font-bold truncate">{label}</div>
            </div>
          );
        })}

        {extra > 0 && (
          <div className="flex-none px-2 py-[2px] rounded-full border border-gray-600 bg-gray-800/60 text-gray-200 text-[10px]">
            +{extra} more
          </div>
        )}
      </div>
    </div>
  );
};
