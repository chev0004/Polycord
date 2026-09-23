'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MdDeleteOutline, MdMic, MdStop } from 'react-icons/md';
import { Button } from '@/components/Button';
import { FormGroup } from '@/components/Form';

const MAX_INTRO_SECONDS = 20;

type PendingClip = {
  url: string;
  dataUrl: string;
  mimeType: string;
  seconds: number;
};

type VoiceIntroEditorProps = {
  premium: boolean;
  voiceSeconds: number;
  onChange: (seconds: number) => void;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const VoiceIntroEditor = ({
  premium,
  voiceSeconds,
  onChange,
}: VoiceIntroEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<PendingClip | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'mic' | 'save' | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      for (const track of recorderRef.current?.stream.getTracks() ?? []) {
        track.stop();
      }
      if (pending) URL.revokeObjectURL(pending.url);
    },
    [pending],
  );

  const startRecording = async () => {
    setError(null);

    if (pending) {
      URL.revokeObjectURL(pending.url);
      setPending(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const seconds = Math.min(
          MAX_INTRO_SECONDS,
          Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        );

        try {
          const dataUrl = await blobToDataUrl(blob);
          setPending({
            url: URL.createObjectURL(blob),
            dataUrl,
            mimeType,
            seconds,
          });
        } catch {
          setError('save');
        }

        setRecording(false);
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      stopTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_INTRO_SECONDS * 1000);
    } catch {
      setError('mic');
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recorderRef.current?.stop();
  };

  const toggleRecording = () => {
    if (!premium || busy) return;

    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  const saveClip = async () => {
    if (!pending || busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mimeType: pending.mimeType,
          durationSeconds: pending.seconds,
          audio: pending.dataUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Voice intro save failed');
      }

      const saved = (await response.json()) as { durationSeconds: number };
      onChange(saved.durationSeconds);
      URL.revokeObjectURL(pending.url);
      setPending(null);
    } catch {
      setError('save');
    } finally {
      setBusy(false);
    }
  };

  const discardClip = () => {
    if (!pending) return;
    URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const deleteClip = async () => {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/voice', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Voice intro delete failed');
      }

      onChange(0);
    } catch {
      setError('save');
    } finally {
      setBusy(false);
    }
  };

  const description = premium
    ? recording
      ? t('voiceIntroRecordingDescription')
      : pending
        ? t('voiceIntroPendingDescription', { seconds: pending.seconds })
        : voiceSeconds
          ? t('voiceIntroLiveDescription', { seconds: voiceSeconds })
          : t('voiceIntroEmptyDescription')
    : t('voiceIntroFreeDescription');

  return (
    <FormGroup>
      <div className="flex flex-col gap-3 rounded-xl bg-background-darker px-4 py-3.5">
        <div className="flex items-center gap-3.5">
          {premium ? (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={busy}
              aria-label={
                recording
                  ? t('voiceIntroStopLabel')
                  : t('voiceIntroRecordLabel')
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none active:scale-[0.96] disabled:opacity-60 ${
                recording
                  ? 'bg-[#f87171] text-white'
                  : 'bg-primary text-black hover:bg-primary-light'
              }`}
            >
              {recording ? <MdStop size={22} /> : <MdMic size={22} />}
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div
              className={`flex items-center gap-2 font-medium text-[15px] ${
                premium ? 'text-white' : 'text-gray-300'
              }`}
            >
              {t('voiceIntroTitle')}
              {premium ? null : (
                <span className="inline-flex items-center rounded-full bg-white/10 px-[9px] py-0.5 font-bold text-[10.5px] text-gray-300 uppercase tracking-[0.05em]">
                  {t('voiceIntroPremiumTag')}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-gray-500">{description}</p>
          </div>
          {premium && voiceSeconds && !recording && !pending ? (
            <button
              type="button"
              onClick={deleteClip}
              disabled={busy}
              aria-label={t('voiceIntroDeleteLabel')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-background-main hover:text-red-300 focus:outline-none disabled:opacity-60"
            >
              <MdDeleteOutline size={20} />
            </button>
          ) : null}
        </div>

        {pending ? (
          <div className="flex flex-col gap-2.5">
            {/* biome-ignore lint/a11y/useMediaCaption: short voice recording preview has no transcript */}
            <audio controls src={pending.url} className="h-9 w-full" />
            <div className="flex gap-2">
              <Button
                onClick={saveClip}
                disabled={busy}
                className="h-9 text-[13px]"
              >
                {busy ? t('voiceIntroSaving') : t('voiceIntroSaveLabel')}
              </Button>
              <Button
                variant="outline"
                onClick={discardClip}
                disabled={busy}
                className="h-9 text-[13px]"
              >
                {t('voiceIntroDiscardLabel')}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-[12px] text-red-400">
            {error === 'mic' ? t('voiceIntroMicError') : t('voiceIntroError')}
          </p>
        ) : null}
      </div>
      {premium ? (
        <p className="text-[13px] text-gray-400 leading-relaxed">
          {t('voiceIntroImmediate')}
        </p>
      ) : (
        <p className="text-[13px] text-gray-400 leading-relaxed">
          {t.rich('voiceIntroUpsell', {
            premiumLink: (chunks) => (
              <Link
                href={`/${locale}/settings#premium`}
                className="font-semibold text-primary-light focus:outline-none"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </FormGroup>
  );
};
