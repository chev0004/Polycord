import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { DiscoveryFilterValues } from './discoveryFilters';
import {
  DEFAULT_SORT,
  type DiscoverySortValue,
  SORT_OPTIONS,
} from './discoverySort';

export type DiscoveryUrlState = {
  filterValues: DiscoveryFilterValues;
  searchQuery: string;
  selectedTags: string[];
  sortValue: DiscoverySortValue;
  page: number;
};

type ReadableParams = URLSearchParams | ReadonlyURLSearchParams;

const SEARCH_PARAM = 'q';
const TAGS_PARAM = 'tag';
const SORT_PARAM = 'sort';
const PAGE_PARAM = 'page';
const PROFICIENCY_PARAM = 'level';
const PROFICIENCY_FILTER_ID = 'proficiency';

const MULTI_FILTER_PARAMS = [
  ['primaryLanguage', 'primary'],
  ['targetLanguage', 'target'],
  ['country', 'country'],
  ['timezone', 'tz'],
] as const;

const MANAGED_PARAMS = [
  SEARCH_PARAM,
  TAGS_PARAM,
  SORT_PARAM,
  PAGE_PARAM,
  PROFICIENCY_PARAM,
  ...MULTI_FILTER_PARAMS.map(([, param]) => param),
];

const isSortValue = (value: string | null): value is DiscoverySortValue =>
  value !== null && (SORT_OPTIONS as readonly string[]).includes(value);

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
};

const toFirstValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

export const parseDiscoveryState = (
  params: ReadableParams,
): DiscoveryUrlState => {
  const filterValues: DiscoveryFilterValues = {};

  for (const [id, param] of MULTI_FILTER_PARAMS) {
    const values = params.getAll(param);
    if (values.length > 0) {
      filterValues[id] = values;
    }
  }

  const proficiency = params.get(PROFICIENCY_PARAM);
  if (proficiency) {
    filterValues[PROFICIENCY_FILTER_ID] = proficiency;
  }

  const sort = params.get(SORT_PARAM);

  return {
    filterValues,
    searchQuery: params.get(SEARCH_PARAM) ?? '',
    selectedTags: params.getAll(TAGS_PARAM),
    sortValue: isSortValue(sort) ? sort : DEFAULT_SORT,
    page: parsePage(params.get(PAGE_PARAM)),
  };
};

export const buildDiscoveryQuery = (
  state: DiscoveryUrlState,
  base?: ReadableParams,
): string => {
  const params = new URLSearchParams(base ? base.toString() : undefined);
  for (const param of MANAGED_PARAMS) {
    params.delete(param);
  }

  for (const [id, param] of MULTI_FILTER_PARAMS) {
    const value = state.filterValues[id];
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(param, entry);
      }
    } else if (value) {
      params.append(param, value);
    }
  }

  const proficiency = toFirstValue(state.filterValues[PROFICIENCY_FILTER_ID]);
  if (proficiency) {
    params.set(PROFICIENCY_PARAM, proficiency);
  }

  for (const tag of state.selectedTags) {
    params.append(TAGS_PARAM, tag);
  }

  if (state.searchQuery.trim()) {
    params.set(SEARCH_PARAM, state.searchQuery);
  }
  if (state.sortValue !== DEFAULT_SORT) {
    params.set(SORT_PARAM, state.sortValue);
  }
  if (state.page > 1) {
    params.set(PAGE_PARAM, String(state.page));
  }

  return params.toString();
};
