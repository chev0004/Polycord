'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdAdminPanelSettings,
  MdArrowForward,
  MdCheck,
  MdClose,
  MdExpandMore,
  MdFilterAltOff,
  MdGroup,
  MdHistory,
  MdInventory2,
  MdManageSearch,
  MdOutlinedFlag,
  MdOutlineInbox,
  MdPersonSearch,
  MdPolicy,
  MdSearch,
  MdStorage,
  MdTaskAlt,
  MdTune,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import {
  ACTION_TONE,
  ActionBar,
  DetailHeader,
  EmptyState,
  HistoryList,
  Kbd,
  modButton,
  ReasonBadge,
  ReportStack,
  RestrictionChips,
  StaffChip,
  useLanguageLabels,
  useLogLabel,
  useModFormat,
  useShortcut,
} from './ModerationParts';
import { PremiumPanel } from './ModerationPremium';
import { StaffPanel } from './ModerationStaff';
import { SeedPanel } from './SeedPanel';
import type { ModAction, ModUser, SeedStatus } from './types';
import { LOG_ACTIONS } from './types';
import {
  groupReports,
  hasStatusChips,
  type ModerationStore,
} from './useModeration';

export type ModTab = 'reports' | 'users' | 'log' | 'suspicious' | 'dummy';

export type Notify = (
  user: ModUser,
  action: ModAction,
  details: {
    days?: number;
    reports: number;
    resolved: boolean;
    failed?: boolean;
  },
) => void;

export type UsersQuery = {
  query: string;
  setQuery: (query: string) => void;
  selected: string | null;
  setSelected: (userId: string | null) => void;
  results: string[] | null;
  searching: boolean;
  failed: boolean;
};

const pane =
  'flex min-h-0 flex-col overflow-hidden rounded-3xl bg-background-dark shadow-xl';
const paneScroll =
  'min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--color-primary-dark)_transparent] [scrollbar-width:thin]';
const sectionTitle =
  'flex items-center gap-2 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]';

const rowClass = (on: boolean) =>
  `relative grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-[14px] px-3 py-2.5 text-left text-foreground transition-colors ${
    on
      ? 'bg-primary-darker before:absolute before:top-3 before:bottom-3 before:left-0 before:w-[3px] before:rounded-[3px] before:bg-primary'
      : 'hover:bg-background-main'
  }`;

const workspace =
  'grid h-[calc(100vh-214px)] min-h-[560px] grid-cols-[300px_minmax(0,1fr)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]';

const SkeletonRows = () => (
  <div className="flex flex-col gap-0.5 p-1.5" aria-hidden>
    {[55, 68, 81, 64].map((width) => (
      <div key={width} className="grid grid-cols-[32px_1fr_40px] gap-3 p-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[#222325]" />
        <div className="flex flex-col gap-[7px]">
          <div
            className="h-3 animate-pulse rounded-md bg-[#222325]"
            style={{ width: `${width}%` }}
          />
          <div className="h-2.5 w-2/5 animate-pulse rounded-md bg-[#222325]" />
        </div>
        <div className="h-2.5 animate-pulse rounded-md bg-[#222325]" />
      </div>
    ))}
  </div>
);

const Section = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2.5">
    <h3 className={sectionTitle}>
      {title}
      {count === undefined ? null : <span className="text-muted">{count}</span>}
    </h3>
    {children}
  </section>
);

