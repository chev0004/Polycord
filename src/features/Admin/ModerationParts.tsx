'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  type DateTimeFormatOptions,
  useFormatter,
  useLocale,
  useNow,
  useTranslations,
} from 'next-intl';
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { IconType } from 'react-icons';
import {
  MdAdminPanelSettings,
  MdArrowForward,
  MdBlock,
  MdCampaign,
  MdCheck,
  MdContentCopy,
  MdDone,
  MdErrorOutline,
  MdGavel,
  MdLockOpen,
  MdLockOutline,
  MdOutlineFlag,
  MdSchedule,
  MdSettingsBackupRestore,
  MdVisibility,
  MdVisibilityOff,
  MdWorkspacePremium,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { NumberStepper } from '@/components/Form';
import { getLanguageName, proficiencyOptions } from '@/constants/languages';
import { signInHref } from '@/features/Navigation/signIn';
import type {
  LogAction,
  ModAction,
  ModLogEntry,
  ModReport,
  ModUser,
  StaffRole,
} from './types';
import {
  isReauthError,
  isSuspended,
  type ModerationStore,
} from './useModeration';

const subscribeNothing = () => () => {};

export const useModFormat = () => {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const dateTime = (value: Date, options: DateTimeFormatOptions) =>
    hydrated ? format.dateTime(value, options) : '';
  return {
    relative: (iso: string) => {
      const date = new Date(iso);
      return hydrated
        ? format.relativeTime(
            date,
            new Date(Math.max(now.getTime(), date.getTime())),
          )
        : '';
    },
    absolute: (iso: string) =>
      dateTime(new Date(iso), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    date: (iso: string | Date) =>
      dateTime(new Date(iso), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    time: (value: Date) =>
      dateTime(value, { hour: '2-digit', minute: '2-digit' }),
  };
};

export const useLanguageLabels = () => {
  const locale = useLocale();
  const levels = proficiencyOptions(locale);
  return {
    language: (code: string) => getLanguageName(code, locale),
    level: (value: string) =>
      levels.find((option) => option.value === value)?.label ?? value,
  };
};

export const ACTION_TONE: Record<LogAction, string> = {
  dismiss: 'bg-primary-dark',
  warn: 'bg-discord-yellow',
  hide_profile: 'bg-red-400',
  unhide_profile: 'bg-primary-dark',
  suspend: 'bg-red-400',
  unsuspend: 'bg-primary-dark',
  ban: 'bg-red-400',
  unban: 'bg-primary-dark',
  grant: 'bg-primary-dark',
  revoke: 'bg-primary-dark',
  premium_grant: 'bg-discord-yellow',
  premium_revoke: 'bg-primary-dark',
  ip_block: 'bg-red-400',
  ip_unblock: 'bg-primary-dark',
};

export const useLogLabel = () => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  return (entry: ModLogEntry) =>
    entry.action === 'suspend' && entry.days
      ? t('suspendedFor', { count: entry.days })
      : entry.action === 'premium_grant' && entry.grant
        ? t('premiumGrantedFor', entry.grant)
        : entry.action === 'premium_grant' && entry.expiresAt
          ? t('premiumGrantedUntil', { date: date(entry.expiresAt) })
          : entry.action === 'premium_revoke' && entry.expiresAt
            ? t('premiumRevokedFrom', { date: date(entry.expiresAt) })
            : t(`action_${entry.action}`);
};

const chipBase =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-md font-semibold';

export const ReasonBadge = ({ reason }: { reason: ModReport['reason'] }) => {
  const t = useTranslations('Admin');
  return (
    <span className="inline-flex h-5 items-center whitespace-nowrap rounded-md bg-[rgba(107,114,128,0.2)] px-2 font-bold text-[10.5px] text-soft uppercase tracking-[0.05em]">
      {t(`reason_${reason}`)}
    </span>
  );
};

export const StaffChip = ({
  role,
  small = false,
}: {
  role: StaffRole;
  small?: boolean;
}) => {
  const t = useTranslations('Admin');
  return (
    <span
      className={`${chipBase} bg-primary-darker text-primary-light ${small ? 'h-5 px-2 text-[10.5px]' : 'h-[22px] px-2 text-[11px]'}`}
    >
      {small ? null : (
        <MdAdminPanelSettings size={14} className="text-primary" />
      )}
      {t(
        small ? 'chipStaff' : role === 'owner' ? 'chipOwner' : 'chipModerator',
      )}
    </span>
  );
};

export const WarnChip = ({ count }: { count: number }) => {
  const t = useTranslations('Admin');
  return (
    <span
      className={`${chipBase} h-[22px] bg-[rgba(240,177,51,0.12)] px-2 text-[11px] text-discord-yellow-light`}
    >
      <MdCampaign size={14} />
      {t('chipWarned', { count })}
    </span>
  );
};

export const hasGrant = (user: ModUser) =>
  user.premium.grantedUntil !== undefined &&
  new Date(user.premium.grantedUntil).getTime() > Date.now();

export const SupporterChip = () => {
  const t = useTranslations('Admin');
  return (
    <span
      className={`${chipBase} h-[22px] bg-primary-darker px-2 text-[11px] text-primary-light`}
    >
      <MdWorkspacePremium size={14} className="text-primary" />
      {t('chipSupporter')}
    </span>
  );
};

export const RestrictionChips = ({
  user,
  small = false,
}: {
  user: ModUser;
  small?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const size = small
    ? 'h-[18px] px-1.5 text-[10.5px]'
    : 'h-[22px] border border-red-800/70 px-2 text-[11px]';
  const iconSize = small ? 12 : 14;
  const chip = (icon: IconType, label: string) => {
    const Icon = icon;
    return (
      <span
        key={label}
        className={`${chipBase} bg-[rgba(69,10,10,0.5)] text-red-300 ${size}`}
      >
        <Icon size={iconSize} />
        {label}
      </span>
    );
  };
  return (
    <>
      {user.bannedAt ? chip(MdBlock, t('chipBanned')) : null}
      {isSuspended(user) && user.suspendedUntil
        ? chip(
            MdSchedule,
            small
              ? t('chipSuspended')
              : t('chipSuspendedUntil', { date: date(user.suspendedUntil) }),
          )
        : null}
      {user.hidden
        ? chip(MdVisibilityOff, t(small ? 'chipHidden' : 'chipProfileHidden'))
        : null}
    </>
  );
};

export const UserChips = ({
  user,
  showSupporter = false,
}: {
  user: ModUser;
  showSupporter?: boolean;
}) => (
  <>
    {user.role ? <StaffChip role={user.role} /> : null}
    <RestrictionChips user={user} />
    {user.warnings > 0 ? <WarnChip count={user.warnings} /> : null}
    {showSupporter && hasGrant(user) ? <SupporterChip /> : null}
  </>
);

export const EmptyState = ({
  icon: Icon,
  title,
  body,
  children,
  className = '',
}: {
  icon: IconType;
  title: string;
  body?: string;
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-2.5 text-center ${className}`}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-darker text-primary">
      <Icon size={24} />
    </div>
    <p className="font-semibold text-foreground text-lg">{title}</p>
    {body ? (
      <p className="max-w-[340px] text-[13.5px] text-muted leading-normal">
        {body}
      </p>
    ) : null}
    {children}
  </div>
);

type ButtonTone = 'default' | 'primary' | 'danger' | 'dangerFill';

const toneClasses: Record<ButtonTone, string> = {
  default:
    'border-primary-dark text-primary-light font-medium enabled:hover:bg-primary-darker',
  primary:
    'border-primary bg-primary text-black font-semibold enabled:hover:bg-primary-light',
  danger:
    'border-red-800 text-red-400 font-medium enabled:hover:bg-[rgba(69,10,10,0.5)] enabled:hover:text-red-300',
  dangerFill:
    'border-red-800 bg-red-800 text-white font-semibold enabled:hover:bg-red-900',
};

export const modButton = (tone: ButtonTone = 'default') =>
  `inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses[tone]}`;

export const Spinner = ({
  className = 'h-3.5 w-3.5',
}: {
  className?: string;
}) => (
  <span
    aria-hidden
    className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
  />
);

export const Kbd = ({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) => (
  <kbd
    className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border px-[5px] font-dm font-semibold text-[11px] ${
      dark ? 'border-black/25 text-black/60' : 'border-line text-muted'
    }`}
  >
    {children}
  </kbd>
);

export const NoteField = ({
  value,
  onChange,
  tall = false,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  tall?: boolean;
  placeholder?: string;
  label?: string;
}) => {
  const t = useTranslations('Admin');
  return (
    <div className="relative">
      <textarea
        rows={1}
        maxLength={500}
        value={value}
        placeholder={placeholder ?? t('notePlaceholder')}
        aria-label={label ?? t('note')}
        onChange={(event) => onChange(event.target.value)}
        className={`block max-h-[120px] w-full resize-none rounded-lg border border-white/[0.07] bg-background-darker py-2 pr-14 pl-3 font-light text-[13px] text-foreground leading-[1.45] outline-none transition-colors placeholder:text-subtle hover:border-white/[0.14] focus:border-white/[0.14] ${tall ? 'min-h-[72px]' : 'min-h-9'}`}
      />
      <span
        className={`pointer-events-none absolute right-2.5 bottom-[9px] text-[11px] ${value.length >= 500 ? 'text-red-500' : 'text-subtle'}`}
      >
        {value.length}/500
      </span>
    </div>
  );
};

export const ActionError = ({
  onRetry,
  mobile = false,
  reauth = false,
}: {
  onRetry?: () => void;
  mobile?: boolean;
  reauth?: boolean;
}) => {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const action =
    'h-7 whitespace-nowrap rounded-md border border-red-800 px-2.5 font-semibold text-[12.5px] text-red-300 hover:bg-[rgba(153,27,27,0.35)]';
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 border border-red-800 ${mobile ? 'rounded-[14px]' : 'rounded-lg'} bg-[rgba(69,10,10,0.5)] py-2 pr-2 pl-3 text-[13px] text-red-400`}
    >
      <MdErrorOutline size={18} />
      <span className="flex-1">
        {t(reauth ? 'reauthRequired' : 'actionFailed')}
      </span>
      {reauth ? (
        <a
          href={signInHref(locale)}
          className={`${action} inline-flex items-center`}
        >
          {t('signInAgain')}
        </a>
      ) : onRetry ? (
        <button type="button" onClick={onRetry} className={action}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  );
};

export const ProtectedNotice = ({
  self,
  large = false,
}: {
  self: boolean;
  large?: boolean;
}) => {
  const t = useTranslations('Admin');
  return (
    <div
      className={`flex items-center gap-2.5 bg-primary-darker text-primary-light ${large ? 'rounded-2xl px-3.5 py-3 text-sm leading-snug' : 'rounded-xl px-3 py-2.5 text-[13px]'}`}
    >
      <MdAdminPanelSettings size={20} className="shrink-0 text-primary" />
      <span>
        {t.rich(self ? 'protectedSelf' : 'protectedStaff', {
          b: (chunks) => (
            <b className="font-semibold text-foreground">{chunks}</b>
          ),
        })}
      </span>
    </div>
  );
};

export const useSuspendDays = (open: boolean) => {
  const [preset, setPreset] = useState<number | 'custom'>(7);
  const [custom, setCustom] = useState('14');

  useEffect(() => {
    if (open) setPreset(7);
  }, [open]);

  const customDays = Number(custom);
  const days = preset === 'custom' ? customDays : preset;
  const valid = Number.isInteger(days) && days >= 1 && days <= 90;

  return {
    preset,
    setPreset,
    custom,
    setCustom,
    days,
    valid,
    until: valid ? new Date(Date.now() + days * 86400000) : null,
  };
};

export const DURATION_PRESETS = [1, 3, 7, 30, 90];

export const SuspendEnds = ({ until }: { until: Date }) => {
  const t = useTranslations('Admin');
  const { date, time } = useModFormat();
  return (
    <>
      {t.rich('endsAt', {
        date: date(until),
        time: time(until),
        b: (chunks) => (
          <b className="font-semibold text-foreground">{chunks}</b>
        ),
      })}
    </>
  );
};

const ModDialog = ({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) => (
  <Dialog.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
    <Dialog.Portal>
      <Dialog.Overlay className="DialogOverlay fixed inset-0 z-[80] bg-black/65" />
      <div className="pointer-events-none fixed inset-0 z-[81] flex items-center justify-center p-5">
        <Dialog.Content className="DialogContent pointer-events-auto flex max-h-full w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-panel border border-[rgba(107,114,128,0.5)] bg-background-dark p-[22px] font-figtree shadow-xl">
          <div>
            <Dialog.Title className="font-bold text-[19px] text-foreground leading-tight">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-[13.5px] text-muted leading-normal">
              {description}
            </Dialog.Description>
          </div>
          {children}
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
);

const fieldLabel = 'font-medium text-[13px] text-soft';

export const SuspendDialog = ({
  open,
  user,
  note,
  onNote,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  user: ModUser;
  note: string;
  onNote: (note: string) => void;
  onCancel: () => void;
  onConfirm: (days: number) => void;
}) => {
  const t = useTranslations('Admin');
  const suspend = useSuspendDays(open);
  return (
    <ModDialog
      open={open}
      onClose={onCancel}
      title={t('suspendTitle', { name: user.displayName })}
      description={t('suspendBody', { username: user.username })}
    >
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('duration')}</span>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {DURATION_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={suspend.preset === days}
              onClick={() => suspend.setPreset(days)}
              className={durationTile(suspend.preset === days)}
            >
              {t('days', { count: days })}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={suspend.preset === 'custom'}
            onClick={() => suspend.setPreset('custom')}
            className={durationTile(suspend.preset === 'custom')}
          >
            {t('custom')}
          </button>
        </div>
        {suspend.preset === 'custom' ? (
          <div className="flex items-center gap-2.5">
            <NumberStepper
              value={suspend.custom}
              onChange={suspend.setCustom}
              min={1}
              max={90}
              label={t('daysUnit')}
              decrementLabel={t('fewerDays')}
              incrementLabel={t('moreDays')}
              error={!suspend.valid}
              className="w-36"
            />
            <span className="text-[12.5px] text-muted">{t('daysUnit')}</span>
          </div>
        ) : null}
        {suspend.until ? (
          <span className="text-[12.5px] text-muted">
            <SuspendEnds until={suspend.until} />
          </span>
        ) : (
          <span className="text-[12.5px] text-red-500">{t('daysInvalid')}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('note')}</span>
        <NoteField value={note} onChange={onNote} tall />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={modButton()}>
          {t('cancel')}
        </button>
        <button
          type="button"
          disabled={!suspend.valid}
          onClick={() => onConfirm(suspend.days)}
          className={modButton('dangerFill')}
        >
          <MdSchedule size={17} />
          {suspend.valid
            ? t('suspendConfirm', { count: suspend.days })
            : t('suspendConfirmInvalid')}
        </button>
      </div>
    </ModDialog>
  );
};

export const WARN_PRESETS = [
  'Spam',
  'Harassment',
  'Hate',
  'Inappropriate',
  'Impersonation',
  'Privacy',
] as const;

type WarnChoice = (typeof WARN_PRESETS)[number] | 'custom';

export const useWarnMessage = (open: boolean) => {
  const t = useTranslations('Admin');
  const [choice, setChoice] = useState<WarnChoice | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    setChoice(null);
    setText('');
  }, [open]);

  const message = text.trim();

  return {
    choice,
    text,
    setText,
    message,
    valid: message.length > 0,
    pick: (next: WarnChoice) => {
      setChoice(next);
      if (next !== 'custom') setText(t(`warnText${next}`));
    },
  };
};

export const WarnPresets = ({
  choice,
  onPick,
  mobile = false,
}: {
  choice: WarnChoice | null;
  onPick: (choice: WarnChoice) => void;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {[...WARN_PRESETS, 'custom' as const].map((preset) => (
        <button
          key={preset}
          type="button"
          aria-pressed={choice === preset}
          onClick={() => onPick(preset)}
          className={
            mobile
              ? `flex min-h-12 items-center justify-center rounded-xl border px-2 text-center font-medium text-sm ${choice === preset ? 'border-primary bg-primary-darker font-semibold text-primary-light' : 'border-[rgba(107,114,128,0.5)] text-gray-200'}`
              : `${durationTile(choice === preset)} min-h-[38px] px-2 py-1`
          }
        >
          {preset === 'custom' ? t('warnCustom') : t(`warnPreset${preset}`)}
        </button>
      ))}
    </div>
  );
};

export const WarnPreview = ({
  user,
  message,
  mobile = false,
}: {
  user: ModUser;
  message: string;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  return (
    <div className="flex flex-col gap-1.5">
      <span className={mobile ? 'text-[13px] text-muted' : fieldLabel}>
        {t('warnPreview', { name: user.displayName })}
      </span>
      <p
        className={`whitespace-pre-wrap break-words rounded-[14px] bg-background-darker px-3.5 py-3 leading-normal ${mobile ? 'text-[15px]' : 'text-[13.5px]'} ${message ? 'text-foreground' : 'text-subtle italic'}`}
      >
        {message || t('warnPreviewEmpty')}
      </p>
    </div>
  );
};

export const WarnDialog = ({
  open,
  user,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  user: ModUser;
  onCancel: () => void;
  onConfirm: (message: string) => void;
}) => {
  const t = useTranslations('Admin');
  const warn = useWarnMessage(open);
  return (
    <ModDialog
      open={open}
      onClose={onCancel}
      title={t('warnTitle', { name: user.displayName })}
      description={t('warnBody')}
    >
      <WarnPresets choice={warn.choice} onPick={warn.pick} />
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('warnReason')}</span>
        <NoteField
          value={warn.text}
          onChange={warn.setText}
          tall
          label={t('warnReason')}
          placeholder={t('warnPlaceholder')}
        />
      </div>
      <WarnPreview user={user} message={warn.message} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={modButton()}>
          {t('cancel')}
        </button>
        <button
          type="button"
          disabled={!warn.valid}
          onClick={() => onConfirm(warn.message)}
          className={modButton('primary')}
        >
          <MdCampaign size={17} />
          {t('warnSend')}
        </button>
      </div>
    </ModDialog>
  );
};

export const durationTile = (on: boolean) =>
  `h-[38px] rounded-lg border text-[13px] font-medium transition-colors ${
    on
      ? 'border-primary-dark bg-primary-darker text-primary-light'
      : 'border-[rgba(107,114,128,0.5)] bg-background-darker text-muted hover:text-foreground'
  }`;

export const BanDialog = ({
  open,
  user,
  note,
  onNote,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  user: ModUser;
  note: string;
  onNote: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const t = useTranslations('Admin');
  return (
    <ModDialog
      open={open}
      onClose={onCancel}
      title={t('banTitle', { name: user.displayName })}
      description={t.rich('banBody', {
        username: user.username,
        b: (chunks) => (
          <b className="font-semibold text-foreground">{chunks}</b>
        ),
      })}
    >
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('note')}</span>
        <NoteField value={note} onChange={onNote} tall />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={modButton()}>
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={modButton('dangerFill')}
        >
          <MdBlock size={17} />
          {t('banConfirm', { name: user.displayName })}
        </button>
      </div>
    </ModDialog>
  );
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable);

export const useShortcut = (
  enabled: boolean,
  handler: (key: string, event: KeyboardEvent) => void,
) => {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      latest.current(event.key.toLowerCase(), event);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
};

export const ActionBar = ({
  store,
  user,
  reportIds,
  canDismiss,
  shortcuts = false,
  onDone,
}: {
  store: ModerationStore;
  user: ModUser;
  reportIds: string[];
  canDismiss: boolean;
  shortcuts?: boolean;
  onDone: (request: { action: ModAction; days?: number }) => void;
}) => {
  const t = useTranslations('Admin');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ModAction | null>(null);
  const [failed, setFailed] = useState<{
    action: ModAction;
    days?: number;
    note: string;
    reauth: boolean;
  } | null>(null);
  const [dialog, setDialog] = useState<'warn' | 'suspend' | 'ban' | null>(null);
  const protectedAccount = user.role !== undefined || user.id === store.meId;
  const suspended = isSuspended(user);

  const run = async (action: ModAction, days?: number, runNote = note) => {
    if (busy) return;
    setBusy(action);
    setFailed(null);
    setDialog(null);
    try {
      await store.act({
        userId: user.id,
        action,
        reportIds,
        note: runNote,
        days,
      });
      setNote('');
      onDone({ action, days });
    } catch (error) {
      setFailed({ action, days, note: runNote, reauth: isReauthError(error) });
    } finally {
      setBusy(null);
    }
  };

  useShortcut(shortcuts, (key) => {
    if (key === 'd' && canDismiss) void run('dismiss');
    if (protectedAccount) return;
    if (key === 'w') setDialog('warn');
    if (key === 'h') void run(user.hidden ? 'unhide_profile' : 'hide_profile');
    if (key === 's') {
      if (suspended) void run('unsuspend');
      else setDialog('suspend');
    }
  });

  const cell = (
    action: ModAction,
    icon: IconType,
    label: string,
    tone: 'danger' | 'restore',
    kbd?: string,
    onClick: () => void = () => run(action),
  ) => {
    const Icon = icon;
    const working = busy === action;
    return (
      <button
        key={action}
        type="button"
        aria-label={label}
        disabled={busy !== null}
        onClick={onClick}
        className={`group relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-line border-l transition-colors duration-150 first:border-l-0 focus-visible:bg-background-main disabled:cursor-not-allowed disabled:opacity-40 max-md:h-[58px] ${working ? 'disabled:opacity-100' : ''} ${
          tone === 'danger'
            ? 'text-red-400 enabled:hover:bg-[rgba(69,10,10,0.5)] enabled:hover:text-red-300'
            : 'text-muted enabled:hover:bg-background-main enabled:hover:text-foreground'
        }`}
      >
        {working ? (
          <Spinner className="h-[18px] w-[18px]" />
        ) : (
          <Icon size={22} />
        )}
        <span
          aria-hidden
          className="hidden font-semibold text-[10.5px] leading-none max-md:block"
        >
          {label}
        </span>
        <span
          aria-hidden
          className="-translate-x-1/2 pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[5] translate-y-1 whitespace-nowrap rounded-lg border border-line-strong bg-background-darker px-[9px] py-[5px] font-medium text-foreground text-xs opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-md:hidden"
        >
          {kbd && shortcuts ? `${label} · ${kbd}` : label}
        </span>
      </button>
    );
  };

  const dismissLabel =
    reportIds.length > 1
      ? t(protectedAccount ? 'dismissReports' : 'dismissCount', {
          count: reportIds.length,
        })
      : t(protectedAccount ? 'dismissReport' : 'dismiss');

  return (
    <div className="flex flex-col border-line border-b bg-background-dark">
      {protectedAccount ? (
        <div className="px-4 py-3 md:px-5">
          <ProtectedNotice self={user.id === store.meId} />
        </div>
      ) : (
        <div role="toolbar" aria-label={t('actionsLabel')} className="flex">
          {cell('warn', MdCampaign, t('warn'), 'danger', 'W', () =>
            setDialog('warn'),
          )}
          {user.hidden
            ? cell(
                'unhide_profile',
                MdVisibility,
                t('unhideProfile'),
                'restore',
                'H',
              )
            : cell(
                'hide_profile',
                MdVisibilityOff,
                t('hideProfile'),
                'danger',
                'H',
              )}
          {suspended
            ? cell('unsuspend', MdLockOpen, t('liftSuspension'), 'restore', 'S')
            : cell('suspend', MdSchedule, t('suspend'), 'danger', 'S', () =>
                setDialog('suspend'),
              )}
          {store.meRole !== 'owner'
            ? null
            : user.bannedAt
              ? cell('unban', MdSettingsBackupRestore, t('unban'), 'restore')
              : cell('ban', MdGavel, t('ban'), 'danger', undefined, () =>
                  setDialog('ban'),
                )}
        </div>
      )}
      {!protectedAccount || canDismiss ? (
        <div className="border-line border-t px-4 py-3 md:px-5">
          <NoteField value={note} onChange={setNote} />
        </div>
      ) : null}
      {failed ? (
        <div className="px-4 pb-3 md:px-5">
          <ActionError
            reauth={failed.reauth}
            onRetry={() => run(failed.action, failed.days, failed.note)}
          />
        </div>
      ) : null}
      {canDismiss && reportIds.length > 0 ? (
        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-xl bg-background-darker py-1.5 pr-1.5 pl-3 text-[13px] text-muted md:mx-5">
          <MdOutlineFlag size={18} className="shrink-0 text-discord-yellow" />
          <span className="flex-1">
            {t('pendingReports', { count: reportIds.length })}
          </span>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('dismiss')}
            className={`${modButton('primary')} ${busy === 'dismiss' ? 'disabled:opacity-100' : ''}`}
          >
            {busy === 'dismiss' ? <Spinner /> : <MdDone size={17} />}
            {busy === 'dismiss' ? t('working') : dismissLabel}
            {busy !== 'dismiss' ? <Kbd dark>D</Kbd> : null}
          </button>
        </div>
      ) : null}
      <WarnDialog
        open={dialog === 'warn'}
        user={user}
        onCancel={() => setDialog(null)}
        onConfirm={(message) => run('warn', undefined, message)}
      />
      <SuspendDialog
        open={dialog === 'suspend'}
        user={user}
        note={note}
        onNote={setNote}
        onCancel={() => setDialog(null)}
        onConfirm={(days) => run('suspend', days)}
      />
      <BanDialog
        open={dialog === 'ban'}
        user={user}
        note={note}
        onNote={setNote}
        onCancel={() => setDialog(null)}
        onConfirm={() => run('ban')}
      />
    </div>
  );
};

export const ReportStack = ({
  store,
  reports,
  onOpenUser,
  mobile = false,
}: {
  store: ModerationStore;
  reports: ModReport[];
  onOpenUser?: (userId: string) => void;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { relative, absolute } = useModFormat();
  return (
    <div className={`flex flex-col ${mobile ? 'gap-2' : 'gap-1.5'}`}>
      {reports.map((report) => {
        const reporter = store.usersById.get(report.reporterId);
        return (
          <div
            key={report.id}
            className={`flex flex-col ${mobile ? 'gap-2.5 rounded-[20px] bg-background-dark px-4 py-3.5' : 'gap-2 rounded-[14px] bg-background-darker px-3.5 py-3'}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <ReasonBadge reason={report.reason} />
              {report.status !== 'pending' ? (
                <span className="font-semibold text-[11.5px] text-muted">
                  {t(`status_${report.status}`)}
                </span>
              ) : null}
              <time
                dateTime={report.createdAt}
                title={absolute(report.createdAt)}
                className="ml-auto whitespace-nowrap text-subtle text-xs"
              >
                {relative(report.createdAt)}
              </time>
            </div>
            {report.details ? (
              <p
                className={`whitespace-pre-wrap break-words font-light text-gray-200 leading-normal ${mobile ? 'text-[15px]' : 'text-sm'}`}
              >
                {report.details}
              </p>
            ) : (
              <p className="text-[13px] text-subtle italic">{t('noDetails')}</p>
            )}
            <div
              title={t('reporterConfidential')}
              className={`flex flex-wrap items-center gap-1.5 text-subtle ${mobile ? 'text-[12.5px]' : 'text-xs'}`}
            >
              <MdLockOutline size={14} />
              {t('reportedBy')}
              {reporter ? (
                <>
                  {onOpenUser ? (
                    <button
                      type="button"
                      onClick={() => onOpenUser(reporter.id)}
                      className="text-muted underline decoration-line-strong underline-offset-2 hover:text-foreground"
                    >
                      {reporter.displayName}
                    </button>
                  ) : (
                    <span className="text-muted">{reporter.displayName}</span>
                  )}
                  <span>@{reporter.username}</span>
                </>
              ) : (
                <span>{t('unknownUser')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const HistoryList = ({
  store,
  entries,
  mobile = false,
}: {
  store: ModerationStore;
  entries: ModLogEntry[];
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { relative, absolute } = useModFormat();
  const label = useLogLabel();

  if (!entries.length) {
    return (
      <p
        className={`text-[13px] text-subtle ${mobile ? 'rounded-[20px] bg-background-dark px-4 py-3.5' : ''}`}
      >
        {t('historyEmpty')}
      </p>
    );
  }

  return (
    <div
      className={
        mobile ? 'rounded-[20px] bg-background-dark px-4 py-1' : undefined
      }
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-3 border-[rgba(55,65,81,0.6)] border-t first:border-t-0 ${mobile ? 'py-3' : 'py-2'}`}
        >
          <span
            className={`mt-1.5 ml-1 h-2 w-2 rounded-full ${ACTION_TONE[entry.action]}`}
          />
          <div>
            <p
              className={`text-foreground ${mobile ? 'text-sm' : 'text-[13px]'}`}
            >
              {label(entry)}{' '}
              <span className="text-muted">
                {t('byStaff', {
                  name:
                    store.usersById.get(entry.staffId ?? '')?.displayName ??
                    t('unknownUser'),
                })}
              </span>
            </p>
            {entry.note ? (
              <p className="mt-[3px] font-light text-[12.5px] text-muted">
                {entry.note}
              </p>
            ) : null}
          </div>
          <time
            dateTime={entry.createdAt}
            title={absolute(entry.createdAt)}
            className="whitespace-nowrap text-subtle text-xs"
          >
            {relative(entry.createdAt)}
          </time>
        </div>
      ))}
    </div>
  );
};

export const DetailHeader = ({
  user,
  onOpenRecord,
  showSupporter = false,
}: {
  user: ModUser;
  onOpenRecord?: () => void;
  showSupporter?: boolean;
}) => {
  const t = useTranslations('Admin');
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-line border-b px-5 pt-[18px] pb-4">
      <Avatar avatarUrl={user.avatarUrl} size="md" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-bold text-foreground text-xl leading-tight">
          {user.displayName}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-muted">
          <span>@{user.username}</span>
          <button
            type="button"
            title={t('copyDiscordId')}
            onClick={() => {
              navigator.clipboard?.writeText(user.discordId).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1 font-mono text-xs tracking-[0.01em] transition-colors hover:text-foreground"
          >
            {user.discordId}
            {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
          </button>
        </div>
        <div className="mt-1 flex min-h-[22px] flex-wrap gap-1.5">
          <UserChips user={user} showSupporter={showSupporter} />
        </div>
      </div>
      {onOpenRecord ? (
        <button
          type="button"
          onClick={onOpenRecord}
          className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[13px] text-primary-light transition-colors hover:text-foreground"
        >
          {t('fullRecord')}
          <MdArrowForward size={16} />
        </button>
      ) : null}
    </div>
  );
};
