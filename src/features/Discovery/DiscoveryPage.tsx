'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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
import { siteContainerClass } from '@/components/Container';
import { FilterBar } from '@/components/Filter';
import { ToastStack } from '@/components/Toast';
import type { AvailabilityPattern } from '@/constants/availability';
import type { CasePreview } from '@/features/Admin/CaseShell';
import { prefetchCase } from '@/features/Admin/caseCache';
import type { ModState, StaffRole } from '@/features/Admin/types';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { DISCOVERY_RETURN_KEY } from '@/features/Navigation/ReturnLink';
import {
  useRouteProgress,
  useRouteProgressRouter,
} from '@/features/Navigation/RouteProgress';
import { UrlObserver } from '@/features/Navigation/UrlObserver';
import { profileDraftSchema } from '@/features/Profile/schema';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useToastStack } from '@/hooks/useToast';
import { copyText } from '@/lib/clipboard';
import type { BumpProfileResponse } from './bumpProfileRequest';
import { discoveryCache } from './discoveryCache';
import {
  DISCOVERY_PAGE_SIZE,
  type DiscoveryData,
  discoveryGroupSizes,
} from './discoveryData';
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
import {
  applyTagFilter,
  buildTagCounts,
  MAX_SELECTED_TAGS,
} from './discoveryTags';
import {
  buildDiscoveryQuery,
  MAX_STACK_PAGES,
  parseDiscoveryState,
} from './discoveryUrlState';
import type { DiscoveryViewer } from './discoveryViewer';
import {
  beginGridLoad,
  finishLoadTrace,
  markControlsReady,
  traceDiscoveryRequest,
} from './loadTrace';
import {
  BackToTop,
  type FilterDraft,
  FilterSheet,
  SortSheet,
} from './MobileFilters';
import { Pagination } from './Pagination';
import type { DiscoveryProfile } from './ProfileCard';
import { ProfileGridSkeleton } from './ProfileGridSkeleton';
import { recordProfileShare } from './profileShareRequest';
import { SearchBar } from './SearchBar';
import { SortMenu } from './SortMenu';
import {
  blockedProfileIds,
  blockProfileRequest,
  ReportProfileError,
  type ReportReason,
  reportProfileRequest,
} from './safetyRequests';
import { saveProfileRequest } from './saveProfileRequest';
import { buildPublicProfileUrl } from './shareProfile';
import { DISCOVERY_SKELETON_ENABLED } from './skeletonSetting';
import { type AppliedFilter, TagCloud } from './TagCloud';
import { useProfileBump } from './useProfileBump';

const ProfileGrid = dynamic(
  () => {
    beginGridLoad();
    return import('./ProfileGrid').then((module) => module.ProfileGrid);
  },
  {
    loading: DISCOVERY_SKELETON_ENABLED ? ProfileGridSkeleton : () => null,
  },
);
const preloadModeration = () => {
  void import('@/features/Admin/TakeActionPanel');
  void import('@/features/Admin/MobileTakeAction');
};
const MobileTakeAction = dynamic(() =>
  import('@/features/Admin/MobileTakeAction').then(
    (module) => module.MobileTakeAction,
  ),
);
const TakeActionPanel = dynamic(() =>
  import('@/features/Admin/TakeActionPanel').then(
    (module) => module.TakeActionPanel,
  ),
);
const ReportDialog = dynamic(() =>
  import('./ReportDialog').then((module) => module.ReportDialog),
);

const EMPTY_PROFILES: DiscoveryProfile[] = [];

const withoutBlocked = (profiles: DiscoveryProfile[]) =>
  profiles.filter(({ id }) => !blockedProfileIds.has(id));

type DiscoveryPageProps = {
  userId?: string;
  authError?: string;
  feedError?: boolean;
  isLoading?: boolean;
  fetchOnMount?: boolean;
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
  staff?: { meId: string; role: StaffRole };
  onBumpProfile?: () => Promise<BumpProfileResponse>;
  onViewer?: (viewer: DiscoveryViewer) => void;
};

const BUMP_TOAST_DURATION = 4000;

type ProfileDraft = {
  primaryLanguage?: string;
  targetLanguages?: { language?: string; level?: string }[];
  bio?: string;
  country?: string;
  tags?: string[];
};

