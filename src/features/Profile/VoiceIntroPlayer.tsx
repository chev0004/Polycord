'use client';

import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  MdFileDownload,
  MdMoreVert,
  MdPause,
  MdPlayArrow,
  MdVolumeDown,
  MdVolumeOff,
  MdVolumeUp,
} from 'react-icons/md';
import { menuContentClass, menuItemClass } from '@/components/Menu';

type VoiceIntroPlayerProps = {
  src: string;
  seconds: number;
  filename: string;
  mimeType?: string;
};

type Problem = 'play' | 'download' | null;

const EXTENSIONS: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/x-wav': 'wav',
  'audio/x-m4a': 'm4a',
};

const extensionFor = (mimeType: string) => {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return EXTENSIONS[base] ?? base.split('/')[1] ?? 'webm';
};

const formatTime = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

const trackClass = 'relative h-1 grow rounded-full bg-white/25';
const thumbClass =
  'block h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] transition-transform duration-150 focus:outline-none focus-visible:scale-125';
const iconButtonClass =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-background-main focus:outline-none focus-visible:bg-background-main disabled:opacity-60';

export const VoiceIntroPlayer = ({
  src,
  seconds,
  filename,
  mimeType,
}: VoiceIntroPlayerProps) => {
  const t = useTranslations('Profile');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(seconds);
  const [volume, setVolume] = useState(1);
  const [volumePinned, setVolumePinned] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    setPlaying(false);
    setTime(0);
    setDuration(seconds);
    setProblem(null);

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        setDuration(audio.duration);
    };
    const settleDuration = () => {
      if (audio.duration !== Number.POSITIVE_INFINITY) return syncDuration();
      const restore = () => {
        audio.removeEventListener('timeupdate', restore);
        audio.currentTime = 0;
        syncDuration();
      };
      audio.addEventListener('timeupdate', restore);
      audio.currentTime = 1e101;
    };
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    const onError = () => {
      setPlaying(false);
      setProblem('play');
    };
    const sync = () => setTime(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('loadedmetadata', settleDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.src = src;

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', settleDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('timeupdate', sync);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [src, seconds]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setProblem(null);
    if (audio.error) audio.load();
    audio.play().catch(() => setProblem('play'));
  };

  const seek = (value: number) => {
    if (audioRef.current) audioRef.current.currentTime = value;
    setTime(value);
  };

  const download = async () => {
    setProblem(null);
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error('Voice intro download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${extensionFor(blob.type || mimeType || '')}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setProblem('download');
    }
  };

  const VolumeIcon =
    volume === 0 ? MdVolumeOff : volume < 0.5 ? MdVolumeDown : MdVolumeUp;
  const total = Math.max(duration, time);
  const sliderOpen = volumePinned
    ? 'ml-1 w-12 opacity-100'
    : 'w-0 opacity-0 group-focus-within/volume:ml-1 group-focus-within/volume:w-12 group-focus-within/volume:opacity-100 group-hover/volume:ml-1 group-hover/volume:w-12 group-hover/volume:opacity-100';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 rounded-full bg-background-dark px-1.5 py-1 text-foreground">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? t('voicePlayerPause') : t('voicePlayerPlay')}
          className={iconButtonClass}
        >
          {playing ? <MdPause size={20} /> : <MdPlayArrow size={20} />}
        </button>
        <Slider.Root
          value={[Math.min(time, total)]}
          max={total}
          step={0.01}
          onValueChange={([value]) => seek(value)}
          className="relative flex h-6 min-w-4 flex-1 touch-none select-none items-center"
        >
          <Slider.Track className={trackClass}>
            <Slider.Range className="absolute h-full rounded-full bg-[#12b5e5]" />
          </Slider.Track>
          <Slider.Thumb
            aria-label={t('voicePlayerSeek')}
            aria-valuetext={t('voicePlayerPosition', {
              time: formatTime(time),
              total: formatTime(total),
            })}
            className={thumbClass}
          />
        </Slider.Root>
        <span className="shrink-0 text-[12px] tabular-nums">
          <span className="font-semibold">{formatTime(time)}</span>
          <span className="text-subtle max-[359px]:hidden">
            {' / '}
            {formatTime(total)}
          </span>
        </span>
        <fieldset
          aria-label={t('voicePlayerVolume')}
          className="group/volume m-0 flex min-w-0 shrink-0 items-center border-0 p-0"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setVolumePinned(false);
          }}
        >
          <button
            type="button"
            onClick={() => setVolumePinned((pinned) => !pinned)}
            aria-label={t('voicePlayerVolume')}
            aria-expanded={volumePinned}
            className={iconButtonClass}
          >
            <VolumeIcon size={18} />
          </button>
          <div
            className={`overflow-hidden transition-[width,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sliderOpen}`}
          >
            <Slider.Root
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={([value]) => setVolume(value)}
              className="relative flex h-6 w-12 touch-none select-none items-center px-1"
            >
              <Slider.Track className={trackClass}>
                <Slider.Range className="absolute h-full rounded-full bg-white" />
              </Slider.Track>
              <Slider.Thumb
                aria-label={t('voicePlayerVolume')}
                className={thumbClass}
              />
            </Slider.Root>
          </div>
        </fieldset>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={t('voicePlayerMenu')}
              className={iconButtonClass}
            >
              <MdMoreVert size={18} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={`${menuContentClass} w-[170px]`}
              side="bottom"
              align="end"
              sideOffset={6}
            >
              <Popover.Close asChild>
                <button
                  type="button"
                  onClick={download}
                  className={`${menuItemClass} text-foreground hover:bg-background-main`}
                >
                  <MdFileDownload size={20} />
                  {t('voicePlayerDownload')}
                </button>
              </Popover.Close>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {problem ? (
        <p role="alert" className="text-[12px] text-danger">
          {problem === 'play'
            ? t('voicePlayerPlayError')
            : t('voicePlayerDownloadError')}
        </p>
      ) : null}
    </div>
  );
};
