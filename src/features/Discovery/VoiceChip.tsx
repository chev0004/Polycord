'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MdPlayArrow, MdStop } from 'react-icons/md';

const VOICE_BARS = [45, 30, 70, 95, 30, 70, 45, 95, 70, 45, 30, 95, 45, 30].map(
  (height, index) => ({
    id: `voice-bar-${index}`,
    height,
    delay: (index % 5) * 0.12,
  }),
);

type VoiceChipProps = {
  seconds: number;
  src?: string;
  className?: string;
};

const formatRemaining = (value: number) =>
  `0:${String(Math.max(0, Math.ceil(value))).padStart(2, '0')}`;

export const VoiceChip = ({ seconds, src, className }: VoiceChipProps) => {
  const t = useTranslations('Discovery');
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(seconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (src) return;

    if (!playing) {
      setRemaining(seconds);
      return;
    }

    const interval = setInterval(() => {
      setRemaining((value) => {
        if (value <= 0.1) {
          setPlaying(false);
          return seconds;
        }
        return value - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [playing, seconds, src]);

  const togglePlayback = () => {
    if (!src) {
      setPlaying((value) => !value);
      return;
    }

    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      setRemaining(seconds);
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setRemaining(Math.max(0, seconds - audio.currentTime));
    };
    audio.onended = () => {
      setPlaying(false);
      setRemaining(seconds);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlaying(false);
      setRemaining(seconds);
      audioRef.current = null;
    };

    void audio.play().then(
      () => setPlaying(true),
      () => {
        audioRef.current = null;
      },
    );
  };

  return (
    <button
      type="button"
      onClick={togglePlayback}
      aria-label={playing ? t('voiceIntroStop') : t('voiceIntroPlay')}
      className={`inline-flex h-8 shrink-0 items-center gap-[9px] self-start rounded-full bg-background-darker py-0 pr-3 pl-[9px] transition-colors hover:bg-background-main hover:text-foreground ${playing ? 'text-primary-light' : 'text-soft'} ${className ?? ''}`}
    >
      {playing ? (
        <MdStop
          size={16}
          className="text-[var(--ct-accent,var(--color-primary))]"
        />
      ) : (
        <MdPlayArrow
          size={16}
          className="text-[var(--ct-accent,var(--color-primary))]"
        />
      )}
      <span className="flex h-[14px] items-center gap-[2px]" aria-hidden>
        {VOICE_BARS.map((bar) => (
          <span
            key={bar.id}
            className={`w-[2.5px] rounded-full ${playing ? 'animate-voiceBar bg-[var(--ct-accent,var(--color-primary))]' : 'bg-[var(--ct-chip-dot,var(--color-primary-dark))]'}`}
            style={{
              height: `${bar.height}%`,
              animationDelay: playing ? `${bar.delay}s` : undefined,
            }}
          />
        ))}
      </span>
      <span
        className={`font-dm font-medium text-[11.5px] ${playing ? 'text-primary-light' : 'text-muted'}`}
      >
        {formatRemaining(remaining)}
      </span>
    </button>
  );
};
