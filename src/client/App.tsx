import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { connectRealtime } from '@devvit/web/client';

import { PixelGrid } from './PixelGrid';
import { ColorPalette } from './ColorPalette';
import { Tutorial } from './Tutorial';
import { Leaderboard } from './Leaderboard';
import { TargetAdminPanel } from './TargetAdminPanel';
import { SplashScreen } from './SplashScreen';
import { GameHUD } from './GameHUD';

import {
  InitResponse,
  CanvasState,
  TargetState,
  StatusResponse,
  DefenderStat,
  PaintUpdateMessage,
  DecayUpdateMessage,
  PresenceUpdateMessage,
} from '../shared/types/api';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

const TUTORIAL_KEY = 'pixelDefenseTutorialSeen';
const STARTED_KEY = 'pixelDefenseStarted';

const ATTRIBUTION_TEXT_HEIGHT = 40;

export const App = () => {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);

  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);
  const [targetState, setTargetState] = useState<TargetState>({});

  const [username, setUsername] = useState('...');
  const [integrityPct, setIntegrityPct] = useState<number>(100);
  const [logoCompletionPct, setLogoCompletionPct] = useState<number>(100);

  const [nextGlitchTime, setNextGlitchTime] = useState<number>(0);
  const [isWaveNext, setIsWaveNext] = useState(false);
  const [waveStartsAt, setWaveStartsAt] = useState<number | null>(null);
  const [waveIntensityPct, setWaveIntensityPct] = useState<number | null>(null);

  const [isShaking, setIsShaking] = useState(false);

  const [topDefenders, setTopDefenders] = useState<DefenderStat[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [yourPlaced, setYourPlaced] = useState<number | null>(null);

  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  const [isModerator, setIsModerator] = useState(false);
  const [showModToolsMobile, setShowModToolsMobile] = useState(false);

  const [showEntry, setShowEntry] = useState<boolean>(() => {
    return localStorage.getItem(STARTED_KEY) !== 'true';
  });
  const [showTutorial, setShowTutorial] = useState(false);

  const [pixelSize, setPixelSize] = useState(10);
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const observer = new ResizeObserver(() => {
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      );

      const mainPadding = 0.5 * rootFontSize;
      const totalHorizontalPadding = 2 * mainPadding;
      const totalVerticalPadding = 2 * mainPadding;

      const attrMarginTop = 0.5 * rootFontSize;
      const attrFontSize = 1 * rootFontSize;
      const attrHeight = 2 * attrFontSize;
      const dynamicAttributionTextHeight = attrMarginTop + attrHeight;

      const { width, height } = mainEl.getBoundingClientRect();

      const availableWidth = width;
      const availableHeight =
        height - dynamicAttributionTextHeight;

      const sizeFromWidth = Math.floor(availableWidth / CANVAS_WIDTH);
      const sizeFromHeight = Math.floor(availableHeight / CANVAS_HEIGHT);

      const newSize = Math.min(sizeFromWidth, sizeFromHeight);

      setPixelSize(Math.max(1, newSize));
    });

    observer.observe(mainEl);
    return () => observer.disconnect();
  }, [!!canvasState]);


  const init = useCallback(async () => {
    try {
      const res = await fetch('/api/init');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: InitResponse = await res.json();
      if (data.type !== 'init') throw new Error('Unexpected response');

      setUsername(data.username);
      setCanvasState(data.canvasState);
      setTargetState(data.targetState || {});
      setCooldownEndsAt(data.cooldownEndsAt);
      setNextGlitchTime(data.nextGlitchTime);

      setLogoCompletionPct(data.logoCompletionPct);
      setIsModerator(data.isModerator);
    } catch (err) {
      console.error('Failed to init', err);
    }
  }, []);

  useEffect(() => {
    let interval: number | null = null;

    const pollStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) {
          console.warn('status poll error', res.status);
          return;
        }
        const data: StatusResponse = await res.json();

        setIntegrityPct(data.integrityPct);
        setLogoCompletionPct(data.logoCompletionPct);

        setNextGlitchTime(data.nextGlitchTime);
        setTopDefenders(data.topDefenders ?? []);

        setIsWaveNext(data.isWaveNext);
        setWaveStartsAt(data.waveStartsAt ?? null);
        setWaveIntensityPct(data.waveIntensityPct ?? null);

        setIsModerator(data.isModerator);

        setYourRank(data.yourRank ?? null);
        setYourPlaced(data.yourPlaced ?? null);
        
        setActiveUsers((data as any).activeUsers ?? []);
      } catch (err) {
        console.error('Failed to poll status', err);
      }
    };

    void pollStatus();
    interval = window.setInterval(pollStatus, 5000);

    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!username || !canvasState) return;

    let connection: Awaited<ReturnType<typeof connectRealtime>> | null = null;
    const connect = async () => {
      connection = await connectRealtime({
        channel: 'canvas-updates',
        onMessage: (message: unknown) => {
          const data = message as any;

          if (data && data.type === 'presenceUpdate') {
            if (Array.isArray(data.users)) {
              setActiveUsers(data.users);
            }
          }
          else if (data && data.type === 'paint') {
            const paintData = data as PaintUpdateMessage;
            setCanvasState((prev) => {
              if (!prev) return prev;
              const coord = `${paintData.x}:${paintData.y}`;
              return { ...prev, [coord]: paintData.data };
            });
          }
          else if (data && data.type === 'decay') {
            const decayData = data as DecayUpdateMessage;
            setCanvasState((prev) => {
              if (!prev) return null;
              const newCanvasState = { ...prev };
              for (const { coord, data: pixelData } of decayData.pixels) {
                newCanvasState[coord] = pixelData;
              }
              return newCanvasState;
            });
            setIsShaking(true);
          }
        },
        onConnect: () => {
          console.log('Realtime connected!');
        },
        onDisconnect: () => {
          console.log('Realtime disconnected.');
        },
      });
    };
    void connect();
    return () => {
      void connection?.disconnect();
    };
  }, [username]);

  useEffect(() => {
    if (isShaking) {
      const timer = window.setTimeout(() => setIsShaking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const handleStart = () => {
    setShowEntry(false);
    localStorage.setItem(STARTED_KEY, 'true');

    const hasSeenTutorial = localStorage.getItem(TUTORIAL_KEY);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  if (!canvasState) {
    return (
      <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 p-4">
        <h1 className="text-4xl font-bold text-center font-mono text-white">
          Loading Canvas...
        </h1>
      </div>
    );
  }

  return (
    <div className="app-container">
      {showEntry && (
        <SplashScreen
          onStart={handleStart}
          integrityPct={integrityPct}
          logoCompletionPct={logoCompletionPct}
          nextGlitchTime={nextGlitchTime}
          isWaveNext={isWaveNext}
          waveStartsAt={waveStartsAt}
          topDefenders={topDefenders}
        />
      )}

      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}

      <GameHUD
        username={username}
        integrityPct={integrityPct}
        logoCompletionPct={logoCompletionPct}
        nextGlitchTime={nextGlitchTime}
        isWaveNext={isWaveNext}
        waveStartsAt={waveStartsAt}
        waveIntensityPct={waveIntensityPct}
        yourRank={yourRank}
        yourPlaced={yourPlaced}
        activeUsers={activeUsers}
      />

     <main className="app-main flex justify-center" ref={mainRef}>
        <PixelGrid
          canvasState={canvasState}
          targetState={targetState}
          selectedColor={selectedColor}
          username={username}
          cooldownEndsAt={cooldownEndsAt}
          onPaintSuccess={setCooldownEndsAt}
          isWaveNext={isWaveNext}
          pixelSize={pixelSize}
          isShaking={isShaking}
        />
      </main>

      <footer className="app-footer flex flex-col gap-2">
        <Leaderboard currentUser={username} defenders={topDefenders} />

        {isModerator && (
          <>
            <button
              className="sm:hidden text-xs font-mono font-bold text-yellow-300 bg-gray-700 border border-yellow-400/50 rounded-md px-3 py-2 flex items-center justify-between"
              onClick={() => setShowModToolsMobile((p) => !p)}
            >
              <span>Mod Tools</span>
              <span className="text-yellow-400">
                {showModToolsMobile ? '▲' : '▼'}
              </span>
            </button>

            <div className="hidden sm:block">
              <TargetAdminPanel
                isModerator={isModerator}
                onAfterUpdate={init}
                logoCompletionPct={logoCompletionPct}
              />
            </div>

            {showModToolsMobile && (
              <div className="sm:hidden">
                <TargetAdminPanel
                  isModerator={isModerator}
                  onAfterUpdate={init}
                  logoCompletionPct={logoCompletionPct}
                />
              </div>
            )}
          </>
        )}

        <ColorPalette
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          cooldownEndsAt={cooldownEndsAt}
          onCooldownEnd={() => setCooldownEndsAt(0)}
        />
      </footer>
    </div>
  );
};
