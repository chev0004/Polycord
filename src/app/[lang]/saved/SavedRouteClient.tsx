'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { MdBookmarkBorder, MdErrorOutline } from 'react-icons/md';
import { Button } from '@/components/Button';
import { FilterBar } from '@/components/Filter';
import type { AvailabilityPattern } from '@/constants/availability';
import {
  applyDiscoveryFilters,
  type DiscoveryFilterValues,
  useDiscoveryFilterDefs,
} from '@/features/Discovery/discoveryFilters';
import { applyDiscoverySearch } from '@/features/Discovery/discoverySearch';
import {
  applyDiscoverySort,
  DEFAULT_SORT,
  type DiscoverySortValue,
  SORT_OPTIONS,
} from '@/features/Discovery/discoverySort';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import {
  type FilterDraft,
  FilterSheet,
  SortSheet,
} from '@/features/Discovery/MobileFilters';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ProfileGrid } from '@/features/Discovery/ProfileGrid';
import { SearchBar } from '@/features/Discovery/SearchBar';
import { SortMenu } from '@/features/Discovery/SortMenu';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { BackButton } from '@/features/Navigation/BackButton';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { useProfileActions } from '@/features/Profile/useProfileActions';

type SavedRouteClientProps = {
  locale: string;
  profiles: DiscoveryProfile[];
  currentProfileId?: string;
  loadError?: boolean;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
};

export const SavedRouteClient = ({
  locale,
  profiles: initialProfiles,
  currentProfileId,
  loadError = false,
  viewerTimezone,
  viewerAvailability,
}: SavedRouteClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Saved');
  const tDiscovery = useTranslations('Discovery');
  const tNavigation = useTranslations('Navigation');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<DiscoveryFilterValues>({});
  const [sortValue, setSortValue] = useState<DiscoverySortValue>(DEFAULT_SORT);
  const viewerHasAvailability = Boolean(viewerAvailability);
  const filterDefs = useDiscoveryFilterDefs({ viewerHasAvailability });
  const sortOptions = viewerHasAvailability
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((option) => option !== 'overlap-desc');
  const viewer = useMemo(
    () => ({ timezone: viewerTimezone, availability: viewerAvailability }),
    [viewerTimezone, viewerAvailability],
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const actions = useProfileActions(locale, true, (id) => {
    setRemovedIds((previous) => [...previous, id]);
    router.refresh();
  });
  const savedProfileIds = useMemo(
    () => initialProfiles.map((profile) => profile.id),
    [initialProfiles],
  );

  const { refresh } = router;

  useEffect(() => {
    const refreshRestored = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    refresh();
    window.addEventListener('pageshow', refreshRestored);
    return () => window.removeEventListener('pageshow', refreshRestored);
  }, [refresh]);

  const profiles = initialProfiles.filter(
    (profile) => !removedIds.includes(profile.id),
  );
  const matchCount = (values: DiscoveryFilterValues) =>
    applyDiscoverySearch(
      applyDiscoveryFilters(profiles, values, viewer),
      searchQuery,
      locale,
    ).length;
  const shownProfiles = applyDiscoverySort(
    applyDiscoverySearch(
      applyDiscoveryFilters(profiles, filterValues, viewer),
      searchQuery,
      locale,
    ),
    sortValue,
    viewer,
  );

  const handleApplyFilters = (draft: FilterDraft) => {
    setFilterValues(draft.filterValues);
    setSortValue(draft.sortValue);
  };

  const handleProfileUnsaved = (profileId: string) => {
    setRemovedIds((previous) => [...previous, profileId]);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        <BackButton
          href={`/${locale}`}
          label={tNavigation('backToDiscovery')}
        />
        <header className="mb-[26px] flex flex-col gap-1.5">
          <span className="font-semibold text-primary text-xs uppercase tracking-wide">
            {t('eyebrow')}
          </span>
          <h1 className="font-figtree font-semibold text-2xl text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted text-sm">{t('subtitle')}</p>
        </header>

        {loadError ? (
          <div
            role="alert"
            className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-red-800 bg-danger-surface px-6 py-12 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-danger">
              <MdErrorOutline size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('errorTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('errorDescription')}
            </p>
            <Button variant="primary" onClick={() => router.refresh()}>
              {t('errorRetry')}
            </Button>
          </div>
        ) : profiles.length > 0 ? (
          <>
            <div className="max-md:-mx-4 max-md:-mt-2 mb-[14px] max-md:sticky max-md:top-0 max-md:z-10 max-md:bg-background-main max-md:px-4 max-md:py-2">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <FilterBar
              className="mb-[26px] max-md:hidden"
              filters={filterDefs}
              values={filterValues}
              onFilterChange={(filterId, value) =>
                setFilterValues((previous) => ({
                  ...previous,
                  [filterId]: value,
                }))
              }
              onClearFilters={() => setFilterValues({})}
              sortControl={
                <SortMenu
                  value={sortValue}
                  onChange={setSortValue}
                  options={sortOptions}
                />
              }
            />
            <div className="mb-[18px] flex flex-wrap items-center gap-2">
              <span
                aria-live="polite"
                className="font-semibold text-[15px] text-primary"
              >
                {tDiscovery('resultsCount', { count: shownProfiles.length })}
              </span>
              <div className="ml-auto flex min-w-0 items-center gap-1 md:hidden">
                <SortSheet
                  value={sortValue}
                  options={sortOptions}
                  onChange={setSortValue}
                />
                <FilterSheet
                  filters={filterDefs}
                  tags={[]}
                  sortOptions={sortOptions}
                  value={{ filterValues, selectedTags: [], sortValue }}
                  onApply={handleApplyFilters}
                  countResults={async (draft) => matchCount(draft.filterValues)}
                />
              </div>
            </div>
            <ProfileGrid
              profiles={shownProfiles}
              emptyState={t('noMatchesDescription')}
              isLoggedIn
              savedProfileIds={savedProfileIds}
              currentProfileId={currentProfileId}
              onSaveProfile={saveProfileRequest}
              onProfileUnsaved={handleProfileUnsaved}
              viewerTimezone={viewerTimezone}
              onCopyUsername={(_username, id) => {
                void notifyUsernameCopied(id).catch(() => {});
              }}
              onViewProfile={(id) =>
                router.push(
                  `/${locale}/u/${id}?from=${encodeURIComponent(`/${locale}/saved`)}`,
                )
              }
              onShare={actions.share}
              onReport={(id) => {
                const profile = profiles.find((item) => item.id === id);
                if (profile) actions.report(profile);
              }}
              onBlock={actions.block}
              onTagClick={(tag) =>
                router.push(buildDiscoveryFilterHref(locale, 'tag', tag))
              }
              onLanguageClick={(language, _level, primary) =>
                router.push(
                  buildDiscoveryFilterHref(
                    locale,
                    primary ? 'primaryLanguage' : 'targetLanguage',
                    language,
                  ),
                )
              }
              onCountryClick={(country) =>
                router.push(
                  buildDiscoveryFilterHref(locale, 'country', country),
                )
              }
              addToast={actions.addToast}
            />
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary-dark border-dashed bg-background-darker px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-darker text-primary">
              <MdBookmarkBorder size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('emptyTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('emptyDescription')}
            </p>
            <Button variant="primary" onClick={() => router.push(`/${locale}`)}>
              {t('emptyAction')}
            </Button>
          </div>
        )}
      </main>
      {actions.feedback}
    </>
  );
};
