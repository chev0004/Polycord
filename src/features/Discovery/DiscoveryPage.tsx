'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdClose } from 'react-icons/md';
import { FilterBar } from '@/components/Filter';
import { ToastStack } from '@/components/Toast';
import type { AvailabilityPattern } from '@/constants/availability';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { useNavbarBump } from '@/features/Navigation/AppShell';
import { DISCOVERY_RETURN_KEY } from '@/features/Navigation/ReturnLink';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import {
  getMissingRequiredFields,
  getOnboardingCompletion,
  type OnboardingDraft,
} from '@/features/Onboarding/completion';
import { onboardingDraftSchema } from '@/features/Onboarding/schema';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useToastStack } from '@/hooks/useToast';
import { copyText } from '@/lib/clipboard';
import {
  BumpProfileError,
  type BumpProfileResponse,
  bumpProfileRequest,
} from './bumpProfileRequest';
import type { DiscoveryData } from './discoveryData';
import {
  applyDiscoveryFilters,
  type DiscoveryFilterValues,
  useDiscoveryFilterDefs,
} from './discoveryFilters';
import { applyDiscoverySearch } from './discoverySearch';
import {
  applyDiscoverySort,
  type DiscoverySortValue,
  SORT_OPTIONS,
} from './discoverySort';
import { applyTagFilter, buildTagCounts } from './discoveryTags';
import {
  buildDiscoveryQuery,
  MAX_STACK_PAGES,
  parseDiscoveryState,
} from './discoveryUrlState';
import {
  BackToTop,
  type FilterDraft,
  FilterSheet,
  SortSheet,
} from './MobileFilters';
import { Pagination } from './Pagination';
import type { DiscoveryProfile } from './ProfileCard';
import { ProfileGrid } from './ProfileGrid';
import { ProfileGridSkeleton } from './ProfileGridSkeleton';
import { ReportDialog } from './ReportDialog';
import { SearchBar } from './SearchBar';
import { SortMenu } from './SortMenu';
import {
  blockProfileRequest,
  ReportProfileError,
  type ReportReason,
  reportProfileRequest,
} from './safetyRequests';
import { saveProfileRequest } from './saveProfileRequest';
import { buildPublicProfileUrl } from './shareProfile';
import { type AppliedFilter, TagCloud } from './TagCloud';

const PER_PAGE = 9;
const EMPTY_PROFILES: DiscoveryProfile[] = [];

type DiscoveryPageProps = {
  userId?: string;
  authError?: string;
  feedError?: boolean;
  isLoading?: boolean;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding?: boolean;
  profiles?: DiscoveryProfile[];
  discoveryData?: DiscoveryData;
  savedProfileIds?: string[];
  currentProfileId?: string;
  bumpReadyAt?: string;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern | null;
  userAvatarUrl?: string;
  onBumpProfile?: () => Promise<BumpProfileResponse>;
};

const BUMP_TOAST_DURATION = 4000;

const onboardingFieldLabelKeys: Record<keyof OnboardingDraft, string> = {
  availability: 'onboardingFieldAvailability',
  bio: 'onboardingFieldBio',
  country: 'onboardingFieldCountry',
  primaryLanguage: 'onboardingFieldPrimaryLanguage',
  proficiencyLevel: 'onboardingFieldProficiencyLevel',
  tags: 'onboardingFieldTags',
  targetLanguage: 'onboardingFieldTargetLanguage',
  timezone: 'onboardingFieldTimezone',
};