const REQUIRED_PROFILE_FIELDS = [
  'primaryLanguage',
  'targetLanguage',
  'bio',
] as const;

const onboardingFieldLabelKeys: Record<
  (typeof REQUIRED_PROFILE_FIELDS)[number],
  string
> = {
  primaryLanguage: 'onboardingFieldPrimaryLanguage',
  targetLanguage: 'onboardingFieldTargetLanguage',
  bio: 'onboardingFieldBio',
};

const getMissingRequiredFields = (draft: ProfileDraft) => {
  const missing: (typeof REQUIRED_PROFILE_FIELDS)[number][] = [];
  if (!draft.primaryLanguage) missing.push('primaryLanguage');
  const firstTarget = draft.targetLanguages?.[0];
  if (!firstTarget?.language || !firstTarget?.level)
    missing.push('targetLanguage');
  if (!draft.bio) missing.push('bio');
  return missing;
};

const getProfileCompletion = (draft: ProfileDraft) => {
  const missingCount = getMissingRequiredFields(draft).length;
  const completedRequired = REQUIRED_PROFILE_FIELDS.length - missingCount;
  const optionalBoost = [draft.country, ...(draft.tags ?? [])].filter(
    Boolean,
  ).length;

  return Math.min(
    100,
    Math.round(
      ((completedRequired + Math.min(optionalBoost, 2)) /
        (REQUIRED_PROFILE_FIELDS.length + 2)) *
        100,
    ),
  );
};

