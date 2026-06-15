'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdMic, MdStop } from 'react-icons/md';
import { FormGroup } from '@/components/Form';

const SIMULATED_INTRO_SECONDS = 12;

type VoiceIntroEditorProps = {
  premium: boolean;
  voiceSeconds: number;
  onChange: (seconds: number) => void;
};

export const VoiceIntroEditor = ({
  premium,
  voiceSeconds,
  onChange,
}: VoiceIntroEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const [recording, setRecording] = useState(false);

  const toggleRecording = () => {
    if (!premium) return;

    if (recording) {
      setRecording(false);
      onChange(SIMULATED_INTRO_SECONDS);
    } else {
      setRecording(true);
      onChange(0);
    }
  };

  const description = premium
    ? recording
      ? t('voiceIntroRecordingDescription')
      : voiceSeconds
        ? t('voiceIntroLiveDescription', { seconds: voiceSeconds })
        : t('voiceIntroEmptyDescription')
    : t('voiceIntroFreeDescription');

  return (
    <FormGroup>
      <div className="flex items-center gap-3.5 rounded-xl bg-background-darker px-4 py-3.5">
        {premium ? (
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={
              recording ? t('voiceIntroStopLabel') : t('voiceIntroRecordLabel')
            }
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none active:scale-[0.96] ${
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
      </div>
      {premium ? null : (
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
