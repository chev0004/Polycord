'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MdPlayArrow, MdStop } from 'react-icons/md';
import {
  ensureClip,
  peekClip,
  pendingClip,
  prefetchClip,
  preloadClip,
} from './voiceClips';

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
  clipId?: string;
  fetchMode?: 'visible' | 'mount';
  className?: string;
};

let activeAudio: HTMLAudioElement | null = null;

const formatRemaining = (value: number) =>
  `0:${String(Math.max(0, Math.ceil(value))).padStart(2, '0')}`;

export const VoiceChip = ({
  seconds,
  src,
  clipId,
  fetchMode = 'visible',
  className,
}: VoiceChipProps) => {
  const t = useTranslations('Discovery');
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(seconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pressRef = useRef(0);
  const remote = Boolean(src || clipId);

  useEffect(() => {
    if (!remote) return;

    setRemaining(seconds);

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [remote, seconds]);

  useEffect(() => {
    if (!clipId) return;

    if (fetchMode === 'mount') {
      preloadClip(clipId);
      return;
    }

    const button = buttonRef.current;
    if (!button || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void prefetchClip(clipId);
      },
      { rootMargin: '200px' },
    );
    observer.observe(button);

    return () => observer.disconnect();
  }, [clipId, fetchMode]);

  useEffect(() => {
    if (remote) return;

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
  }, [playing, seconds, remote]);

  const reset = () => {
    setPlaying(false);
    setRemaining(seconds);
  };

  const start = (audio: HTMLAudioElement, url: string) => {
    if (audio.getAttribute('src') !== url) audio.src = url;
    void audio.play().catch(() => audio.paused && reset());
  };

  const togglePlayback = () => {
    if (!remote) {
      setPlaying((value) => !value);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio();
      const sync = () => (audio.paused ? reset() : setPlaying(true));
      audio.onplay = sync;
      audio.onpause = sync;
      audio.onerror = () => {
        audio.pause();
        audioRef.current = null;
        reset();
      };
      audio.ontimeupdate = () =>
        setRemaining(Math.max(0, seconds - audio.currentTime));
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    const press = ++pressRef.current;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      reset();
      return;
    }

    if (activeAudio !== audio) activeAudio?.pause();
    activeAudio = audio;
    setPlaying(true);

    const ready = src ?? (clipId ? peekClip(clipId) : undefined);
    if (ready) return start(audio, ready);

    const endpoint = `/api/voice/${clipId}`;
    const loading = clipId ? pendingClip(clipId) : undefined;
    if (!loading) return start(audio, endpoint);
    void loading.then((url) => {
      if (pressRef.current === press) start(audio, url ?? endpoint);
    });
  };

  const requestClip = () => {
    if (clipId && !peekClip(clipId)) void ensureClip(clipId);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={togglePlayback}
      onPointerEnter={requestClip}
      onPointerDown={requestClip}
      onFocus={requestClip}
      aria-label={playing ? t('voiceIntroStop') : t('voiceIntroPlay')}
      className={`inline-flex h-8 shrink-0 items-center gap-[9px] self-start rounded-full bg-background-darker py-0 pr-3 pl-[9px] transition-colors hover:bg-background-main hover:text-foreground focus-visible:bg-background-main focus-visible:text-foreground ${playing ? 'text-primary-light' : 'text-soft'} ${className ?? ''}`}
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

type ProfileVoiceChipProps = {
  profile: {
    id: string;
    premium?: boolean;
    voiceIntroSeconds?: number;
    voiceIntroSrc?: string;
  };
  fetchMode?: 'visible' | 'mount';
  className?: string;
};

export const ProfileVoiceChip = ({
  profile,
  fetchMode,
  className,
}: ProfileVoiceChipProps) =>
  profile.premium && profile.voiceIntroSeconds ? (
    <VoiceChip
      seconds={profile.voiceIntroSeconds}
      src={profile.voiceIntroSrc}
      clipId={
        profile.voiceIntroSrc || profile.id === 'profile-preview'
          ? undefined
          : profile.id
      }
      fetchMode={fetchMode}
      className={className}
    />
  ) : null;