export const DiscoveryPage = ({
  userId,
  authError,
  feedError = false,
  isLoading = false,
  fetchOnMount = false,
  isLoggedIn,
  locale,
  needsOnboarding = false,
  profiles = EMPTY_PROFILES,
  discoveryData,
  savedProfileIds,
  currentProfileId,
  bumpReadyAt,
  viewerTimezone,
  viewerAvailability,
  userAvatarUrl,
  staff,
  onBumpProfile,
  onViewer,
}: DiscoveryPageProps) => {
  const router = useRouteProgressRouter();
  const { navigate } = useRouteProgress();
  const pathname = usePathname();
  const [urlQuery, setUrlQuery] = useState<string | null>(null);
  const lastWrittenQuery = useRef<string | null>(null);
  const [queryAuthError, setQueryAuthError] = useState<string>();
  const remote = fetchOnMount || Boolean(discoveryData);
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
  const settleRequest = useRef<(() => void) | null>(null);
  const barSettle = useRef<(() => void) | null>(null);
  const [awaitingResults, setAwaitingResults] = useState(false);
  const [initialState] = useState(() =>
    parseDiscoveryState(new URLSearchParams()),
  );
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
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [profileItems, setProfileItems] = useState(() =>
    withoutBlocked(profiles),
  );
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [moderationOverrides, setModerationOverrides] = useState<
    Record<string, ModState>
  >({});
  const [moderationTarget, setModerationTarget] = useState<{
    id: string;
    name: string;
    trigger: HTMLElement | null;
    preview: CasePreview;
  } | null>(null);
  const { toasts, addToast, dismissToast } = useToastStack();

  useEffect(() => {
    void import('./ProfileGrid');
  }, []);

  const isStaff = Boolean(staff);
  useEffect(() => {
    if (!isStaff) return;
    if (!('requestIdleCallback' in window)) {
      const timer = setTimeout(preloadModeration, 2000);
      return () => clearTimeout(timer);
    }
    const idle = window.requestIdleCallback(preloadModeration, {
      timeout: 5000,
    });
    return () => window.cancelIdleCallback(idle);
  }, [isStaff]);

  useEffect(() => {
    setProfileItems(withoutBlocked(profiles));
  }, [profiles]);

  useEffect(() => {
    if (!needsOnboarding || !userId) {
      setDraft({});
      return;
    }
    try {
      const rawDraft = sessionStorage.getItem(`polycord:profile:${userId}`);
      const parsed = profileDraftSchema.safeParse(
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

  const completion = useMemo(() => getProfileCompletion(draft), [draft]);

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
  const groupSizes =
    remoteData?.groupSizes ?? discoveryGroupSizes([], totalResults);
  const totalPages = Math.max(1, groupSizes.length);
  const safePage = Math.min(page, totalPages);
  const stacked = mobile === true;
  const pageItems = useMemo(
    () =>
      remoteData
        ? profileItems
        : filteredProfiles.slice(
            stacked ? 0 : (safePage - 1) * DISCOVERY_PAGE_SIZE,
            safePage * DISCOVERY_PAGE_SIZE,
          ),
    [filteredProfiles, safePage, remoteData, profileItems, stacked],
  );
  const displayedItems = useMemo(
    () =>
      Object.keys(moderationOverrides).length
        ? pageItems.map((profile) =>
            moderationOverrides[profile.id]
              ? { ...profile, moderation: moderationOverrides[profile.id] }
              : profile,
          )
        : pageItems,
    [pageItems, moderationOverrides],
  );
  const stackPending =
    stacked &&
    pageItems.length <
      groupSizes.slice(0, safePage).reduce((sum, size) => sum + size, 0);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const skipInitialRefresh = useRef(Boolean(discoveryData) && !feedError);
  const hasLoaded = useRef(Boolean(discoveryData));
  const appliedUrl = useRef<string | null>(null);
  const unmounting = useRef(false);
  useEffect(
    () => () => {
      unmounting.current = true;
    },
    [],
  );
  const receiveQuery = useCallback((query: string) => {
    if (lastWrittenQuery.current === query) {
      lastWrittenQuery.current = null;
      return;
    }
    lastWrittenQuery.current = null;
    const params = new URLSearchParams(query);
    const state = parseDiscoveryState(params);
    requestRef.current?.abort();
    setFilterValues(state.filterValues);
    setSearchQuery(state.searchQuery);
    setDebouncedSearch(state.searchQuery);
    setSelectedTags(state.selectedTags);
    setSortValue(state.sortValue);
    setPage(state.page);
    setQueryAuthError(params.get('authError') ?? undefined);
    setUrlQuery(query);
  }, []);

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
  const [loadedUrl, setLoadedUrl] = useState(requestUrl);

  const refreshDiscovery = useCallback(
    async (trigger?: 'query' | 'refresh') => {
      if (!remote || urlQuery === null || mobile === null) return;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const generation = discoveryCache.begin(requestUrl);
      if (
        !DISCOVERY_SKELETON_ENABLED &&
        trigger &&
        hasLoaded.current &&
        !settleRequest.current &&
        !barSettle.current
      )
        navigate(
          () =>
            new Promise<void>((resolve) => {
              barSettle.current = resolve;
            }),
        );
      setIsRefreshing(true);
      setRefreshFailed(false);
      try {
        let data: DiscoveryData;
        if (fetchOnMount && !hasLoaded.current) {
          const bootstrap = await traceDiscoveryRequest<{
            viewer: DiscoveryViewer;
            data: DiscoveryData;
          }>(
            'bootstrap',
            requestUrl.replace('/api/discovery?', '/api/discovery/bootstrap?'),
            controller.signal,
          );
          discoveryCache.setViewer(bootstrap.viewer);
          discoveryCache.set(requestUrl, bootstrap.data, generation);
          if (controller.signal.aborted) return;
          onViewer?.(bootstrap.viewer);
          data = bootstrap.data;
        } else {
          data = await traceDiscoveryRequest<DiscoveryData>(
            'discovery',
            requestUrl,
            controller.signal,
            trigger,
          );
          discoveryCache.set(requestUrl, data, generation);
          if (controller.signal.aborted) return;
        }
        hasLoaded.current = true;
        appliedUrl.current = requestUrl;
        setRemoteData(data);
        setProfileItems(withoutBlocked(data.profiles));
        setPage(data.page);
        setLoadedUrl(requestUrl);
      } catch {
        if (!controller.signal.aborted) setRefreshFailed(true);
      } finally {
        if (!controller.signal.aborted) setIsRefreshing(false);
        if (requestRef.current === controller) {
          requestRef.current = null;
          barSettle.current?.();
          barSettle.current = null;
        }
      }
    },
    [remote, urlQuery, mobile, requestUrl, fetchOnMount, onViewer, navigate],
  );

  const countResults = useCallback(
    async (draft: FilterDraft, signal: AbortSignal) => {
      if (!remote) {
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
    [remote, profileItems, viewerContext, searchQuery, debouncedSearch, locale],
  );

  useEffect(() => {
    if (
      remote &&
      (urlQuery === null || mobile === null || searchQuery !== debouncedSearch)
    )
      return;
    const refresh = refreshDiscovery;
    const profilesChanged = () => refresh('refresh');
    if (skipInitialRefresh.current) skipInitialRefresh.current = false;
    else refresh('query');
    const focus = () => {
      if (!requestRef.current) void refresh();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('pageshow', restored);
    window.addEventListener('polycord:profiles-changed', profilesChanged);
    return () => {
      if (!unmounting.current) requestRef.current?.abort();
      window.removeEventListener('focus', focus);
      window.removeEventListener('pageshow', restored);
      window.removeEventListener('polycord:profiles-changed', profilesChanged);
    };
  }, [
    refreshDiscovery,
    remote,
    urlQuery,
    mobile,
    searchQuery,
    debouncedSearch,
  ]);

  useLayoutEffect(() => {
    if (!remote || urlQuery === null || appliedUrl.current === requestUrl)
      return;
    const cached = discoveryCache.get(requestUrl);
    if (!cached) return;
    appliedUrl.current = requestUrl;
    setRemoteData(cached);
    setProfileItems(withoutBlocked(cached.profiles));
    setPage(cached.page);
    setLoadedUrl(requestUrl);
  }, [remote, urlQuery, requestUrl]);

  const restoreScroll = useCallback(() => {
    if (
      mobile === null ||
      stackPending ||
      isLoading ||
      (remote && (!remoteData || loadedUrl !== requestUrl))
    )
      return;
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
  }, [
    mobile,
    stackPending,
    isLoading,
    remote,
    remoteData,
    loadedUrl,
    requestUrl,
  ]);

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
    if (urlQuery === null) return;
    const query = buildDiscoveryQuery(
      { filterValues, searchQuery, selectedTags, sortValue, page },
      new URLSearchParams(window.location.search),
    );

    if (query === new URLSearchParams(window.location.search).toString()) {
      return;
    }

    lastWrittenQuery.current = query;
    window.history.replaceState(
      null,
      '',
      `${query ? `${pathname}?${query}` : pathname}${window.location.hash}`,
    );
  }, [
    filterValues,
    searchQuery,
    selectedTags,
    sortValue,
    page,
    pathname,
    urlQuery,
  ]);

  const showSkeleton = (isLoading || (remote && !remoteData)) && !refreshFailed;
  useEffect(() => {
    if (urlQuery !== null && mobile !== null) markControlsReady();
  }, [urlQuery, mobile]);
  const handleGridReady = useCallback(() => {
    restoreScroll();
    if (
      !isLoading &&
      !isRefreshing &&
      loadedUrl === requestUrl &&
      hasLoaded.current
    )
      finishLoadTrace();
  }, [restoreScroll, isLoading, isRefreshing, loadedUrl, requestUrl]);

  const trackRequest = () => {
    requestRef.current?.abort();
    settleRequest.current?.();
    setRefreshFailed(false);
    setAwaitingResults(true);
    navigate(
      () =>
        new Promise<void>((resolve) => {
          settleRequest.current = resolve;
        }),
    );
  };

  const handleSearchChange = (value: string) => {
    requestRef.current?.abort();
    setSearchQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: DiscoverySortValue) => {
    setSortValue(value);
    setPage(1);
    trackRequest();
  };

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    setFilterValues((previous) => ({ ...previous, [filterId]: value }));
    setPage(1);
    trackRequest();
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setPage(1);
    trackRequest();
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
    trackRequest();
  };

  const handleApplyFilters = (draft: FilterDraft) => {
    setFilterValues(draft.filterValues);
    setSelectedTags(draft.selectedTags);
    setSortValue(draft.sortValue);
    setPage(1);
    trackRequest();
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
    if (!selectedTags.includes(tag) && selectedTags.length >= MAX_SELECTED_TAGS)
      return;
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((value) => value !== tag)
        : [...previous, tag],
    );
    setPage(1);
    trackRequest();
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setPage(1);
    trackRequest();
  };

  const handleAddTagFilter = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length >= MAX_SELECTED_TAGS)
      return;
    setSelectedTags((previous) =>
      previous.includes(tag) ? previous : [...previous, tag],
    );
    setPage(1);
    trackRequest();
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
    trackRequest();
  };

  const handleViewProfile = (profileId: string) => {
    const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.push(`/${locale}/u/${profileId}?from=${encodeURIComponent(href)}`);
  };

  const handleShareProfile = async (profileId: string) => {
    const profile = profileItems.find((item) => item.id === profileId);
    if (
      await copyText(
        buildPublicProfileUrl(locale, profile ?? { id: profileId }),
      )
    ) {
      if (profileId !== currentProfileId) recordProfileShare(profileId);
      addToast({
        title: t('shareCopiedTitle'),
        description: t('shareCopiedDescription'),
        iconUrl: profile?.avatarUrl,
        duration: BUMP_TOAST_DURATION,
      });
    } else {
      addToast({
        title: t('shareErrorTitle'),
        variant: 'error',
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

  const handleModerateProfile = (
    profileId: string,
    trigger: HTMLElement | null,
  ) => {
    const target = profileItems.find((profile) => profile.id === profileId);
    setModerationTarget({
      id: profileId,
      name: target?.displayName ?? '',
      trigger,
      preview: {
        username: target?.discordUsername,
        avatarUrl: target?.avatarUrl,
        state: moderationOverrides[profileId] ?? target?.moderation,
      },
    });
  };

  const handleModerateIntent = useCallback((profileId: string) => {
    preloadModeration();
    prefetchCase(profileId);
  }, []);

  const handleModerationChange = useCallback(
    (state: ModState) => {
      const id = moderationTarget?.id;
      if (id)
        setModerationOverrides((current) => ({ ...current, [id]: state }));
    },
    [moderationTarget?.id],
  );

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
        variant: 'error',
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
      refreshDiscovery('refresh');
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
        variant: 'error',
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
    if (!mobile) {
      setProfileItems((previous) =>
        previous.filter((profile) => profile.id !== profileId),
      );
    }

    try {
      await blockProfileRequest(profileId, true);
      if (mobile) {
        setProfileItems((previous) =>
          previous.filter((profile) => profile.id !== profileId),
        );
      }
      refreshDiscovery('refresh');
      addToast({
        title: t('blockSuccessTitle'),
        description: t('blockSuccessDescription'),
        action: {
          label: t('blockUndo'),
          onClick: () => handleUndoBlock(profileId, blocked, index),
        },
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
        variant: 'error',
        description: t('blockErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    trackRequest();
  };

  useLayoutEffect(() => {
    if (!awaitingResults || isRefreshing) return;
    if (remote && loadedUrl !== requestUrl && !refreshFailed) return;
    window.scrollTo(0, 0);
    settleRequest.current?.();
    settleRequest.current = null;
    setAwaitingResults(false);
  }, [
    awaitingResults,
    isRefreshing,
    remote,
    loadedUrl,
    requestUrl,
    refreshFailed,
  ]);

  const initialSettle = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (DISCOVERY_SKELETON_ENABLED || !showSkeleton || initialSettle.current)
      return;
    navigate(
      () =>
        new Promise<void>((resolve) => {
          initialSettle.current = resolve;
        }),
    );
  }, [showSkeleton, navigate]);
  useEffect(() => {
    if (showSkeleton) return;
    initialSettle.current?.();
    initialSettle.current = null;
  }, [showSkeleton]);

  useEffect(
    () => () => {
      settleRequest.current?.();
      initialSettle.current?.();
      barSettle.current?.();
    },
    [],
  );

  useProfileBump({
    profileId: currentProfileId,
    readyAt: bumpReadyAt,
    avatarUrl: userAvatarUrl,
    addToast,
    request: onBumpProfile,
    onBumped: async (result) => {
      await refreshDiscovery('refresh');
      if (!remote)
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
    },
  });

  if (!DISCOVERY_SKELETON_ENABLED && showSkeleton)
    return (
      <>
        <UrlObserver onChange={receiveQuery} />
        <output className="sr-only">{t('resultsSearching')}</output>
      </>
    );

  return (
    <>
      <UrlObserver onChange={receiveQuery} />
      {needsOnboarding && !isPromptDismissed ? (
        <aside className="fixed right-4 bottom-[calc(var(--dock-space,0px)+16px)] z-40 w-[min(420px,calc(100vw-2rem))] rounded-lg bg-background-darker p-4 pr-11 shadow-xl">
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

      <main className={`${siteContainerClass} py-8`}>
        <h1 className="sr-only">{t('pageTitle')}</h1>
        {authError || queryAuthError ? (
          <div
            className="mb-6 rounded-md border border-red-400/40 bg-danger-surface px-4 py-3 font-figtree text-danger text-sm"
            role="alert"
          >
            <p className="font-semibold">
              {t(
                (authError ?? queryAuthError) === 'suspended'
                  ? 'authErrorSuspendedTitle'
                  : 'authErrorTitle',
              )}
            </p>
            <p className="mt-1 text-danger">
              {t(
                (authError ?? queryAuthError) === 'suspended'
                  ? 'authErrorSuspendedDescription'
                  : 'authErrorDescription',
              )}
            </p>
          </div>
        ) : null}

        <div className="max-md:-mx-4 max-md:-mt-2 mb-[14px] max-md:sticky max-md:top-0 max-md:z-10 max-md:bg-background-main max-md:px-4 max-md:py-2">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
        </div>
        <div className="mb-[26px] flex flex-col gap-[14px]">
          <div className={fetchOnMount ? 'min-h-[96px]' : undefined}>
            {remote && !remoteData ? (
              <div
                aria-hidden="true"
                className="h-24 animate-pulse rounded-lg bg-background-darker"
              />
            ) : tagCounts.length > 0 ? (
              <TagCloud
                tags={tagCounts}
                selected={selectedTags}
                onToggle={handleToggleTag}
                onClear={handleClearTags}
                collapsible={mobile === true}
                applied={mobile === true ? appliedFilters : undefined}
              />
            ) : null}
          </div>
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
              onClick={() => refreshDiscovery('query')}
            >
              {t('retryFeed')}
            </button>
          </div>
        ) : null}
        {(!refreshFailed || profileItems.length > 0) && (
          <>
            <h2 className="sr-only">{t('resultsHeading')}</h2>
            <div className="mb-[18px] flex flex-wrap items-center gap-2">
              <span
                aria-live="polite"
                className="font-semibold text-[15px] text-primary"
              >
                {DISCOVERY_SKELETON_ENABLED &&
                (showSkeleton || (isRefreshing && !awaitingResults))
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
                profiles={displayedItems}
                onReady={handleGridReady}
                isLoggedIn={isLoggedIn}
                savedProfileIds={remoteData?.savedProfileIds ?? savedProfileIds}
                currentProfileId={currentProfileId}
                viewerTimezone={viewerTimezone}
                onSaveProfile={saveProfileRequest}
                onCopyUsername={(_username, profileId) => {
                  notifyUsernameCopied(profileId).catch(() => {});
                }}
                onViewProfile={handleViewProfile}
                onShare={handleShareProfile}
                onModerate={staff ? handleModerateProfile : undefined}
                onModerateIntent={staff ? handleModerateIntent : undefined}
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

      {staff && moderationTarget && mobile ? (
        <MobileTakeAction
          profileId={moderationTarget.id}
          displayName={moderationTarget.name}
          meId={staff.meId}
          meRole={staff.role}
          addToast={addToast}
          preview={moderationTarget.preview}
          onClose={() => setModerationTarget(null)}
          onStateChange={handleModerationChange}
        />
      ) : null}
      {staff && moderationTarget && !mobile ? (
        <TakeActionPanel
          profileId={moderationTarget.id}
          displayName={moderationTarget.name}
          meId={staff.meId}
          meRole={staff.role}
          returnFocus={moderationTarget.trigger}
          preview={moderationTarget.preview}
          onClose={() => setModerationTarget(null)}
          onStateChange={handleModerationChange}
        />
      ) : null}

      {reportTarget ? (
        <ReportDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setReportTarget(null);
            }
          }}
          profileName={reportTarget.name}
          onSubmit={handleSubmitReport}
        />
      ) : null}

      <BackToTop count={appliedFilters.length + selectedTags.length} />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