const ProfileBlock = ({ user }: { user: ModUser }) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const labels = useLanguageLabels();
  const fact = (key: string, value: ReactNode) => (
    <div className="flex flex-col gap-[3px]">
      <span className="font-semibold text-[11px] text-subtle">{t(key)}</span>
      <span className="flex flex-wrap gap-1 text-[13px] text-foreground">
        {value}
      </span>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
      <p className="break-words rounded-[14px] bg-background-darker px-3.5 py-3 font-light text-sm text-soft leading-[1.55]">
        {user.profile ? (
          user.profile.bio || (
            <span className="text-[13px] text-subtle">{t('noBio')}</span>
          )
        ) : (
          <span className="text-[13px] text-subtle">{t('noProfile')}</span>
        )}
      </p>
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-background-darker px-3.5 py-3">
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
                  <span className="text-red-300">· {t('hiddenByStaff')}</span>
                ) : null}
              </>,
            )}
            {fact('factPrimary', labels.language(user.profile.primaryLanguage))}
            {fact(
              'factLearning',
              user.profile.targetLanguages.length ? (
                user.profile.targetLanguages.map((target, index, all) => (
                  <span key={target.language}>
                    {labels.language(target.language)}{' '}
                    <span className="text-muted text-xs">
                      {labels.level(target.level)}
                    </span>
                    {index < all.length - 1 ? ',' : ''}
                  </span>
                ))
              ) : (
                <span className="text-muted text-xs">{t('noneListed')}</span>
              ),
            )}
          </>
        ) : null}
        {fact('factJoined', date(user.joinedAt))}
      </div>
    </div>
  );
};

const QueueRow = ({
  user,
  on,
  onClick,
  children,
  side,
}: {
  user: ModUser;
  on: boolean;
  onClick: () => void;
  children?: ReactNode;
  side?: ReactNode;
}) => (
  <button type="button" onClick={onClick} className={rowClass(on)}>
    <Avatar avatarUrl={user.avatarUrl} size="sm" />
    <span className="flex min-w-0 flex-col gap-[3px]">
      <span className="truncate font-semibold text-sm">{user.displayName}</span>
      {children}
    </span>
    <span className="flex flex-col items-end gap-1.5">{side}</span>
  </button>
);

export const UserDetail = ({
  store,
  user,
  reports,
  reportsTitle,
  reportIds,
  canDismiss,
  shortcuts,
  otherReports,
  resolvedOnAct,
  notify,
  openUser,
  onOpenRecord,
  profileFirst,
}: {
  store: ModerationStore;
  user: ModUser;
  reports: ReturnType<ModerationStore['userReports']>;
  reportsTitle: string;
  reportIds: string[];
  canDismiss: boolean;
  shortcuts: boolean;
  otherReports: number;
  resolvedOnAct: boolean;
  notify: Notify;
  openUser?: (userId: string) => void;
  onOpenRecord?: () => void;
  profileFirst: boolean;
}) => {
  const t = useTranslations('Admin');
  const history = store.userLog(user.id);
  const reportSection = (
    <Section key="reports" title={reportsTitle} count={reports.length}>
      {reports.length ? (
        <ReportStack store={store} reports={reports} onOpenUser={openUser} />
      ) : (
        <p className="text-[13px] text-subtle">{t('noReports')}</p>
      )}
      {otherReports > 0 && openUser ? (
        <button
          type="button"
          onClick={() => openUser(user.id)}
          className="inline-flex items-center gap-1 self-start font-medium text-[12.5px] text-primary-light hover:text-foreground"
        >
          {t('otherReports', { count: otherReports })}
          <MdArrowForward size={16} />
        </button>
      ) : null}
    </Section>
  );
  const profileSection = (
    <Section key="profile" title={t('sectionProfile')}>
      <ProfileBlock user={user} />
    </Section>
  );

  return (
    <>
      <DetailHeader
        user={user}
        onOpenRecord={onOpenRecord}
        showSupporter={store.meRole === 'owner'}
      />
      <ActionBar
        store={store}
        user={user}
        reportIds={reportIds}
        canDismiss={canDismiss}
        shortcuts={shortcuts}
        onDone={({ action, days }) =>
          notify(user, action, {
            days,
            reports: reportIds.length,
            resolved: resolvedOnAct,
          })
        }
      />
      <div className="flex flex-col gap-[22px] px-5 pt-4 pb-6">
        {profileFirst
          ? [profileSection, reportSection]
          : [reportSection, profileSection]}
        {store.meRole === 'owner' ? (
          <Section title={t('sectionPremium')}>
            <PremiumPanel store={store} user={user} />
          </Section>
        ) : null}
        <Section title={t('sectionHistory')} count={history.length}>
          <HistoryList store={store} entries={history} />
        </Section>
      </div>
    </>
  );
};

