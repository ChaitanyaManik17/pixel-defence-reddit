import React, { useState, useRef, useCallback } from 'react';

interface TargetAdminPanelProps {
  isModerator: boolean;
  onAfterUpdate: () => void;
  logoCompletionPct?: number;
}

type PreviewInfo = {
  count: number;
  error: string | null;
};

const COORD_RE = /^\d+:\d+$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function analyzeBlueprintText(rawText: string): PreviewInfo {
  if (!rawText.trim()) {
    return { count: 0, error: null };
  }

  try {
    const obj = JSON.parse(rawText);
    if (
      obj === null ||
      Array.isArray(obj) ||
      typeof obj !== 'object'
    ) {
      return {
        count: 0,
        error: 'JSON must be an object of "x:y" -> "#RRGGBB".',
      };
    }

    let validCount = 0;
    for (const [coord, color] of Object.entries(obj)) {
      if (
        COORD_RE.test(coord) &&
        typeof color === 'string' &&
        COLOR_RE.test(color)
      ) {
        validCount++;
      }
    }

    return {
      count: validCount,
      error: null,
    };
  } catch (err) {
    return {
      count: 0,
      error: 'Invalid JSON (could not parse)',
    };
  }
}

export const TargetAdminPanel: React.FC<TargetAdminPanelProps> = ({
  isModerator,
  onAfterUpdate,
  logoCompletionPct,
}) => {
  if (!isModerator) return null;

  const [blueprintText, setBlueprintText] = useState<string>('');

  const [previewCount, setPreviewCount] = useState<number>(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMsg, setSubmitMsg] = useState<string>('');
  const [submitKind, setSubmitKind] = useState<'ok' | 'err' | ''>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setBlueprintText(text);

    const analysis = analyzeBlueprintText(text);
    setPreviewCount(analysis.count);
    setPreviewError(analysis.error);
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result ?? '').toString();
      setBlueprintText(text);

      const analysis = analyzeBlueprintText(text);
      setPreviewCount(analysis.count);
      setPreviewError(analysis.error);
    };
    reader.readAsText(file);
  };

  const handleApplyClick = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitMsg('');
    setSubmitKind('');

    let parsed: unknown;
    try {
      parsed = JSON.parse(blueprintText);
    } catch (err) {
      setSubmitKind('err');
      setSubmitMsg('❌ Invalid JSON. Could not parse.');
      setIsSubmitting(false);
      return;
    }

    if (
      parsed === null ||
      Array.isArray(parsed) ||
      typeof parsed !== 'object'
    ) {
      setSubmitKind('err');
      setSubmitMsg(
        '❌ Expected an object: { "12:8": "#FF4500", "13:8": "#000000", ... }'
      );
      setIsSubmitting(false);
      return;
    }

    const out: Record<string, string> = {};
    let goodPixels = 0;
    for (const [coord, color] of Object.entries(parsed as Record<string, any>)) {
      if (
        COORD_RE.test(coord) &&
        typeof color === 'string' &&
        COLOR_RE.test(color)
      ) {
        out[coord] = color;
        goodPixels++;
      }
    }

    if (goodPixels === 0) {
      setSubmitKind('err');
      setSubmitMsg(
        '❌ No valid pixels found. Must be coords like "12:8": "#RRGGBB".'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/set-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: out }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const serverMsg =
          (errJson && errJson.message) ||
          `Server error (${res.status})`;
        setSubmitKind('err');
        setSubmitMsg(`❌ ${serverMsg}`);
        setIsSubmitting(false);
        return;
      }

      const result = await res.json();
      setSubmitKind('ok');
      setSubmitMsg(`✅ ${result.message ?? 'Target updated.'}`);

      onAfterUpdate();
    } catch (err) {
      console.error('Failed to POST /api/set-target:', err);
      setSubmitKind('err');
      setSubmitMsg('❌ Network error.');
    }

    setIsSubmitting(false);
  }, [blueprintText, onAfterUpdate]);

  const handleClear = () => {
    setBlueprintText('');
    setPreviewCount(0);
    setPreviewError(null);
    setSubmitKind('');
    setSubmitMsg('');
  };

  const roundedLogo =
    typeof logoCompletionPct === 'number'
      ? Math.round(logoCompletionPct)
      : null;

  return (
    <div className="mod-panel-card font-mono text-white text-xs">
      <div className="mod-panel-header">
        <div className="flex items-start gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-yellow-500 text-black font-extrabold text-[10px] shadow-[0_0_8px_rgba(255,215,0,0.8)]">
            MOD
          </div>
          <div className="flex flex-col leading-tight">
            <div className="text-yellow-300 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
              <span>Subreddit Target Blueprint</span>
              <span className="text-yellow-500/80 text-[9px] font-normal border border-yellow-500/40 rounded px-1 py-[1px] bg-yellow-500/10">
                /api/set-target
              </span>
            </div>

            <div className="text-[10px] text-gray-300 leading-snug">
              Upload or paste the official logo layout. Everyone sees red
              outlines where canvas doesn’t match this.
            </div>
          </div>
        </div>

        <div className="text-right leading-tight hidden sm:block">
          <div className="text-gray-400 text-[10px] uppercase tracking-wide">
            Logo Lock
          </div>
          <div className="text-yellow-300 font-extrabold text-sm">
            {roundedLogo !== null ? `${roundedLogo}%` : '--'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          className="w-full bg-black/40 border border-yellow-500/30 rounded p-2 text-[10px] text-yellow-100 font-mono leading-snug min-h-[100px] outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/60 resize-y"
          placeholder={`{
  "12:8": "#FF4500",
  "13:8": "#000000",
  "14:8": "#FFFFFF"
}`}
          value={blueprintText}
          onChange={handleChangeText}
          spellCheck={false}
        />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex flex-col gap-1 text-[10px] leading-snug">
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-2 py-[2px] rounded bg-gray-800/60 border border-gray-600 text-gray-200">
                <span className="text-gray-400">Valid pixels:</span>{' '}
                <span className="font-bold text-white">{previewCount}</span>
              </div>

              {roundedLogo !== null && (
                <div className="px-2 py-[2px] rounded bg-gray-800/60 border border-gray-600 text-gray-200">
                  <span className="text-gray-400">Current match:</span>{' '}
                  <span className="font-bold text-yellow-300">
                    {roundedLogo}%
                  </span>
                </div>
              )}

              {previewError && (
                <div className="px-2 py-[2px] rounded bg-red-600/20 border border-red-600 text-red-400 font-bold">
                  {previewError}
                </div>
              )}
            </div>

            <div className="text-[9px] text-gray-400">
              Expect raw mapping only. We will POST {"{ target: {...} }"} for you.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end text-[10px]">
            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-gray-100 font-bold hover:bg-gray-600 active:scale-[.98]"
              onClick={handleChooseFileClick}
              disabled={isSubmitting}
            >
              Upload JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelected}
            />

            <button
              type="button"
              className="px-2 py-1 rounded bg-gray-700 border border-gray-500 text-gray-100 font-bold hover:bg-gray-600 active:scale-[.98]"
              onClick={handleClear}
              disabled={isSubmitting || blueprintText.length === 0}
            >
              Clear
            </button>

            <button
              type="button"
              className={
                'px-2 py-1 rounded font-bold text-black bg-yellow-400 border border-yellow-300 shadow-[0_0_8px_rgba(255,215,0,0.6)] hover:bg-yellow-300 active:scale-[.98] ' +
                (isSubmitting ? 'opacity-50 pointer-events-none' : '')
              }
              onClick={handleApplyClick}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Applying…' : 'Apply Target'}
            </button>
          </div>
        </div>

        {submitMsg && (
          <div
            className={
              'text-[10px] font-bold leading-snug ' +
              (submitKind === 'ok'
                ? 'text-green-400'
                : submitKind === 'err'
                ? 'text-red-400'
                : 'text-gray-300')
            }
          >
            {submitMsg}
          </div>
        )}

        <div className="text-[9px] text-gray-500 leading-snug">
          This overwrites/merges target pixels in Redis. Players will
          immediately see updated “areas to defend”.
        </div>
      </div>
    </div>
  );
};