export const DiscoveryPage = ({
  userId,
  authError,
  feedError = false,
  isLoading = false,
  isLoggedIn,
  locale,
  needsOnboarding = false,
  profiles = EMPTY_PROFILES,
  discoveryData,
  savedProfileIds,
  currentProfileId,
  bumpReadyAt: initialBumpReadyAt,
  viewerTimezone,
  viewerAvailability,
  userAvatarUrl,
  onBumpProfile = bumpProfileRequest,
}: DiscoveryPageProps) => {
  const router = useRouteProgressRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const t = useTranslations('Discovery');
  const mobile = useIsMobile();
  const viewerHasAvailability = Boolean(viewerAvailability);
  const viewerContext = useMemo(
    () => ({
      availability: viewerAvailability ?? undefined,
      timezone: viewerTimezone,
    }),
    [viewerAvailability, viewerTimezone],
  );
  const filterDefs = useDiscoveryFilterDefs({ viewerHasAvailability });
  const sortOptions = useMemo(
    () =>
      viewerHasAvailability
        ? SORT_OPTIONS
        : SORT_OPTIONS.filter((option) => option !== 'overlap-desc'),
    [viewerHasAvailability],
  );
  const resultsHeadRef = useRef<HTMLDivElement>(null);
  const [initialState] = useState(() => parseDiscoveryState(searchParams));
  const [filterValues, setFilterValues] = useState<DiscoveryFilterValues>(
    initialState.filterValues,
  );
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialState.selectedTags,
  );
  const [sortValue, setSortValue] = useState<DiscoverySortValue>(
    initialState.sortValue,
  );
  const [page, setPage] = useState(initialState.page);
  const [remoteData, setRemoteData] = useState(discoveryData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(feedError);
  const requestRef = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [profileItems, setProfileItems] = useState(profiles);
  const [isBumping, setIsBumping] = useState(false);
  const [bumpReadyAt, setBumpReadyAt] = useState(initialBumpReadyAt);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const { toasts, addToast, dismissToast } = useToastStack();

  useEffect(() => {
    setProfileItems(profiles);
  }, [profiles]);

  useEffect(() => {
    const state = parseDiscoveryState(new URLSearchParams(urlQuery));
    setFilterValues(state.filterValues);
    setSearchQuery(state.searchQuery);
    setSelectedTags(state.selectedTags);
    setSortValue(state.sortValue);
    setPage(state.page);
  }, [urlQuery]);

  useEffect(() => {
    setBumpReadyAt(initialBumpReadyAt);
  }, [initialBumpReadyAt]);

  useEffect(() => {
    if (!needsOnboarding || !userId) {
      setDraft({});
      return;
    }
    try {
      const rawDraft = sessionStorage.getItem(`polycord:onboarding:${userId}`);
      const parsed = onboardingDraftSchema.safeParse(
        rawDraft ? JSON.parse(rawDraft) : {},
      );
      setDraft(parsed.success ? parsed.data : {});
    } catch {
      setDraft({});
    }
  }, [needsOnboarding, userId]);

  const promptDismissedKey = `polycord:onboarding-prompt-dismissed:${userId}`;

  useLayoutEffect(() => {
    try {
      setIsPromptDismissed(sessionStorage.getItem(promptDismissedKey) === '1');
    } catch {}
  }, [promptDismissedKey]);

  const dismissPrompt = () => {
    setIsPromptDismissed(true);
    try {
      sessionStorage.setItem(promptDismissedKey, '1');
    } catch {}
  };

  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(draft),
    [draft],
  );

  const completion = useMemo(() => getOnboardingCompletion(draft), [draft]);

  const tagCounts = useMemo(
    () => remoteData?.tags ?? buildTagCounts(profileItems),
    [remoteData, profileItems],
  );

  const hasActiveFilters = useMemo(
    () =>
      searchQuery.trim().length > 0 ||
      selectedTags.length > 0 ||
      Object.values(filterValues).some((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ),
    [filterValues, searchQuery, selectedTags],
  );

  const filteredProfiles = useMemo(
    () =>
      remoteData
        ? profileItems
        : applyDiscoverySort(
            applyTagFilter(
              applyDiscoverySearch(
                applyDiscoveryFilters(
                  profileItems,
                  filterValues,
                  viewerContext,
                ),
                searchQuery,
                locale,
              ),
              selectedTags,
            ),
            sortValue,
            viewerContext,
          ),
    [
      profileItems,
      filterValues,
      searchQuery,
      locale,
      selectedTags,
      sortValue,
      viewerContext,
      remoteData,
    ],
  );

  const totalResults = remoteData?.total ?? filteredProfiles.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const stacked = mobile === true;
  const pageItems = useMemo(
    () =>
      remoteData
        ? profileItems
        : filteredProfiles.slice(
            stacked ? 0 : (safePage - 1) * PER_PAGE,
            safePage * PER_PAGE,
          ),
    [filteredProfiles, safePage, remoteData, profileItems, stacked],
  );
  const stackPending =
    stacked && pageItems.length < Math.min(totalResults, safePage * PER_PAGE);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const skipInitialRefresh = useRef(Boolean(discoveryData) && !feedError);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const query = buildDiscoveryQuery({
    filterValues,
    searchQuery: debouncedSearch,
    selectedTags,
    sortValue,
    page,
  });

  const requestUrl = `/api/discovery?${query}&locale=${locale}${stacked && page > 1 ? '&stack=1' : ''}`;

  const refreshDiscovery = useCallback(() => {
    if (!discoveryData) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsRefreshing(true);
    setRefreshFailed(false);
    fetch(requestUrl, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Discovery refresh failed');
        const data: DiscoveryData = await response.json();
        if (controller.signal.aborted) return;
        setRemoteData(data);
        setProfileItems(data.profiles);
        setPage(data.page);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRefreshFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRefreshing(false);
      });
  }, [discoveryData, requestUrl]);

  const countResults = useCallback(
    async (draft: FilterDraft, signal: AbortSignal) => {
      if (!discoveryData) {
        return applyTagFilter(
          applyDiscoverySearch(
            applyDiscoveryFilters(
              profileItems,
              draft.filterValues,
              viewerContext,
            ),
            searchQuery,
            locale,
          ),
          draft.selectedTags,
        ).length;
      }
      const response = await fetch(
        `/api/discovery?${buildDiscoveryQuery({ ...draft, searchQuery: debouncedSearch, page: 1 })}&locale=${locale}&count=1`,
        { cache: 'no-store', signal },
      );
      if (!response.ok) throw new Error('Discovery count failed');
      const data: Pick<DiscoveryData, 'total'> = await response.json();
      return data.total;
    },
    [
      discoveryData,
      profileItems,
      viewerContext,
      searchQuery,
      debouncedSearch,
      locale,
    ],
  );

  useEffect(() => {
    const refresh = refreshDiscovery;
    if (skipInitialRefresh.current) skipInitialRefresh.current = false;
    else refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('polycord:profiles-changed', refresh);
    return () => {
      requestRef.current?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('polycord:profiles-changed', refresh);
    };
  }, [refreshDiscovery]);

  useEffect(() => {
    if (mobile === null || stackPending) return;
    try {
      const stored = sessionStorage.getItem(DISCOVERY_RETURN_KEY);
      if (!stored) return;
      const position = JSON.parse(stored);
      if (
        position.href ===
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      ) {
        window.scrollTo(0, position.scrollY);
        sessionStorage.removeItem(DISCOVERY_RETURN_KEY);
      }
    } catch {}
  }, [mobile, stackPending]);

  useEffect(() => {
    const remember = () => {
      try {
        sessionStorage.setItem(
          DISCOVERY_RETURN_KEY,
          JSON.stringify({
            href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            scrollY: window.scrollY,
          }),
        );
      } catch {}
    };
    window.addEventListener('polycord:navigate', remember);
    return () => window.removeEventListener('polycord:navigate', remember);
  }, []);

  useEffect(() => {
    const query = buildDiscoveryQuery(
      { filterValues, searchQuery, selectedTags, sortValue, page },
      new URLSearchParams(window.location.search),
    );

    if (query === new URLSearchParams(window.location.search).toString()) {
      return;
    }

    window.history.replaceState(
      null,
      '',
      `${query ? `${pathname}?${query}` : pathname}${window.location.hash}`,
    );
  }, [filterValues, searchQuery, selectedTags, sortValue, page, pathname]);

  const showSkeleton = isLoading;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: DiscoverySortValue) => {
    setSortValue(value);
    setPage(1);
  };

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    setFilterValues((previous) => ({ ...previous, [filterId]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setPage(1);
  };

  const handleRemoveFilter = (filterId: string, value: string) => {
    setFilterValues((previous) => {
      const current = previous[filterId];
      return {
        ...previous,
        [filterId]: Array.isArray(current)
          ? current.filter((entry) => entry !== value)
          : '',
      };
    });
    setPage(1);
  };

  const handleApplyFilters = (draft: FilterDraft) => {
    setFilterValues(draft.filterValues);
    setSelectedTags(draft.selectedTags);
    setSortValue(draft.sortValue);
    setPage(1);
  };

  const appliedFilters: AppliedFilter[] = filterDefs.flatMap((filter) =>
    [filterValues[filter.id] ?? []]
      .flat()
      .filter(Boolean)
      .map((value) => ({
        key: `${filter.id}:${value}`,
        label:
          filter.options.find((option) => option.value === value)?.label ??
          value,
        onRemove: () => handleRemoveFilter(filter.id, value),
      })),
  );

  const handleToggleTag = (tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((value) => value !== tag)
        : [...previous, tag],
    );
    setPage(1);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setPage(1);
  };

  const handleAddTagFilter = (tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag) ? previous : [...previous, tag],
    );
    setPage(1);
  };

  const handleAddMultiFilter = (filterId: string, value: string) => {
    setFilterValues((previous) => {
      const current = previous[filterId];
      const values = Array.isArray(current)
        ? current
        : current
          ? [current]
          : [];

      if (values.includes(value)) {
        return previous;
      }

      return { ...previous, [filterId]: [...values, value] };
    });
    setPage(1);
  };

  const handleViewProfile = (profileId: string) => {
    const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.push(`/${locale}/u/${profileId}?from=${encodeURIComponent(href)}`);
  };

  const handleShareProfile = async (profileId: string) => {
    if (await copyText(buildPublicProfileUrl(locale, profileId))) {
      addToast({
        title: t('shareCopiedTitle'),
        description: t('shareCopiedDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    } else {
      addToast({
        title: t('shareErrorTitle'),
        description: t('shareErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    }
  };

  const handleReportProfile = (profileId: string) => {
    if (!isLoggedIn) {
      addToast({
        title: t('reportLoginTitle'),
        description: t('reportLoginDescription'),
        duration: BUMP_TOAST_DURATION,
      });
      return;
    }

    const target = profileItems.find((profile) => profile.id === profileId);
    setReportTarget({ id: profileId, name: target?.displayName });
  };

  const handleSubmitReport = async (
    reason: ReportReason,
    details: string,
  ): Promise<void> => {
    if (!reportTarget) {
      return;
    }

    try {
      await reportProfileRequest(reportTarget.id, reason, details || undefined);
      addToast({
        title: t('reportSuccessTitle'),
        description: t('reportSuccessDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    } catch (error) {
      const limited =
        error instanceof ReportProfileError && error.status === 429;
      addToast({
        title: limited ? t('reportCooldownTitle') : t('reportErrorTitle'),
        description: limited
          ? t('reportCooldownDescription')
          : t('reportErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
      throw error;
    }
  };

  const handleUndoBlock = async (
    profileId: string,
    profile: DiscoveryProfile,
    index: number,
  ) => {
    try {
      await blockProfileRequest(profileId, false);
      refreshDiscovery();
      setProfileItems((previous) => {
        if (previous.some((item) => item.id === profileId)) {
          return previous;
        }

        const next = [...previous];
        next.splice(Math.min(index, next.length), 0, profile);
        return next;
      });
    } catch {
      addToast({
        title: t('unblockErrorTitle'),
        description: t('unblockErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    }
  };

  const handleBlockProfile = async (profileId: string) => {
    if (!isLoggedIn) {
      addToast({
        title: t('blockLoginTitle'),
        description: t('blockLoginDescription'),
        duration: BUMP_TOAST_DURATION,
      });
      return;
    }

    const index = profileItems.findIndex((profile) => profile.id === profileId);

    if (index === -1) {
      return;
    }

    const blocked = profileItems[index];
    setProfileItems((previous) =>
      previous.filter((profile) => profile.id !== profileId),
    );

    try {
      await blockProfileRequest(profileId, true);
      refreshDiscovery();
      addToast({
        title: t('blockSuccessTitle'),
        description: (
          <span className="flex items-center gap-2">
            {t('blockSuccessDescription')}
            <button
              type="button"
              onClick={() => handleUndoBlock(profileId, blocked, index)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t('blockUndo')}
            </button>
          </span>
        ),
        duration: BUMP_TOAST_DURATION,
      });
    } catch {
      setProfileItems((previous) => {
        if (previous.some((item) => item.id === profileId)) {
          return previous;
        }

        const next = [...previous];
        next.splice(Math.min(index, next.length), 0, blocked);
        return next;
      });
      addToast({
        title: t('blockErrorTitle'),
        description: t('blockErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    resultsHeadRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const formatRemaining = (ms: number) => {
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours && rest) {
      return t('bumpCooldownHoursMinutes', { hours, minutes: rest });
    }

    return hours
      ? t('bumpCooldownHours', { count: hours })
      : t('bumpCooldownMinutes', { count: minutes });
  };

  const handleBumpProfile = async () => {
    if (isBumping) {
      return;
    }

    if (!currentProfileId) {
      addToast({
        title: t('bumpNeedsProfileTitle'),
        description: t('bumpNeedsProfileDescription'),
        duration: BUMP_TOAST_DURATION,
      });
      return;
    }

    setIsBumping(true);

    try {
      const result = await onBumpProfile();
      refreshDiscovery();
      setProfileItems((previous) =>
        previous.map((profile) =>
          profile.id === currentProfileId
            ? {
                ...profile,
                bumpedMinutesAgo: 0,
                lastBumpRelative: undefined,
                lastBumpedAt: result.lastBumpedAt,
              }
            : profile,
        ),
      );
      setBumpReadyAt(result.nextBumpAt);
      addToast({
        title: t('bumpSuccessTitle'),
        description: t('bumpSuccessDescription'),
        iconUrl: userAvatarUrl,
        duration: BUMP_TOAST_DURATION,
      });
    } catch (error) {
      const cooldown =
        error instanceof BumpProfileError && error.status === 429
          ? error.remainingMs
          : undefined;

      if (cooldown) {
        setBumpReadyAt(new Date(Date.now() + cooldown).toISOString());
      }

      addToast({
        title: cooldown ? t('bumpCooldownTitle') : t('bumpErrorTitle'),
        description: cooldown
          ? t('bumpCooldownDescription', { time: formatRemaining(cooldown) })
          : t('bumpErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    } finally {
      setIsBumping(false);
    }
  };

  useNavbarBump(handleBumpProfile, bumpReadyAt);

  return (
    <>
      {needsOnboarding && !isPromptDismissed ? (
        <aside className="relative mx-4 mt-4 rounded-lg bg-background-darker p-4 pr-11 shadow-xl sm:mx-8 md:fixed md:right-4 md:bottom-[calc(var(--dock-space,0px)+16px)] md:z-40 md:m-0 md:w-[min(420px,calc(100vw-2rem))]">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/onboarding`)}
              className="min-w-0 flex-1 text-left focus:outline-none focus-visible:bg-background-main focus-visible:text-foreground"
            >
              <p className="font-figtree font-semibold text-foreground">
                {t('onboardingPromptTitle')}
              </p>
              <p className="mt-1 text-muted text-sm">
                {t('onboardingPromptProgress', { completion })}
                {missingRequiredFields.length > 0
                  ? ` ${t('onboardingPromptStillNeeded', {
                      fields: missingRequiredFields
                        .map((field) => t(onboardingFieldLabelKeys[field]))
                        .join(', '),
                    })}`
                  : ` ${t('onboardingPromptReady')}`}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-main">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-background-main hover:text-foreground focus:outline-none focus-visible:bg-background-main focus-visible:text-foreground"
              aria-label={t('onboardingPromptDismiss')}
            >
              <MdClose size={16} />
            </button>
          </div>
        </aside>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        {authError ? (
          <div
            className="mb-6 rounded-md border border-red-400/40 bg-danger-surface px-4 py-3 font-figtree text-danger text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('authErrorTitle')}</p>
            <p className="mt-1 text-danger">{t('authErrorDescription')}</p>
          </div>
        ) : null}

        <div className="max-md:-mx-4 max-md:-mt-2 mb-[14px] max-md:sticky max-md:top-0 max-md:z-10 max-md:bg-background-main max-md:px-4 max-md:py-2">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
        </div>
        <div className="mb-[26px] flex flex-col gap-[14px]">
          {tagCounts.length > 0 ? (
            <TagCloud
              tags={tagCounts}
              selected={selectedTags}
              onToggle={handleToggleTag}
              onClear={handleClearTags}
              collapsible={mobile === true}
              applied={mobile === true ? appliedFilters : undefined}
            />
          ) : null}
          <FilterBar
            className="max-md:hidden"
            filters={filterDefs}
            values={filterValues}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            sortControl={
              <SortMenu
                value={sortValue}
                onChange={handleSortChange}
                options={sortOptions}
              />
            }
          />
        </div>

        {refreshFailed ? (
          <div
            className="rounded-md border border-red-400/40 bg-danger-surface px-4 py-3 font-figtree text-danger text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('feedErrorTitle')}</p>
            <p className="mt-1 text-danger">{t('feedErrorDescription')}</p>
            <button
              type="button"
              className="mt-2 underline hover:text-foreground focus-visible:text-foreground"
              onClick={refreshDiscovery}
            >
              {t('retryFeed')}
            </button>
          </div>
        ) : null}
        {(!refreshFailed || profileItems.length > 0) && (
          <>
            <div
              ref={resultsHeadRef}
              className="mb-[18px] flex scroll-mt-8 flex-wrap items-center gap-2 max-md:scroll-mt-[76px]"
            >
              <span
                aria-live="polite"
                className="font-semibold text-[15px] text-primary"
              >
                {showSkeleton || isRefreshing
                  ? t('resultsSearching')
                  : t('resultsCount', { count: totalResults })}
              </span>
              <div className="ml-auto flex min-w-0 items-center gap-1 md:hidden">
                <SortSheet
                  value={sortValue}
                  options={sortOptions}
                  onChange={handleSortChange}
                />
                <FilterSheet
                  filters={filterDefs}
                  tags={tagCounts}
                  sortOptions={sortOptions}
                  value={{ filterValues, selectedTags, sortValue }}
                  onApply={handleApplyFilters}
                  countResults={countResults}
                />
              </div>
            </div>

            {showSkeleton ? (
              <ProfileGridSkeleton />
            ) : (
              <ProfileGrid
                profiles={pageItems}
                isLoggedIn={isLoggedIn}
                savedProfileIds={remoteData?.savedProfileIds ?? savedProfileIds}
                currentProfileId={currentProfileId}
                viewerTimezone={viewerTimezone}
                onSaveProfile={saveProfileRequest}
                onCopyUsername={
                  isLoggedIn
                    ? (_username, profileId) => {
                        notifyUsernameCopied(profileId).catch(() => {});
                      }
                    : undefined
                }
                onViewProfile={handleViewProfile}
                onShare={handleShareProfile}
                onReport={handleReportProfile}
                onBlock={handleBlockProfile}
                onTagClick={(tag) => handleAddTagFilter(tag)}
                onLanguageClick={(language, _level, isPrimary) =>
                  handleAddMultiFilter(
                    isPrimary ? 'primaryLanguage' : 'targetLanguage',
                    language,
                  )
                }
                onCountryClick={(country) =>
                  handleAddMultiFilter('country', country)
                }
                addToast={addToast}
                emptyState={
                  hasActiveFilters ? undefined : t('emptyFeedDescription')
                }
              />
            )}

            {showSkeleton ? null : stacked ? (
              safePage < Math.min(totalPages, MAX_STACK_PAGES) ? (
                <button
                  type="button"
                  onClick={() => setPage(safePage + 1)}
                  disabled={isRefreshing}
                  className="mt-1 mb-6 h-12 w-full rounded-lg border border-line font-semibold text-sm text-soft transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:bg-overlay active:scale-[0.98] disabled:opacity-60"
                >
                  {t('loadMore')}
                </button>
              ) : safePage >= totalPages && totalResults > 0 ? (
                <p className="pt-1 pb-7 text-center text-subtle text-xs">
                  {t('endOfResults')}
                </p>
              ) : null
            ) : (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(null);
          }
        }}
        profileName={reportTarget?.name}
        onSubmit={handleSubmitReport}
      />

      {needsOnboarding && !isPromptDismissed ? null : (
        <BackToTop count={appliedFilters.length + selectedTags.length} />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