const ReportsTab = ({
  store,
  notify,
  openUser,
}: {
  store: ModerationStore;
  notify: Notify;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const { relative, absolute } = useModFormat();
  const [view, setView] = useState<'pending' | 'resolved'>('pending');
  const [selected, setSelected] = useState<string | null>(null);
  const lastIndex = useRef(0);
  const pending = store.pendingGroups;
  const resolved = groupReports(store.reports, 'resolved');
  const groups = view === 'pending' ? pending : resolved;
  const found = groups.findIndex((group) => group.userId === selected);
  const index =
    found >= 0 ? found : Math.min(lastIndex.current, groups.length - 1);
  const group = groups[index];
  const user = group ? store.usersById.get(group.userId) : undefined;

  useEffect(() => {
    if (index >= 0) lastIndex.current = index;
  });

  useShortcut(true, (key, event) => {
    if ((key !== 'j' && key !== 'k') || !groups.length) return;
    event.preventDefault();
    const next = Math.max(
      0,
      Math.min(groups.length - 1, index + (key === 'j' ? 1 : -1)),
    );
    setSelected(groups[next].userId);
  });

  const switchView = (next: 'pending' | 'resolved') => {
    setView(next);
    setSelected(null);
    lastIndex.current = 0;
  };

  const segment = (value: 'pending' | 'resolved', count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === value}
      onClick={() => switchView(value)}
      className={`inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 font-medium text-[13px] transition-colors ${
        view === value
          ? 'bg-primary-darker text-primary-light'
          : 'text-muted hover:text-foreground'
      }`}
    >
      {t(value)}
      <span
        className={`font-semibold text-[11.5px] ${view === value ? 'text-primary' : 'text-subtle'}`}
      >
        {count}
      </span>
    </button>
  );

  const others = user
    ? store
        .userReports(user.id)
        .filter((report) => !group.reports.includes(report)).length
    : 0;

  return (
    <div className={workspace}>
      <section className={pane} aria-label={t('tabReports')}>
        <div className="flex shrink-0 items-center border-line border-b px-3.5 pt-3.5 pb-3">
          <div
            role="tablist"
            className="inline-flex gap-0.5 rounded-full bg-background-darker p-[3px]"
          >
            {segment('pending', pending.length)}
            {segment('resolved', resolved.length)}
          </div>
        </div>
        <div className={paneScroll}>
          {groups.length ? (
            <div className="flex flex-col gap-0.5 p-1.5">
              {groups.map((entry) => {
                const reported = store.usersById.get(entry.userId);
                if (!reported) return null;
                return (
                  <QueueRow
                    key={entry.userId}
                    user={reported}
                    on={entry === group}
                    onClick={() => setSelected(entry.userId)}
                    side={
                      <>
                        <time
                          dateTime={entry.reports[0].createdAt}
                          title={absolute(entry.reports[0].createdAt)}
                          className="whitespace-nowrap text-[11.5px] text-subtle"
                        >
                          {relative(entry.reports[0].createdAt)}
                        </time>
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 font-bold text-[11px] ${
                            entry.reports.length > 1
                              ? 'bg-discord-blue text-white'
                              : `text-primary-light ${entry === group ? 'bg-background-dark' : 'bg-background-darker'}`
                          }`}
                        >
                          {t('reportCount', { count: entry.reports.length })}
                        </span>
                      </>
                    }
                  >
                    <span className="truncate text-muted text-xs">
                      @{reported.username}
                    </span>
                    <span className="mt-[3px] flex flex-wrap gap-1">
                      {[...new Set(entry.reports.map((r) => r.reason))].map(
                        (reason) => (
                          <ReasonBadge key={reason} reason={reason} />
                        ),
                      )}
                      {reported.role ? (
                        <StaffChip role={reported.role} small />
                      ) : null}
                      <RestrictionChips user={reported} small />
                    </span>
                  </QueueRow>
                );
              })}
            </div>
          ) : (
            <EmptyState
              className="h-full px-6 py-10"
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
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-line border-t px-4 py-2.5 text-[11.5px] text-subtle">
          <span className="flex items-center gap-[3px]">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            {t('keysMove')}
          </span>
          {(
            [
              ['D', 'keysDismiss'],
              ['W', 'keysWarn'],
              ['H', 'keysHide'],
              ['S', 'keysSuspend'],
            ] as const
          ).map(([key, label]) => (
            <span key={key} className="flex items-center gap-[3px]">
              <Kbd>{key}</Kbd>
              {t(label)}
            </span>
          ))}
        </div>
      </section>
      <section className={pane} aria-label={user?.displayName}>
        <div className={paneScroll}>
          {user && group ? (
            <UserDetail
              key={user.id + view}
              store={store}
              user={user}
              reports={group.reports}
              reportsTitle={t('sectionReports')}
              reportIds={
                view === 'pending'
                  ? group.reports.map((report) => report.id)
                  : []
              }
              canDismiss={view === 'pending'}
              shortcuts
              otherReports={others}
              resolvedOnAct={view === 'pending'}
              notify={notify}
              openUser={openUser}
              onOpenRecord={() => openUser(user.id)}
              profileFirst={false}
            />
          ) : (
            <EmptyState
              className="h-full px-6 py-10"
              icon={view === 'pending' ? MdTaskAlt : MdOutlineInbox}
              title={t(
                view === 'pending'
                  ? 'detailPendingTitle'
                  : 'detailResolvedTitle',
              )}
              body={t(
                view === 'pending' ? 'detailPendingBody' : 'detailResolvedBody',
              )}
            />
          )}
        </div>
      </section>
    </div>
  );
};

const UsersTab = ({
  store,
  users,
  notify,
  openUser,
}: {
  store: ModerationStore;
  users: UsersQuery;
  notify: Notify;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const trimmed = users.query.trim();
  const listIds = trimmed ? (users.results ?? []) : store.recentUserIds;
  const list = listIds.flatMap((id) => store.usersById.get(id) ?? []);
  const user = users.selected ? store.usersById.get(users.selected) : undefined;

  useEffect(() => {
    if (
      trimmed &&
      users.results?.length &&
      !users.results.includes(users.selected ?? '')
    ) {
      users.setSelected(users.results[0]);
    }
  });

  return (
    <div className={workspace}>
      <section className={pane} aria-label={t('tabUsers')}>
        <div className="border-line border-b p-3">
          <label className="relative block h-[42px]">
            <MdSearch
              size={20}
              aria-hidden
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 text-subtle"
            />
            <input
              type="search"
              value={users.query}
              onChange={(event) => users.setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="h-[42px] w-full rounded-full border border-white/[0.07] bg-background-darker pr-4 pl-[42px] text-foreground text-sm outline-none transition-colors placeholder:text-subtle hover:border-white/[0.14] focus:border-white/[0.14]"
            />
          </label>
        </div>
        <div className={paneScroll}>
          {users.searching ? (
            <SkeletonRows />
          ) : users.failed ? (
            <p role="alert" className="px-[18px] py-4 text-red-400 text-sm">
              {t('searchFailed')}
            </p>
          ) : trimmed && users.results && !users.results.length ? (
            <EmptyState
              className="px-6 py-10"
              icon={MdPersonSearch}
              title={t('noUsersTitle')}
              body={t('noUsersBody', { query: trimmed })}
            />
          ) : (
            <>
              <p className="px-[18px] pt-3 pb-1 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                {trimmed
                  ? t('resultsCount', { count: list.length })
                  : t('recentlyActioned')}
              </p>
              <div className="flex flex-col gap-0.5 p-1.5">
                {list.map((entry) => (
                  <QueueRow
                    key={entry.id}
                    user={entry}
                    on={entry.id === users.selected}
                    onClick={() => users.setSelected(entry.id)}
                  >
                    <span className="truncate text-muted text-xs">
                      @{entry.username} ·{' '}
                      <span className="font-mono text-[11px]">
                        {entry.discordId}
                      </span>
                    </span>
                    {hasStatusChips(entry) ? (
                      <span className="mt-[3px] flex flex-wrap gap-1">
                        {entry.role ? (
                          <StaffChip role={entry.role} small />
                        ) : null}
                        <RestrictionChips user={entry} small />
                      </span>
                    ) : null}
                  </QueueRow>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <section className={pane} aria-label={user?.displayName}>
        <div className={paneScroll}>
          {user ? (
            <UserDetail
              key={user.id}
              store={store}
              user={user}
              reports={store.userReports(user.id)}
              reportsTitle={t('sectionReportsAgainst')}
              reportIds={[]}
              canDismiss={false}
              shortcuts={false}
              otherReports={0}
              resolvedOnAct={false}
              notify={notify}
              openUser={openUser}
              profileFirst
            />
          ) : (
            <EmptyState
              className="h-full px-6 py-10"
              icon={MdManageSearch}
              title={t('lookupTitle')}
              body={t('lookupBody')}
            />
          )}
        </div>
      </section>
    </div>
  );
};

const FilterSelect = ({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: IconType;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  const item = (optionValue: string, optionLabel: string) => (
    <button
      key={optionValue || 'all'}
      type="button"
      onClick={() => {
        onChange(optionValue);
        setOpen(false);
      }}
      className={`flex h-[38px] w-full items-center justify-between gap-2.5 rounded-full px-3 text-left text-sm hover:bg-background-main ${value === optionValue ? 'text-primary-light' : 'text-foreground'}`}
    >
      {optionLabel}
      {value === optionValue ? <MdCheck size={18} /> : null}
    </button>
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`group inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 font-medium text-[13px] transition-colors data-[state=open]:bg-background-main ${
            value
              ? 'bg-primary-darker text-primary-light'
              : 'text-foreground hover:bg-background-main'
          }`}
        >
          <Icon size={18} className={value ? 'text-primary' : 'text-muted'} />
          {current?.label ?? label}
          <MdExpandMore
            size={18}
            className="transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="PopoverContent z-50 min-w-[220px] rounded-[18px] border border-gray-500/50 bg-background-dark p-1.5 font-figtree shadow-lg"
        >
          {item('', label)}
          <div className="my-1 h-px bg-line" />
          {options.map((option) => item(option.value, option.label))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const UserCell = ({
  user,
  onClick,
}: {
  user?: ModUser;
  onClick: () => void;
}) => {
  const t = useTranslations('Admin');
  if (!user)
    return <span className="text-[13px] text-muted">{t('unknownUser')}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-center gap-2.5 text-left"
    >
      <span className="[&>*]:!h-[26px] [&>*]:!w-[26px]">
        <Avatar avatarUrl={user.avatarUrl} size="sm" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-foreground group-hover:underline group-hover:underline-offset-2">
          {user.displayName}
        </span>
        <span className="truncate text-[11.5px] text-subtle">
          @{user.username}
        </span>
      </span>
    </button>
  );
};

const tablePane = 'overflow-hidden rounded-3xl bg-background-dark shadow-xl';
const headRow =
  'grid items-center gap-4 bg-background-darker px-5 py-2.5 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]';
const bodyRow =
  'grid items-center gap-4 border-[rgba(55,65,81,0.6)] border-t px-5 py-2.5 text-[13px]';
const logColumns =
  'grid-cols-[170px_minmax(160px,1.1fr)_140px_130px_minmax(0,1.6fr)]';
const suspiciousColumns =
  'grid-cols-[minmax(0,1.6fr)_minmax(160px,1fr)_190px_130px_110px]';

const LogTab = ({
  store,
  openUser,
}: {
  store: ModerationStore;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const { absolute, relative } = useModFormat();
  const label = useLogLabel();
  const [action, setAction] = useState('');
  const [staff, setStaff] = useState('');
  const rows = store.log.filter(
    (entry) =>
      (!action || entry.action === action) &&
      (!staff || entry.staffId === staff),
  );
  const staffIds = [...new Set(store.log.flatMap((e) => e.staffId ?? []))];
  const clear = () => {
    setAction('');
    setStaff('');
  };

  return (
    <section className={tablePane} aria-label={t('tabLog')}>
      <div className="flex flex-wrap items-center gap-1.5 border-line border-b px-3.5 py-3">
        <FilterSelect
          icon={MdTune}
          label={t('allActions')}
          value={action}
          onChange={setAction}
          options={LOG_ACTIONS.map((value) => ({
            value,
            label: t(`action_${value}`),
          }))}
        />
        <FilterSelect
          icon={MdAdminPanelSettings}
          label={t('allStaff')}
          value={staff}
          onChange={setStaff}
          options={staffIds.map((id) => ({
            value: id,
            label: store.usersById.get(id)?.displayName ?? t('unknownUser'),
          }))}
        />
        {action || staff ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-[34px] items-center gap-1 rounded-full px-2.5 text-muted text-sm hover:bg-background-main hover:text-foreground"
          >
            <MdClose size={16} />
            {t('clear')}
          </button>
        ) : null}
        <span className="ml-auto text-[12.5px] text-subtle">
          {t('actionsCount', { count: rows.length })}
        </span>
      </div>
      <div className={`${headRow} ${logColumns}`}>
        <span>{t('colAction')}</span>
        <span>{t('colTarget')}</span>
        <span>{t('colStaff')}</span>
        <span>{t('colTime')}</span>
        <span>{t('colNote')}</span>
      </div>
      {rows.length ? (
        rows.map((entry) => (
          <div key={entry.id} className={`${bodyRow} ${logColumns}`}>
            <span className="inline-flex items-center gap-2 font-medium text-foreground">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${ACTION_TONE[entry.action]}`}
              />
              {label(entry)}
            </span>
            <UserCell
              user={store.usersById.get(entry.userId ?? '')}
              onClick={() => entry.userId && openUser(entry.userId)}
            />
            <span className="min-w-0 truncate text-muted">
              {store.usersById.get(entry.staffId ?? '')?.displayName ??
                t('unknownUser')}
            </span>
            <time
              dateTime={entry.createdAt}
              title={relative(entry.createdAt)}
              className="text-muted"
            >
              {absolute(entry.createdAt)}
            </time>
            <span className="min-w-0 break-words font-light text-muted">
              {entry.note ?? <span className="text-subtle">-</span>}
            </span>
          </div>
        ))
      ) : (
        <EmptyState
          className="px-6 py-10"
          icon={MdFilterAltOff}
          title={t('noMatchTitle')}
          body={t('noMatchBody')}
        >
          <button type="button" onClick={clear} className={modButton()}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      )}
    </section>
  );
};

export const useEventLabel = () => {
  const t = useTranslations('Admin');
  return (action: string) =>
    ({
      report: t('event_report'),
      bump: t('event_bump'),
      copy: t('event_copy'),
      'auth-failure': t('event_authFailure'),
    })[action] ?? action;
};

const SuspiciousTab = ({
  store,
  openUser,
}: {
  store: ModerationStore;
  openUser: (userId: string) => void;
}) => {
  const t = useTranslations('Admin');
  const { absolute, relative } = useModFormat();
  const eventLabel = useEventLabel();

  return (
    <section className={tablePane} aria-label={t('tabSuspicious')}>
      <p className="border-line border-b px-5 py-3.5 text-[12.5px] text-subtle">
        {t('suspiciousIntro')}
      </p>
      <div className={`${headRow} ${suspiciousColumns}`}>
        <span>{t('colEvent')}</span>
        <span>{t('colUser')}</span>
        <span>{t('colIp')}</span>
        <span>{t('colTime')}</span>
        <span />
      </div>
      {store.suspicious.length ? (
        store.suspicious.map((row) => {
          const user = store.usersById.get(row.userId ?? '');
          return (
            <div key={row.id} className={`${bodyRow} ${suspiciousColumns}`}>
              <span className="flex min-w-0 items-start gap-2.5">
                <MdOutlinedFlag
                  size={18}
                  className="shrink-0 text-discord-yellow"
                />
                <span>
                  <span className="font-medium text-foreground">
                    {eventLabel(row.action)}
                  </span>
                  <span className="mt-0.5 block text-muted text-xs">
                    {t('eventReason')}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <UserCell
                  user={user}
                  onClick={() => user && openUser(user.id)}
                />
                {user ? <RestrictionChips user={user} small /> : null}
              </span>
              <span className="font-mono text-muted text-xs">
                {row.ip ?? '-'}
              </span>
              <time
                dateTime={row.createdAt}
                title={relative(row.createdAt)}
                className="text-muted"
              >
                {absolute(row.createdAt)}
              </time>
              <span className="text-right">
                {user ? (
                  <button
                    type="button"
                    onClick={() => openUser(user.id)}
                    className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[13px] text-primary-light hover:text-foreground"
                  >
                    {t('viewUser')}
                    <MdArrowForward size={16} />
                  </button>
                ) : null}
              </span>
            </div>
          );
        })
      ) : (
        <EmptyState
          className="px-6 py-10"
          icon={MdPolicy}
          title={t('suspiciousEmptyTitle')}
          body={t('suspiciousEmptyBody')}
        />
      )}
    </section>
  );
};

export const ModerationDesktop = ({
  store,
  tab,
  setTab,
  users,
  notify,
  openUser,
  seed,
}: {
  store: ModerationStore;
  tab: ModTab;
  setTab: (tab: ModTab) => void;
  users: UsersQuery;
  notify: Notify;
  openUser: (userId: string) => void;
  seed: SeedStatus | null;
}) => {
  const t = useTranslations('Admin');
  const me = store.usersById.get(store.meId);
  const tabs: { id: ModTab; icon: IconType; label: string; badge?: number }[] =
    [
      {
        id: 'reports',
        icon: MdOutlinedFlag,
        label: t('tabReports'),
        badge: store.pendingCases,
      },
      { id: 'users', icon: MdPersonSearch, label: t('tabUsers') },
      { id: 'log', icon: MdHistory, label: t('tabLog') },
      {
        id: 'suspicious',
        icon: MdPolicy,
        label: t('tabSuspicious'),
        badge: store.suspicious.length,
      },
      ...(seed
        ? [{ id: 'dummy' as const, icon: MdStorage, label: t('tabDummy') }]
        : []),
    ];

  return (
    <main className="mx-auto w-full max-w-[1360px] px-6 pt-[22px] pb-8 font-figtree">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-[26px] text-foreground leading-tight">
            {t('title')}
          </h1>
          <p className="mt-1 text-muted text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {store.meRole === 'owner' ? (
            <Popover.Root>
              <Popover.Trigger asChild>
                <button type="button" className={modButton()}>
                  <MdGroup size={17} />
                  {t('manageStaff')}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="PopoverContent z-50 w-[300px] rounded-[18px] border border-gray-500/50 bg-background-dark p-2 font-figtree shadow-lg"
                >
                  <StaffPanel store={store} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          ) : null}
          {me ? (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-end leading-tight">
                <span className="font-semibold text-[13px] text-foreground">
                  {me.displayName}
                </span>
                <span className="text-[11px] text-muted">
                  {t(store.meRole === 'owner' ? 'chipOwner' : 'chipModerator')}
                </span>
              </div>
              <Avatar avatarUrl={me.avatarUrl} size="sm" />
            </div>
          ) : null}
        </div>
      </div>
      <div
        role="tablist"
        className="mb-4 flex gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 font-medium text-sm transition-colors ${
              tab === id
                ? 'bg-primary-darker text-primary-light'
                : 'text-muted hover:bg-background-dark hover:text-foreground'
            }`}
          >
            <Icon size={19} className={tab === id ? 'text-primary' : ''} />
            {label}
            {badge ? (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-bold text-[11px] ${
                  id === 'reports'
                    ? 'bg-discord-blue text-white'
                    : 'bg-[rgba(107,114,128,0.2)] text-muted'
                }`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {tab === 'reports' ? (
        <ReportsTab store={store} notify={notify} openUser={openUser} />
      ) : null}
      {tab === 'users' ? (
        <UsersTab
          store={store}
          users={users}
          notify={notify}
          openUser={openUser}
        />
      ) : null}
      {tab === 'log' ? <LogTab store={store} openUser={openUser} /> : null}
      {tab === 'suspicious' ? (
        <SuspiciousTab store={store} openUser={openUser} />
      ) : null}
      {tab === 'dummy' && seed ? <SeedPanel initial={seed} /> : null}
    </main>
  );
};
