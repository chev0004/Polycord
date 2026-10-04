'use client';

import { useTranslations } from 'next-intl';
import type { IconType } from 'react-icons';
import {
  MdBlock,
  MdCampaign,
  MdOutlineFlag,
  MdSchedule,
  MdVisibilityOff,
} from 'react-icons/md';
import type { ModState } from './types';

const base =
  'inline-flex h-[18px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 font-semibold text-[10.5px]';
const red = `${base} bg-danger-surface text-danger`;
const yellow = `${base} bg-[rgba(240,177,51,0.12)] text-discord-yellow-light`;

export const ModerationChips = ({ state }: { state: ModState }) => {
  const t = useTranslations('Admin');
  const chip = (key: string, tone: string, Icon: IconType, label: string) => (
    <span key={key} className={tone}>
      <Icon size={12} />
      {label}
    </span>
  );

  return (
    <>
      {state.banned ? chip('banned', red, MdBlock, t('chipBanned')) : null}
      {state.suspended
        ? chip('suspended', red, MdSchedule, t('chipSuspended'))
        : null}
      {state.hidden
        ? chip('hidden', red, MdVisibilityOff, t('chipHidden'))
        : null}
      {state.pendingReports > 0
        ? chip(
            'reports',
            yellow,
            MdOutlineFlag,
            t('chipPendingReports', { count: state.pendingReports }),
          )
        : null}
      {state.warnings > 0
        ? chip(
            'warned',
            yellow,
            MdCampaign,
            t('chipWarned', { count: state.warnings }),
          )
        : null}
    </>
  );
};

export const hasModeration = (state?: ModState): state is ModState =>
  state !== undefined &&
  (state.hidden ||
    state.suspended ||
    state.banned ||
    state.warnings > 0 ||
    state.pendingReports > 0);
