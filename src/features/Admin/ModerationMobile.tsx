'use client';

import { useTranslations } from 'next-intl';
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { IconType } from 'react-icons';
import {
  MdAdminPanelSettings,
  MdBlock,
  MdCampaign,
  MdCheck,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdContentCopy,
  MdDone,
  MdExpandMore,
  MdFilterAltOff,
  MdGavel,
  MdGroup,
  MdHistory,
  MdInventory2,
  MdLockOpen,
  MdOutlinedFlag,
  MdPersonRemove,
  MdPersonSearch,
  MdPolicy,
  MdSchedule,
  MdSearch,
  MdSettingsBackupRestore,
  MdStorage,
  MdSwipeLeft,
  MdTaskAlt,
  MdTune,
  MdVisibility,
  MdVisibilityOff,
  MdWorkspacePremium,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { NumberStepper } from '@/components/Form';
import { ActionSheet, Sheet, SheetGroup, SheetRow } from '@/components/Sheet';
import type { WarningCategory } from '@/types';
import {
  ActivityDayBar,
  ActivityPager,
  type ActivityPages,
  ActivityStatus,
  useActivityPages,
} from './ActivityPages';
import type { ModTab, Notify, UsersQuery } from './ModerationDesktop';
import { IpBlocksPanel } from './ModerationIpBlocks';
import {
  ACTION_TONE,
  ActionError,
  type ConfirmAction,
  DURATION_PRESETS,
  EmptyState,
  HistoryList,
  hasGrant,
  ProtectedNotice,
  ReasonBadge,
  ReportStack,
  RestrictionChips,
  Spinner,
  StaffChip,
  SuspendEnds,
  UserChips,
  useActionConfirmation,
  useLanguageLabels,
  useLogLabel,
  useModFormat,
  useSuspendDays,
  useWarnMessage,
  WarnPresets,
  WarnPreview,
} from './ModerationParts';
import { GrantFields, useGrant } from './ModerationPremium';
import { StaffPanel } from './ModerationStaff';
import { protectionOf } from './permissions';
import { SeedPanel } from './SeedPanel';
import { SuspiciousEvents, useEventLabel } from './SuspiciousEvents';
import type {
  ActivityRange,
  ModAction,
  ModLogEntry,
  ModReport,
  ModSuspicious,
  ModUser,
  SeedStatus,
} from './types';
import { LOG_ACTIONS } from './types';
import {
  groupReports,
  hasStatusChips,
  isReauthError,
  isSuspended,
  type ModerationStore,
  type ReportGroup,
} from './useModeration';

type Page = {
  kind: 'case' | 'user';
  userId: string;
  view: 'pending' | 'resolved';
};

const title = 'font-bold text-[28px] leading-[1.15] tracking-[-0.01em]';
const group = 'overflow-hidden rounded-[20px] bg-background-dark';
const divider =
  'relative before:absolute before:top-0 before:right-0 before:h-px before:bg-[rgba(107,114,128,0.22)] first:before:hidden';
const caption =
  'flex items-baseline justify-between px-1 font-semibold text-subtle text-xs uppercase tracking-[0.06em]';
const mobileButton = (tone: 'primary' | 'outline' | 'danger') =>
  `inline-flex h-[50px] min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-[18px] font-semibold text-[15px] transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
    {
      primary: 'bg-primary text-black',
      outline: 'border border-primary-dark text-primary-light',
      danger: 'bg-red-800 text-white',
    }[tone]
  }`;

const MobileSkeleton = () => (
  <div className={group} aria-hidden>
    {[50, 67, 84, 59].map((width) => (
      <div key={width} className="grid grid-cols-[40px_1fr_44px] gap-3 p-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#222325]" />
        <div className="flex flex-col gap-2">
          <div
            className="h-[13px] animate-pulse rounded-md bg-[#222325]"
            style={{ width: `${width}%` }}
          />
          <div className="h-[11px] w-[38%] animate-pulse rounded-md bg-[#222325]" />
        </div>
        <div className="h-[11px] animate-pulse rounded-md bg-[#222325]" />
      </div>
    ))}
  </div>
);

const MobileEmpty = (props: Parameters<typeof EmptyState>[0]) => (
  <EmptyState
    {...props}
    className="mx-1 my-6 rounded-3xl bg-background-dark px-5 py-8"
  />
);

const Header = ({ heading, sub }: { heading: string; sub?: string }) => (
  <div className="flex flex-col gap-1 px-4 pt-1.5 pb-3.5">
    <h1 className={title}>{heading}</h1>
    {sub ? <p className="text-muted text-sm">{sub}</p> : null}
  </div>
);

const SwipeRow = ({
  enabled,
  label,
  onDismiss,
  onOpen,
  children,
}: {
  enabled: boolean;
  label: string;
  onDismiss: () => void;
  onOpen: () => void;
  children: ReactNode;
}) => {
  const t = useTranslations('Admin');
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{
    x: number;
    y: number;
    base: number;
    lock: 'x' | 'y' | null;
  } | null>(null);
  const moved = useRef(false);
  const width = 104;

  const down = (event: PointerEvent) => {
    if (!enabled) return;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      base: offset,
      lock: null,
    };
    moved.current = false;
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (origin.lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      origin.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (origin.lock === 'x')
        event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (origin.lock !== 'x') return;
    moved.current = true;
    setDragging(true);
    setOffset(Math.max(-width - 24, Math.min(0, origin.base + dx)));
  };
  const up = () => {
    const origin = start.current;
    start.current = null;
    setDragging(false);
    if (origin?.lock === 'x')
      setOffset((value) => (value < -width / 2 ? -width : 0));
  };

  return (
    <div
      className={`relative overflow-hidden ${divider} before:left-[68px] before:z-[2]`}
    >
      {enabled ? (
        <button
          type="button"
          tabIndex={offset ? 0 : -1}
          aria-label={t('dismissSwipe', { name: label })}
          onClick={() => {
            setOffset(0);
            onDismiss();
          }}
          className={`absolute inset-y-0 right-0 flex w-[104px] flex-col items-center justify-center gap-[3px] bg-primary font-bold text-black text-xs ${offset || dragging ? 'visible' : 'invisible'}`}
        >
          <MdDone size={22} />
          {t('dismiss')}
        </button>
      ) : null}
      <button
        type="button"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          if (offset) {
            setOffset(0);
            return;
          }
          onOpen();
        }}
        style={{ transform: `translateX(${offset}px)` }}
        className={`relative z-[1] grid w-full touch-pan-y select-none grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 bg-background-dark py-3.5 pr-3.5 pl-4 text-left text-foreground active:bg-[#19191a] ${dragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}
      >
        {children}
      </button>
    </div>
  );
};

const avatar40 = '[&>*]:!h-10 [&>*]:!w-10';

const ReportsScreen = ({
  store,
  view,
  setView,
  openCase,
  dismissCase,
}: {
  store: ModerationStore;
  view: 'pending' | 'resolved';
  setView: (view: 'pending' | 'resolved') => void;
  openCase: (userId: string) => void;
  dismissCase: (group: ReportGroup) => void;
}) => {
  const t = useTranslations('Admin');
  const { relative } = useModFormat();
  const pending = store.pendingGroups;
  const resolved = groupReports(store.reports, 'resolved');
  const groups = view === 'pending' ? pending : resolved;
  const segment = (value: 'pending' | 'resolved', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === value}
      onClick={() => setView(value)}
      className={`h-9 truncate rounded-full px-1.5 font-semibold text-[13px] transition-colors ${view === value ? 'bg-primary-dark text-foreground' : 'text-muted'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <Header
        heading={t('tabReports')}
        sub={
          view === 'pending'
            ? pending.length
              ? t('casesNeedReview', { count: store.pendingCases })
              : t('nothingWaiting')
            : t('resolvedCases', { count: resolved.length })
        }
      />
      <div className="px-4 pb-3.5">
        <div
          role="tablist"
          className="grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-[3px] rounded-full bg-background-darker p-[3px]"
        >
          {segment('pending', t('pendingCount', { count: pending.length }))}
          {segment('resolved', t('resolved'))}
        </div>
      </div>
      <div className="px-3">
        {groups.length ? (
          <>
            <div className={group}>
              {groups.map((entry) => {
                const user = store.usersById.get(entry.userId);
                if (!user) return null;
                const snippet = entry.reports.find((report) => report.details);
                return (
                  <SwipeRow
                    key={entry.userId}
                    label={user.displayName}
                    enabled={view === 'pending'}
                    onOpen={() => openCase(entry.userId)}
                    onDismiss={() => dismissCase(entry)}
                  >
                    <span className={avatar40}>
                      <Avatar avatarUrl={user.avatarUrl} size="sm" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate font-semibold text-base">
                        {user.displayName}
                      </span>
                      <span className="truncate text-[13px] text-muted">
                        @{user.username}
                      </span>
                      {snippet ? (
                        <span className="mt-[3px] line-clamp-2 font-light text-[13.5px] text-soft leading-[1.4]">
                          “{snippet.details}”
                        </span>
                      ) : null}
                      <span className="mt-[5px] flex flex-wrap gap-1">
                        {[...new Set(entry.reports.map((r) => r.reason))].map(
                          (reason) => (
                            <ReasonBadge key={reason} reason={reason} />
                          ),
                        )}
                        {user.role ? (
                          <StaffChip role={user.role} small />
                        ) : null}
                        <RestrictionChips user={user} small />
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-2 pt-0.5">
                      <span className="whitespace-nowrap text-subtle text-xs">
                        {relative(entry.reports[0].createdAt)}
                      </span>
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 font-bold text-[11px] ${entry.reports.length > 1 ? 'bg-discord-blue text-white' : 'bg-background-darker text-primary-light'}`}
                      >
                        {t('reportCount', { count: entry.reports.length })}
                      </span>
                    </span>
                  </SwipeRow>
                );
              })}
            </div>
            {view === 'pending' ? (
              <p className="flex items-center justify-center gap-1.5 px-4 pt-3.5 text-[12.5px] text-subtle">
                <MdSwipeLeft size={16} />
                {t('swipeHint')}
              </p>
            ) : null}
          </>
        ) : (
          <MobileEmpty
            icon={view === 'pending' ? MdTaskAlt : MdInventory2}
            title={t(
              view === 'pending' ? 'queueClearTitle' : 'resolvedEmptyTitle',
            )}
            body={t(
              view === 'pending' ? 'queueClearBody' : 'resolvedEmptyBody',
            )}
          />
        )}
      </div>
    </>
  );
};

const UserRow = ({ user, onClick }: { user: ModUser; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-[13px] text-left text-foreground active:bg-white/[0.035] ${divider} before:left-[68px]`}
  >
    <span className={avatar40}>
      <Avatar avatarUrl={user.avatarUrl} size="sm" />
    </span>
    <span className="min-w-0">
      <span className="block truncate font-semibold text-base">
        {user.displayName}
      </span>
      <span className="block truncate text-[13px] text-muted">
        @{user.username}
      </span>
      {hasStatusChips(user) ? (
        <span className="mt-[5px] flex flex-wrap gap-1">
          {user.role ? <StaffChip role={user.role} small /> : null}
          <RestrictionChips user={user} small />
        </span>
      ) : null}
    </span>
    <MdChevronRight size={20} className="text-subtle" />
  </button>
);

const UsersScreen = ({
  store,
  users,
  openUser,
}: {
  store: ModerationStore;
  users: UsersQuery;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const [staffOpen, setStaffOpen] = useState(false);
  const [ipBlocksOpen, setIpBlocksOpen] = useState(false);
  const trimmed = users.query.trim();
  const list = (trimmed ? (users.results ?? []) : store.recentUserIds).flatMap(
    (id) => store.usersById.get(id) ?? [],
  );

  return (
    <>
      <Header heading={t('tabUsers')} />
      <div className="sticky top-0 z-[5] bg-background-main px-4 pb-2.5">
        <div className="flex h-12 items-center gap-2 rounded-full border border-[rgba(107,114,128,0.45)] bg-background-darker pr-2 pl-4 text-subtle focus-within:border-primary">
          <MdSearch size={20} aria-hidden />
          <input
            type="search"
            value={users.query}
            onChange={(event) => users.setQuery(event.target.value)}
            placeholder={t('searchPlaceholderShort')}
            aria-label={t('searchLabel')}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
          />
          {users.query ? (
            <button
              type="button"
              onClick={() => users.setQuery('')}
              aria-label={t('clearSearch')}
              className="flex h-8 w-8 items-center justify-center text-muted"
            >
              <MdClose size={18} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="px-3">
        {store.meRole === 'owner' && !trimmed ? (
          <div className={`${group} mb-1.5`}>
            <SheetRow
              icon={MdGroup}
              label={t('manageStaff')}
              description={t('staffCount', { count: store.staff.length })}
              chevron
              onClick={() => setStaffOpen(true)}
            />
            <SheetRow
              icon={MdBlock}
              label={t('manageIpBlocks')}
              description={t('ipBlocksHint')}
              chevron
              onClick={() => setIpBlocksOpen(true)}
            />
          </div>
        ) : null}
        {users.searching ? (
          <MobileSkeleton />
        ) : users.failed ? (
          <p role="alert" className="px-1 py-4 text-red-400 text-sm">
            {t('searchFailed')}
          </p>
        ) : trimmed && users.results && !users.results.length ? (
          <MobileEmpty
            icon={MdPersonSearch}
            title={t('noUsersTitle')}
            body={t('noUsersBody', { query: trimmed })}
          />
        ) : (
          <>
            <p className="px-1 pt-2 pb-2 font-semibold text-subtle text-xs uppercase tracking-[0.06em]">
              {trimmed
                ? t('resultsCount', { count: list.length })
                : t('recentlyActioned')}
            </p>
            <div className={group}>
              {list.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onClick={() => openUser(user.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <Sheet
        open={staffOpen}
        onOpenChange={setStaffOpen}
        title={t('staffTitle')}
      >
        <StaffPanel store={store} mobile />
      </Sheet>
      <Sheet
        open={ipBlocksOpen}
        onOpenChange={setIpBlocksOpen}
        title={t('manageIpBlocks')}
      >
        <IpBlocksPanel store={store} mobile />
      </Sheet>
    </>
  );
};

const chipButton = (on: boolean) =>
  `inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-[13px] font-medium text-[13px] active:scale-[0.97] ${
    on
      ? 'border-primary-dark bg-primary-darker text-primary-light'
      : 'border-[rgba(107,114,128,0.5)] text-gray-200'
  }`;

const LogScreen = ({
  store,
  pages,
  openUser,
}: {
  store: ModerationStore;
  pages: ActivityPages<ModLogEntry>;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const { time } = useModFormat();
  const label = useLogLabel();
  const [sheet, setSheet] = useState<'action' | 'staff' | null>(null);
  const rows = pages.rows ?? [];
  const { action = '', staffId: staff = '' } = pages.filters;
  const staffName = (id?: string) =>
    store.usersById.get(id ?? '')?.displayName ?? t('unknownUser');

  return (
    <>
      <Header
        heading={t('tabLog')}
        sub={t('actionsCount', { count: rows.length })}
      />
      <div className="px-4 pb-3">
        <ActivityDayBar pages={pages} />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setSheet('action')}
          className={chipButton(Boolean(action))}
        >
          <MdTune size={18} />
          {action ? t(`action_${action}`) : t('allActions')}
          <MdExpandMore size={18} />
        </button>
        <button
          type="button"
          onClick={() => setSheet('staff')}
          className={chipButton(Boolean(staff))}
        >
          <MdAdminPanelSettings size={18} />
          {staff ? staffName(staff) : t('allStaff')}
          <MdExpandMore size={18} />
        </button>
        {pages.filtered ? (
          <button
            type="button"
            onClick={pages.clearFilters}
            className={chipButton(false)}
          >
            <MdClose size={16} />
            {t('clear')}
          </button>
        ) : null}
      </div>
      <div className="px-3">
        {!pages.rows ? (
          <ActivityStatus pages={pages} />
        ) : rows.length ? (
          <div className={group}>
            {rows.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => entry.userId && openUser(entry.userId)}
                className={`grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-[13px] text-left text-foreground active:bg-white/[0.035] ${divider} before:left-[38px]`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full ${ACTION_TONE[entry.action]}`}
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-[15px]">
                    {label(entry)}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {staffName(entry.userId)} ·{' '}
                    {t('byStaff', { name: staffName(entry.staffId) })}
                  </span>
                  {entry.note ? (
                    <span className="mt-1.5 block font-light text-[13.5px] text-soft leading-[1.4]">
                      {entry.note}
                    </span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap pt-0.5 text-[12.5px] text-subtle">
                  {time(new Date(entry.createdAt))}
                </span>
              </button>
            ))}
          </div>
        ) : pages.filtered ? (
          <MobileEmpty
            icon={MdFilterAltOff}
            title={t('noMatchTitle')}
            body={t('noMatchBody')}
          >
            <button
              type="button"
              onClick={pages.clearFilters}
              className="h-10 rounded-full border border-primary-dark px-3.5 font-semibold text-primary-light text-sm"
            >
              {t('clearFilters')}
            </button>
          </MobileEmpty>
        ) : (
          <MobileEmpty
            icon={MdHistory}
            title={t('logEmptyTitle')}
            body={t('logEmptyBody')}
          />
        )}
        <ActivityPager pages={pages} />
      </div>
      <ActionSheet
        open={sheet === 'action'}
        onOpenChange={(open) => setSheet(open ? 'action' : null)}
        title={t('actionType')}
        radio
        items={[
          {
            key: 'all',
            label: t('allActions'),
            selected: !action,
            onSelect: () => pages.setFilter('action', ''),
          },
          ...LOG_ACTIONS.map((value) => ({
            key: value,
            label: t(`action_${value}`),
            selected: action === value,
            onSelect: () => pages.setFilter('action', value),
          })),
        ]}
      />
      <ActionSheet
        open={sheet === 'staff'}
        onOpenChange={(open) => setSheet(open ? 'staff' : null)}
        title={t('staffMember')}
        radio
        items={[
          {
            key: 'all',
            label: t('allStaff'),
            selected: !staff,
            onSelect: () => pages.setFilter('staffId', ''),
          },
          ...store.staff.map((id) => ({
            key: id,
            label: staffName(id),
            selected: staff === id,
            onSelect: () => pages.setFilter('staffId', id),
          })),
        ]}
      />
    </>
  );
};

const FlagRow = ({
  row,
  range,
  store,
  openUser,
}: {
  row: ModSuspicious;
  range: ActivityRange;
  store: ModerationStore;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const { relative } = useModFormat();
  const eventLabel = useEventLabel();
  const [open, setOpen] = useState(false);
  const user = store.usersById.get(row.userId ?? '');
  const grouped = row.userId !== undefined && row.count > 1;
  const eventsId = `suspicious-events-${row.id}`;

  return (
    <>
      <button
        type="button"
        disabled={!user && !grouped}
        aria-expanded={grouped ? open : undefined}
        aria-controls={grouped ? eventsId : undefined}
        onClick={() => (grouped ? setOpen(!open) : user && openUser(user.id))}
        className={`grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 py-3.5 pr-3 pl-4 text-left text-foreground active:bg-white/[0.035] ${divider} before:left-[50px]`}
      >
        <MdOutlinedFlag size={20} className="mt-px text-discord-yellow" />
        <span className="min-w-0">
          <span className="block font-medium text-[15px]">
            {eventLabel(row.action)}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {t('eventReason')}
          </span>
          {user ? (
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-200">
              <Avatar avatarUrl={user.avatarUrl} size="sm" />
              {user.displayName}
              <RestrictionChips user={user} small />
            </span>
          ) : null}
          <span className="mt-1.5 block font-mono text-[13px] text-muted">
            {row.ip ?? '-'} · {relative(row.createdAt)}
          </span>
          {grouped ? (
            <span className="mt-1.5 block font-medium text-[13px] text-primary-light">
              {t('flaggedEvents', { count: row.count })}
            </span>
          ) : null}
        </span>
        {grouped ? (
          <MdExpandMore
            size={20}
            className={`mt-0.5 text-subtle ${open ? 'rotate-180' : ''}`}
          />
        ) : (
          <MdChevronRight size={20} className="mt-0.5 text-subtle" />
        )}
      </button>
      {grouped && open && row.userId ? (
        <div className="bg-background-darker">
          <SuspiciousEvents
            id={eventsId}
            store={store}
            userId={row.userId}
            range={range}
          />
          {user ? (
            <button
              type="button"
              onClick={() => openUser(user.id)}
              className="px-5 pb-3.5 font-medium text-[13px] text-primary-light"
            >
              {t('viewUser')}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

const FlagsScreen = ({
  store,
  pages,
  openUser,
}: {
  store: ModerationStore;
  pages: ActivityPages<ModSuspicious>;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');

  return (
    <>
      <Header heading={t('tabSuspicious')} sub={t('suspiciousIntro')} />
      <div className="px-4 pb-3">
        <ActivityDayBar pages={pages} />
      </div>
      <div className="px-3">
        {!pages.rows ? (
          <ActivityStatus pages={pages} />
        ) : pages.rows.length ? (
          <div className={group}>
            {pages.rows.map((row) => (
              <FlagRow
                key={row.id}
                row={row}
                range={pages.range}
                store={store}
                openUser={openUser}
              />
            ))}
          </div>
        ) : (
          <MobileEmpty
            icon={MdPolicy}
            title={t('suspiciousEmptyTitle')}
            body={t('suspiciousEmptyBody')}
          />
        )}
        <ActivityPager pages={pages} />
      </div>
    </>
  );
};

const Dock = ({
  tab,
  setTab,
  pending,
  seeding,
}: {
  tab: ModTab;
  setTab: (tab: ModTab) => void;
  pending: number;
  seeding: boolean;
}) => {
  const t = useTranslations('Admin');
  const items = useRef<Partial<Record<ModTab, HTMLElement | null>>>({});
  const previous = useRef<{ left: number; width: number } | null>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    stretch: boolean;
  } | null>(null);
  const [tip, setTip] = useState<ModTab | null>(null);
  const labels: Record<ModTab, string> = {
    reports: t('tabReports'),
    users: t('tabUsers'),
    log: t('tabLog'),
    suspicious: t('tabSuspicious'),
    dummy: t('tabDummy'),
  };

  useLayoutEffect(() => {
    const element = items.current[tab];
    if (!element) return;
    const to = { left: element.offsetLeft, width: element.offsetWidth };
    const from = previous.current;
    previous.current = to;
    if (!from || from.left === to.left) {
      setIndicator({ ...to, stretch: false });
      return;
    }
    setIndicator({
      left: Math.min(from.left, to.left),
      width:
        Math.max(from.left + from.width, to.left + to.width) -
        Math.min(from.left, to.left),
      stretch: true,
    });
    setTip(tab);
    const settle = setTimeout(
      () => setIndicator({ ...to, stretch: false }),
      170,
    );
    const hide = setTimeout(
      () => setTip((current) => (current === tab ? null : current)),
      1300,
    );
    return () => {
      clearTimeout(settle);
      clearTimeout(hide);
    };
  }, [tab]);

  const button = (id: ModTab, Icon: IconType, badge?: number) => (
    <button
      ref={(element) => {
        items.current[id] = element;
      }}
      type="button"
      onClick={() => setTab(id)}
      aria-label={labels[id]}
      aria-current={tab === id ? 'page' : undefined}
      className={`relative z-[2] flex h-12 w-12 items-center justify-center rounded-full transition-[color,transform] duration-300 active:scale-[0.92] ${tab === id ? 'text-on-primary' : 'text-muted'}`}
    >
      <Icon size={24} />
      {badge ? (
        <span
          className={`absolute top-1.5 right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-discord-blue px-[5px] font-bold text-[10px] text-white ring-2 ${tab === id ? 'ring-primary' : 'ring-background-darker'}`}
        >
          {badge}
        </span>
      ) : null}
      <span
        aria-hidden
        className={`-translate-x-1/2 pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-[5px] font-bold text-on-primary text-xs transition-[opacity,transform] duration-300 ${tip === id ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'}`}
      >
        {labels[id]}
      </span>
    </button>
  );
  const surface =
    'flex items-center gap-1 rounded-full bg-background-darker p-[5px] shadow-[0_0_0_1px_var(--color-line-strong),0_14px_30px_-6px_rgba(0,0,0,0.7)]';

  return (
    <nav
      aria-label={t('dockLabel')}
      className="-translate-x-1/2 fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-40 flex items-center gap-3 font-figtree"
    >
      {indicator ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute top-[5px] z-[1] h-12 rounded-full bg-primary ease-[cubic-bezier(0.16,1,0.3,1)] ${indicator.stretch ? 'scale-y-[0.82] transition-[left,width,transform] duration-[170ms]' : 'transition-[left,width,transform] duration-[340ms]'}`}
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      <div className={surface}>
        {button('reports', MdOutlinedFlag, pending)}
      </div>
      <div className={surface}>
        {button('users', MdPersonSearch)}
        {button('log', MdHistory)}
        {button('suspicious', MdPolicy)}
        {seeding ? button('dummy', MdStorage) : null}
      </div>
    </nav>
  );
};

const DiscordIdRow = ({ user }: { user: ModUser }) => {
  const t = useTranslations('Admin');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(user.discordId).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="flex h-11 w-full items-center justify-between gap-2.5 rounded-xl bg-background-darker pr-1.5 pl-3.5 text-muted"
    >
      <span className="font-semibold text-subtle text-xs">
        {t('discordId')}
      </span>
      <span className="flex items-center gap-1.5 text-gray-200">
        <span className="font-mono text-xs">{user.discordId}</span>
        <span
          className={`flex w-8 justify-center ${copied ? 'text-discord-blue-light' : ''}`}
        >
          {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
        </span>
      </span>
    </button>
  );
};

const StatusChips = ({
  user,
  showSupporter,
}: {
  user: ModUser;
  showSupporter: boolean;
}) =>
  user.role ||
  hasStatusChips(user) ||
  user.warnings > 0 ||
  (showSupporter && hasGrant(user)) ? (
    <div className="flex flex-wrap gap-1.5 [&>span]:h-[26px] [&>span]:px-2.5 [&>span]:text-xs">
      <UserChips user={user} showSupporter={showSupporter} />
    </div>
  ) : null;

const Hero = ({
  user,
  showSupporter,
}: {
  user: ModUser;
  showSupporter: boolean;
}) => (
  <div className="mx-4 mt-0.5 flex flex-col gap-3.5 rounded-3xl bg-background-dark p-[18px]">
    <div className="flex min-w-0 items-center gap-3.5">
      <Avatar avatarUrl={user.avatarUrl} size="md" />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <h2 className="font-bold text-[21px] leading-tight">
          {user.displayName}
        </h2>
        <span className="text-muted text-sm">@{user.username}</span>
      </div>
    </div>
    <StatusChips user={user} showSupporter={showSupporter} />
    <DiscordIdRow user={user} />
  </div>
);

const SheetUserInfo = ({
  user,
  showSupporter,
}: {
  user: ModUser;
  showSupporter: boolean;
}) => (
  <div className="flex flex-col gap-3">
    <span className="text-muted text-sm">@{user.username}</span>
    <StatusChips user={user} showSupporter={showSupporter} />
    <DiscordIdRow user={user} />
  </div>
);

const ProfileFacts = ({
  user,
  showSupporter,
}: {
  user: ModUser;
  showSupporter: boolean;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const labels = useLanguageLabels();
  const fact = (key: string, value: ReactNode) => (
    <div className="relative flex items-baseline justify-between gap-4 px-4 py-[13px] text-[15px] before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-[rgba(107,114,128,0.22)]">
      <span className="shrink-0 text-muted">{t(key)}</span>
      <span className="min-w-0 text-right text-foreground">{value}</span>
    </div>
  );
  return (
    <div className={group}>
      <p className="break-words px-4 py-3.5 font-light text-[15px] text-soft leading-normal">
        {user.profile ? (
          user.profile.bio || (
            <span className="text-[13px] text-subtle">{t('noBio')}</span>
          )
        ) : (
          <span className="text-[13px] text-subtle">{t('noProfile')}</span>
        )}
      </p>
      {user.profile ? (
        <>
          {fact(
            'factVisibility',
            <>
              {t(
                user.profile.isPublic
                  ? 'visibilityPublic'
                  : 'visibilityUnlisted',
              )}
              {user.hidden ? (
                <span className="text-red-300"> · {t('hiddenByStaff')}</span>
              ) : null}
            </>,
          )}
          {fact('factSpeaks', labels.language(user.profile.primaryLanguage))}
          {fact(
            'factLearning',
            user.profile.targetLanguages.length ? (
              user.profile.targetLanguages
                .map(
                  (target) =>
                    `${labels.language(target.language)} (${labels.level(target.level)})`,
                )
                .join(', ')
            ) : (
              <span className="text-muted text-xs">{t('noneListed')}</span>
            ),
          )}
        </>
      ) : null}
      {fact('factJoined', date(user.joinedAt))}
      {showSupporter
        ? fact(
            'factSupporter',
            hasGrant(user) && user.premium.grantedUntil ? (
              t('factSupporterUntil', { date: date(user.premium.grantedUntil) })
            ) : (
              <span className="text-muted">{t('factSupporterNone')}</span>
            ),
          )
        : null}
    </div>
  );
};

const Note = ({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) => {
  const t = useTranslations('Admin');
  return (
    <div className="relative">
      <textarea
        maxLength={500}
        value={value}
        placeholder={placeholder ?? t('notePlaceholder')}
        aria-label={label ?? t('note')}
        onChange={(event) => onChange(event.target.value)}
        className="block min-h-20 w-full resize-none rounded-[14px] border border-white/[0.07] bg-background-darker px-3.5 pt-3 pb-[26px] font-light text-[15px] text-foreground leading-[1.45] outline-none transition-colors placeholder:text-subtle focus:border-primary"
      />
      <span className="pointer-events-none absolute right-3 bottom-2 text-subtle text-xs">
        {value.length}/500
      </span>
    </div>
  );
};

const useRun = (
  store: ModerationStore,
  user: ModUser,
  reportIds: string[],
  onDone: (action: ModAction, days?: number) => void,
) => {
  const [busy, setBusy] = useState<ModAction | null>(null);
  const [failed, setFailed] = useState<{
    action: ModAction;
    days?: number;
    note: string;
    category?: WarningCategory;
    reauth: boolean;
  } | null>(null);
  const run = async (
    action: ModAction,
    note: string,
    days?: number,
    category?: WarningCategory,
  ) => {
    if (busy) return false;
    setBusy(action);
    setFailed(null);
    try {
      await store.act({
        userId: user.id,
        action,
        reportIds,
        note,
        days,
        category,
      });
      onDone(action, days);
      return true;
    } catch (error) {
      setFailed({
        action,
        days,
        note,
        category,
        reauth: isReauthError(error),
      });
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, failed, run, reset: () => setFailed(null) };
};

export type SheetKind =
  | 'act'
  | 'warn'
  | 'suspend'
  | 'ban'
  | 'grant'
  | ConfirmAction;

const ConfirmActionSheet = ({
  action,
  user,
  count,
  note,
  onNote,
  onCancel,
  onConfirm,
  actions,
}: {
  action: ConfirmAction;
  user: ModUser;
  count: number;
  note: string;
  onNote: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  actions: ReturnType<typeof useRun>;
}) => {
  const t = useTranslations('Admin');
  const confirmation = useActionConfirmation(action, user, count);
  return (
    <Sheet
      open
      onOpenChange={(next) => (next ? null : onCancel())}
      title={confirmation.title}
      footer={
        <>
          <button
            type="button"
            disabled={actions.busy !== null}
            onClick={onCancel}
            className={mobileButton('outline')}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={actions.busy !== null}
            onClick={onConfirm}
            className={mobileButton(
              action === 'hide_profile' ? 'danger' : 'primary',
            )}
          >
            {actions.busy ? <Spinner className="h-4 w-4" /> : null}
            {actions.busy ? t('working') : confirmation.label}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="text-[15px] text-muted leading-normal">
          {confirmation.body}
        </p>
        <Note value={note} onChange={onNote} />
        {actions.failed ? (
          <ActionError
            mobile
            reauth={actions.failed.reauth}
            onRetry={onConfirm}
          />
        ) : null}
      </div>
    </Sheet>
  );
};

export const ActionSheets = ({
  store,
  user,
  reportIds,
  onDone,
  sheet,
  setSheet,
}: {
  store: ModerationStore;
  user: ModUser;
  reportIds: string[];
  onDone: (action: ModAction, days?: number) => void;
  sheet: SheetKind | null;
  setSheet: (sheet: SheetKind | null) => void;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const [note, setNote] = useState('');
  const grant = useGrant(store, user, () => setSheet(null));
  const actions = useRun(store, user, reportIds, onDone);
  const suspend = useSuspendDays(sheet === 'suspend');
  const warn = useWarnMessage(sheet === 'warn');
  const suspended = isSuspended(user);
  const protection = protectionOf(store, user);
  const protectedAccount = protection !== null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset errors only when the sheet opens
  useEffect(() => {
    setNote('');
    if (sheet !== 'act' && sheet !== 'dismiss') return;
    actions.reset();
    grant.clearError();
  }, [sheet]);
  const open = (next: SheetKind) => {
    setNote('');
    setSheet(next);
  };
  const run = async (
    action: ModAction,
    days?: number,
    text = '',
    category?: WarningCategory,
  ) => {
    if (await actions.run(action, text, days, category)) {
      setNote('');
      setSheet(null);
    }
  };
  const row = (
    action: ModAction,
    icon: IconType,
    label: string,
    description: string,
    danger = false,
    onClick: () => void = () => run(action),
  ) => (
    <SheetRow
      key={action}
      icon={icon}
      label={label}
      description={description}
      danger={danger}
      disabled={actions.busy !== null && actions.busy !== action}
      chevron={
        action === 'warn' ||
        action === 'suspend' ||
        action === 'ban' ||
        action === 'hide_profile' ||
        action === 'unhide_profile'
      }
      onClick={onClick}
    >
      {actions.busy === action ? (
        <span className="ml-auto text-muted">
          <Spinner className="h-4 w-4" />
        </span>
      ) : null}
    </SheetRow>
  );

  return (
    <>
      <Sheet
        open={sheet === 'act'}
        onOpenChange={(next) => setSheet(next ? 'act' : null)}
        title={user.displayName}
      >
        <div className="flex flex-col gap-3.5">
          <SheetUserInfo user={user} showSupporter={store.meRole === 'owner'} />
          {protectedAccount ? (
            <ProtectedNotice kind={protection} large />
          ) : (
            <>
              {actions.failed ? (
                <ActionError
                  mobile
                  reauth={actions.failed.reauth}
                  onRetry={() =>
                    run(
                      actions.failed?.action ?? 'warn',
                      actions.failed?.days,
                      actions.failed?.note,
                      actions.failed?.category,
                    )
                  }
                />
              ) : null}
              <SheetGroup>
                {row('warn', MdCampaign, t('warn'), t('warnDesc'), true, () =>
                  open('warn'),
                )}
                {user.hidden
                  ? row(
                      'unhide_profile',
                      MdVisibility,
                      t('unhideProfile'),
                      t('unhideDesc'),
                      false,
                      () => open('unhide_profile'),
                    )
                  : row(
                      'hide_profile',
                      MdVisibilityOff,
                      t('hideProfile'),
                      t('hideDesc'),
                      true,
                      () => open('hide_profile'),
                    )}
                {suspended && user.suspendedUntil
                  ? row(
                      'unsuspend',
                      MdLockOpen,
                      t('liftSuspension'),
                      t('liftDesc', { date: date(user.suspendedUntil) }),
                    )
                  : row(
                      'suspend',
                      MdSchedule,
                      t('suspend'),
                      t('suspendDesc'),
                      true,
                      () => open('suspend'),
                    )}
                {store.meRole !== 'owner'
                  ? null
                  : user.bannedAt
                    ? row(
                        'unban',
                        MdSettingsBackupRestore,
                        t('unban'),
                        t('unbanDesc'),
                      )
                    : row('ban', MdGavel, t('ban'), t('banDesc'), true, () =>
                        open('ban'),
                      )}
              </SheetGroup>
            </>
          )}
          {store.meRole === 'owner' ? (
            <SheetGroup>
              <SheetRow
                icon={MdWorkspacePremium}
                label={t(grant.granted ? 'replacePremium' : 'grantPremium')}
                description={
                  grant.granted && user.premium.grantedUntil
                    ? t('extendDesc', { date: date(user.premium.grantedUntil) })
                    : t('grantDesc')
                }
                chevron
                onClick={() => open('grant')}
              />
              {grant.granted ? (
                <SheetRow
                  icon={MdPersonRemove}
                  label={t('revokeSupporter')}
                  description={t('revokeDesc')}
                  danger
                  disabled={grant.busy !== null}
                  onClick={grant.revoke}
                >
                  {grant.busy === 'revoke' ? (
                    <span className="ml-auto text-muted">
                      <Spinner className="h-4 w-4" />
                    </span>
                  ) : null}
                </SheetRow>
              ) : null}
            </SheetGroup>
          ) : null}
          {grant.error && sheet === 'act' ? (
            <ActionError
              mobile
              reauth={grant.error === 'reauth'}
              onRetry={grant.revoke}
            />
          ) : null}
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'grant'}
        onOpenChange={(next) => setSheet(next ? 'grant' : 'act')}
        title={t(grant.granted ? 'replacePremium' : 'grantPremium')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSheet('act')}
              className={mobileButton('outline')}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!grant.valid || grant.busy !== null}
              onClick={grant.grant}
              className={mobileButton('primary')}
            >
              {grant.busy === 'grant' ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <MdWorkspacePremium size={20} />
              )}
              {grant.busy === 'grant'
                ? t('working')
                : t(grant.granted ? 'replacePremium' : 'grantPremium')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[15px] text-muted leading-normal">
            {t(grant.granted ? 'extendBody' : 'grantBody', {
              username: user.username,
            })}
          </p>
          <GrantFields grant={grant} mobile />
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'warn'}
        onOpenChange={(next) => setSheet(next ? 'warn' : 'act')}
        title={t('warnTitle', { name: user.displayName })}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSheet('act')}
              className={mobileButton('outline')}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!warn.valid || actions.busy !== null}
              onClick={() =>
                run('warn', undefined, warn.message, warn.category)
              }
              className={mobileButton('primary')}
            >
              {actions.busy ? <Spinner className="h-4 w-4" /> : null}
              {actions.busy ? t('working') : t('warnSend')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[15px] text-muted leading-normal">
            {t('warnBody')}
          </p>
          <WarnPresets choice={warn.choice} onPick={warn.pick} mobile />
          <Note
            value={warn.text}
            onChange={warn.setText}
            label={t('warnReason')}
            placeholder={t('warnPlaceholder')}
          />
          <WarnPreview user={user} message={warn.message} mobile />
          {actions.failed ? (
            <ActionError
              mobile
              reauth={actions.failed.reauth}
              onRetry={() =>
                run(
                  'warn',
                  undefined,
                  actions.failed?.note,
                  actions.failed?.category,
                )
              }
            />
          ) : null}
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'suspend'}
        onOpenChange={(next) => setSheet(next ? 'suspend' : 'act')}
        title={t('suspendTitle', { name: user.displayName })}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSheet('act')}
              className={mobileButton('outline')}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!suspend.valid || actions.busy !== null}
              onClick={() => run('suspend', suspend.days, note)}
              className={mobileButton('danger')}
            >
              {actions.busy ? <Spinner className="h-4 w-4" /> : null}
              {actions.busy
                ? t('working')
                : suspend.valid
                  ? t('suspendConfirmShort', { count: suspend.days })
                  : t('suspendConfirmInvalid')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[15px] text-muted leading-normal">
            {t('suspendBody', { username: user.username })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[...DURATION_PRESETS, 'custom' as const].map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={suspend.preset === preset}
                onClick={() => suspend.setPreset(preset)}
                className={`flex h-12 items-center justify-center rounded-xl border font-medium text-sm ${suspend.preset === preset ? 'border-primary bg-primary-darker font-semibold text-primary-light' : 'border-[rgba(107,114,128,0.5)] text-gray-200'}`}
              >
                {preset === 'custom'
                  ? t('custom')
                  : t('days', { count: preset })}
              </button>
            ))}
          </div>
          {suspend.preset === 'custom' ? (
            <div className="flex items-center gap-2.5">
              <NumberStepper
                value={suspend.custom}
                onChange={suspend.setCustom}
                min={1}
                max={90}
                size="lg"
                label={t('daysUnit')}
                decrementLabel={t('fewerDays')}
                incrementLabel={t('moreDays')}
                error={!suspend.valid}
                className="flex-1"
              />
              <span className="text-muted text-sm">{t('daysUnit')}</span>
            </div>
          ) : null}
          {suspend.until ? (
            <span className="text-[13.5px] text-muted">
              <SuspendEnds until={suspend.until} />
            </span>
          ) : (
            <span className="text-[13px] text-red-400">{t('daysInvalid')}</span>
          )}
          <Note value={note} onChange={setNote} />
          {actions.failed ? (
            <ActionError
              mobile
              reauth={actions.failed.reauth}
              onRetry={() => run('suspend', actions.failed?.days, note)}
            />
          ) : null}
        </div>
      </Sheet>
      <Sheet
        open={sheet === 'ban'}
        onOpenChange={(next) => setSheet(next ? 'ban' : 'act')}
        title={t('banTitle', { name: user.displayName })}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSheet('act')}
              className={mobileButton('outline')}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={actions.busy !== null}
              onClick={() => run('ban', undefined, note)}
              className={mobileButton('danger')}
            >
              {actions.busy ? <Spinner className="h-4 w-4" /> : null}
              {actions.busy
                ? t('working')
                : t('banConfirm', { name: user.displayName })}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[15px] text-muted leading-normal">
            {t.rich('banBody', {
              username: user.username,
              b: (chunks) => (
                <b className="font-semibold text-foreground">{chunks}</b>
              ),
            })}
          </p>
          <Note value={note} onChange={setNote} />
          {actions.failed ? (
            <ActionError
              mobile
              reauth={actions.failed.reauth}
              onRetry={() => run('ban', undefined, note)}
            />
          ) : null}
        </div>
      </Sheet>
      {sheet === 'hide_profile' ||
      sheet === 'unhide_profile' ||
      sheet === 'dismiss' ? (
        <ConfirmActionSheet
          action={sheet}
          user={user}
          count={reportIds.length}
          note={note}
          onNote={setNote}
          onCancel={() => {
            setNote('');
            actions.reset();
            setSheet(sheet === 'dismiss' ? null : 'act');
          }}
          onConfirm={() => run(sheet, undefined, note)}
          actions={actions}
        />
      ) : null}
    </>
  );
};

const CaseFooter = ({
  store,
  user,
  reportIds,
  onDone,
}: {
  store: ModerationStore;
  user: ModUser;
  reportIds: string[];
  onDone: (action: ModAction, days?: number) => void;
}) => {
  const t = useTranslations('Admin');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const protection = protectionOf(store, user);
  const protectedAccount = protection !== null;

  return (
    <>
      <div className="flex gap-2.5">
        {reportIds.length ? (
          <button
            type="button"
            onClick={() => setSheet('dismiss')}
            className={mobileButton(protectedAccount ? 'primary' : 'outline')}
          >
            {reportIds.length > 1
              ? t('dismissCount', { count: reportIds.length })
              : t('dismiss')}
          </button>
        ) : null}
        {protectedAccount ? null : (
          <button
            type="button"
            onClick={() => setSheet('act')}
            className={mobileButton('primary')}
          >
            <MdGavel size={20} />
            {t('takeAction')}
          </button>
        )}
      </div>
      <ActionSheets
        store={store}
        user={user}
        reportIds={reportIds}
        onDone={onDone}
        sheet={sheet}
        setSheet={setSheet}
      />
    </>
  );
};

const CasePage = ({
  store,
  page,
  closing,
  onBack,
  onOpenUser,
  notify,
}: {
  store: ModerationStore;
  page: Page;
  closing: boolean;
  onBack: () => void;
  onOpenUser: (userId: string) => void;
  notify: Notify;
}) => {
  const t = useTranslations('Admin');
  const user = store.usersById.get(page.userId);
  if (!user) return null;
  const isCase = page.kind === 'case';
  const all = store.userReports(user.id);
  const reports: ModReport[] = isCase
    ? all.filter(
        (report) => (report.status === 'pending') === (page.view === 'pending'),
      )
    : all;
  const reportIds =
    isCase && page.view === 'pending' ? reports.map((report) => report.id) : [];
  const history = store.userLog(user.id);
  const protection = protectionOf(store, user);
  const protectedAccount = protection !== null;

  const reportsSection = (
    <section key="reports" className="mx-4 mt-6 flex flex-col gap-2">
      <h3 className={caption}>
        <span>
          {t(isCase ? 'sectionReports' : 'sectionReportsAgainst')}{' '}
          <span className="text-muted">{reports.length}</span>
        </span>
      </h3>
      {reports.length ? (
        <ReportStack
          store={store}
          reports={reports}
          onOpenUser={onOpenUser}
          mobile
        />
      ) : (
        <p className="rounded-[20px] bg-background-dark px-4 py-3.5 text-[13px] text-subtle">
          {t('noReports')}
        </p>
      )}
      {all.length > reports.length ? (
        <button
          type="button"
          onClick={() => onOpenUser(user.id)}
          className="flex min-h-12 w-full items-center justify-between rounded-[20px] bg-background-dark pr-3 pl-4 font-semibold text-primary-light text-sm"
        >
          {t('otherReports', { count: all.length - reports.length })}
          <MdChevronRight size={20} className="text-subtle" />
        </button>
      ) : null}
    </section>
  );
  const profileSection = (
    <section key="profile" className="mx-4 mt-6 flex flex-col gap-2">
      <h3 className={caption}>{t('sectionProfile')}</h3>
      <ProfileFacts user={user} showSupporter={store.meRole === 'owner'} />
    </section>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-background-main font-figtree text-foreground ${closing ? 'motion-safe:animate-[pushOut_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]' : 'motion-safe:animate-[pushIn_0.38s_cubic-bezier(0.16,1,0.3,1)]'}`}
    >
      <div className="h-[env(safe-area-inset-top)] shrink-0" />
      <div className="relative flex min-h-12 items-center px-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center pr-2.5 pl-1 font-semibold text-[15px] text-primary"
        >
          <MdChevronLeft size={26} aria-hidden />
          {t('back')}
        </button>
        <h1 className="-translate-x-1/2 pointer-events-none absolute left-1/2 font-bold text-base">
          {t(
            isCase
              ? page.view === 'pending'
                ? 'casePage'
                : 'resolvedCasePage'
              : 'userPage',
          )}
        </h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-width:none]">
        <Hero user={user} showSupporter={store.meRole === 'owner'} />
        {protectedAccount ? (
          <div className="mx-4 mt-3">
            <ProtectedNotice kind={protection} large />
          </div>
        ) : null}
        {isCase
          ? [reportsSection, profileSection]
          : [profileSection, reportsSection]}
        <section className="mx-4 mt-6 flex flex-col gap-2">
          <h3 className={caption}>
            <span>
              {t('sectionHistory')}{' '}
              <span className="text-muted">{history.length}</span>
            </span>
          </h3>
          <HistoryList store={store} entries={history} mobile />
        </section>
      </div>
      {protectedAccount && !reportIds.length ? null : (
        <div className="flex shrink-0 flex-col gap-2.5 border-[rgba(107,114,128,0.22)] border-t bg-background-main px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <CaseFooter
            key={user.id + page.kind}
            store={store}
            user={user}
            reportIds={reportIds}
            onDone={(action, days) => {
              notify(user, action, {
                days,
                reports: reportIds.length,
                resolved: reportIds.length > 0,
              });
              if (isCase && page.view === 'pending') onBack();
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ModerationMobile = ({
  store,
  tab,
  setTab,
  users,
  notify,
  seed,
}: {
  store: ModerationStore;
  tab: ModTab;
  setTab: (tab: ModTab) => void;
  users: UsersQuery;
  notify: Notify;
  seed: SeedStatus | null;
}) => {
  const [view, setView] = useState<'pending' | 'resolved'>('pending');
  const [page, setPage] = useState<Page | null>(null);
  const [closing, setClosing] = useState(false);
  const [dismissEntry, setDismissEntry] = useState<ReportGroup | null>(null);
  const logPages = useActivityPages(store.loadActivityLog, tab === 'log');
  const flagPages = useActivityPages(
    store.loadSuspicious,
    tab === 'suspicious',
  );

  const back = () => {
    setClosing(true);
    setTimeout(() => {
      setPage(null);
      setClosing(false);
    }, 280);
  };
  const openUser = (userId: string) => setPage({ kind: 'user', userId, view });
  const dismissUser = dismissEntry
    ? store.usersById.get(dismissEntry.userId)
    : null;

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+96px)] font-figtree text-foreground">
      {tab === 'reports' ? (
        <ReportsScreen
          store={store}
          view={view}
          setView={setView}
          openCase={(userId) => setPage({ kind: 'case', userId, view })}
          dismissCase={setDismissEntry}
        />
      ) : null}
      {tab === 'users' ? (
        <UsersScreen store={store} users={users} openUser={openUser} />
      ) : null}
      {tab === 'log' ? (
        <LogScreen store={store} pages={logPages} openUser={openUser} />
      ) : null}
      {tab === 'suspicious' ? (
        <FlagsScreen store={store} pages={flagPages} openUser={openUser} />
      ) : null}
      {tab === 'dummy' && seed ? (
        <div className="pt-[calc(env(safe-area-inset-top)+16px)]">
          <SeedPanel initial={seed} mobile />
        </div>
      ) : null}
      <Dock
        tab={tab}
        setTab={(next) => {
          setTab(next);
          setPage(null);
        }}
        pending={store.pendingCases}
        seeding={Boolean(seed)}
      />
      {page ? (
        <CasePage
          key={page.kind + page.userId}
          store={store}
          page={page}
          closing={closing}
          onBack={back}
          onOpenUser={openUser}
          notify={notify}
        />
      ) : null}
      {dismissEntry && dismissUser ? (
        <ActionSheets
          key={dismissUser.id}
          store={store}
          user={dismissUser}
          reportIds={dismissEntry.reports.map((report) => report.id)}
          onDone={() =>
            notify(dismissUser, 'dismiss', {
              reports: dismissEntry.reports.length,
              resolved: true,
            })
          }
          sheet="dismiss"
          setSheet={() => setDismissEntry(null)}
        />
      ) : null}
    </div>
  );
};
