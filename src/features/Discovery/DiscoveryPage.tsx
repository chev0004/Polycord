'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { FilterBar } from '@/components/Filter';
import { ToastStack } from '@/components/Toast';
import type { AvailabilityPattern } from '@/constants/availability';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import {
  getMissingRequiredFields,
  getOnboardingCompletion,
  ONBOARDING_DRAFT_STORAGE_KEY,
  type OnboardingDraft,
} from '@/features/Onboarding/completion';
import { useToastStack } from '@/hooks/useToast';
import {
  BumpProfileError,
  type BumpProfileResponse,
  bumpProfileRequest,
} from './bumpProfileRequest';
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
import { buildDiscoveryQuery, parseDiscoveryState } from './discoveryUrlState';
import { Pagination } from './Pagination';
import type { DiscoveryProfile } from './ProfileCard';
import { ProfileGrid } from './ProfileGrid';
import { ProfileGridSkeleton } from './ProfileGridSkeleton';
import { SearchBar } from './SearchBar';
import { SortMenu } from './SortMenu';
import { saveProfileRequest } from './saveProfileRequest';
import { TagCloud } from './TagCloud';

const SEARCH_TRANSITION_MS = 320;
const PER_PAGE = 9;

type DiscoveryPageProps = {
  authError?: string;
  feedError?: boolean;
  isLoading?: boolean;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding?: boolean;
  profiles?: DiscoveryProfile[];
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
  authError,
  feedError = false,
  isLoading = false,
  isLoggedIn,
  locale,
  needsOnboarding = false,
  profiles = [],
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
  const t = useTranslations('Discovery');
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
  const [isSearching, setIsSearching] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [profileItems, setProfileItems] = useState(profiles);
  const [isBumping, setIsBumping] = useState(false);
  const [bumpReadyAt, setBumpReadyAt] = useState(initialBumpReadyAt);
  const { toasts, addToast, dismissToast } = useToastStack();

  useEffect(() => {
    setProfileItems(profiles);
  }, [profiles]);

  useEffect(() => {
    setBumpReadyAt(initialBumpReadyAt);
  }, [initialBumpReadyAt]);

  useEffect(() => {
    if (!needsOnboarding) {
      return;
    }

    const rawDraft = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      setDraft({});
      return;
    }

    try {
      setDraft(JSON.parse(rawDraft) as OnboardingDraft);
    } catch {
      localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      setDraft({});
    }
  }, [needsOnboarding]);

  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(draft),
    [draft],
  );

  const completion = useMemo(() => getOnboardingCompletion(draft), [draft]);

  const tagCounts = useMemo(() => buildTagCounts(profileItems), [profileItems]);

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
      applyDiscoverySort(
        applyTagFilter(
          applyDiscoverySearch(
            applyDiscoveryFilters(profileItems, filterValues, viewerContext),
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
    ],
  );

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () =>
      filteredProfiles.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filteredProfiles, safePage],
  );

  useEffect(() => {
    const query = buildDiscoveryQuery(
      { filterValues, searchQuery, selectedTags, sortValue, page: safePage },
      new URLSearchParams(window.location.search),
    );

    if (query === new URLSearchParams(window.location.search).toString()) {
      return;
    }

    window.history.replaceState(
      null,
      '',
      query ? `${pathname}?${query}` : pathname,
    );
  }, [filterValues, searchQuery, selectedTags, sortValue, safePage, pathname]);

  useEffect(() => {
    if (!searchQuery) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => setIsSearching(false), SEARCH_TRANSITION_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showSkeleton = isLoading || isSearching;

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

  return (
    <div className="min-h-screen bg-background-main text-white">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn={isLoggedIn}
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onBumpProfileClick={handleBumpProfile}
        bumpReadyAt={bumpReadyAt}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        {authError ? (
          <div
            className="mb-6 rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 font-figtree text-red-100 text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('authErrorTitle')}</p>
            <p className="mt-1 text-red-100/80">{t('authErrorDescription')}</p>
          </div>
        ) : null}

        <div className="mb-[26px] flex flex-col gap-[14px]">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
          {tagCounts.length > 0 ? (
            <TagCloud
              tags={tagCounts}
              selected={selectedTags}
              onToggle={handleToggleTag}
              onClear={handleClearTags}
            />
          ) : null}
          <FilterBar
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

        {feedError ? (
          <div
            className="rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 font-figtree text-red-100 text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('feedErrorTitle')}</p>
            <p className="mt-1 text-red-100/80">{t('feedErrorDescription')}</p>
          </div>
        ) : (
          <>
            <div
              ref={resultsHeadRef}
              className="mb-[18px] flex scroll-mt-8 items-center"
            >
              <span
                aria-live="polite"
                className="font-semibold text-[15px] text-primary"
              >
                {showSkeleton
                  ? t('resultsSearching')
                  : t('resultsCount', { count: filteredProfiles.length })}
              </span>
            </div>

            {showSkeleton ? (
              <ProfileGridSkeleton />
            ) : (
              <ProfileGrid
                profiles={pageItems}
                isLoggedIn={isLoggedIn}
                savedProfileIds={savedProfileIds}
                currentProfileId={currentProfileId}
                viewerTimezone={viewerTimezone}
                onSaveProfile={saveProfileRequest}
                addToast={addToast}
                emptyState={
                  hasActiveFilters ? undefined : t('emptyFeedDescription')
                }
              />
            )}

            {showSkeleton ? null : (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      {needsOnboarding && !isPromptDismissed ? (
        <aside className="fixed right-4 bottom-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-lg bg-background-darker p-4 pr-11 shadow-xl">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/onboarding`)}
              className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <p className="font-figtree font-semibold text-white">
                {t('onboardingPromptTitle')}
              </p>
              <p className="mt-1 text-gray-400 text-sm">
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
              onClick={() => setIsPromptDismissed(true)}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-background-main hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={t('onboardingPromptDismiss')}
            >
              <MdClose size={16} />
            </button>
          </div>
        </aside>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
