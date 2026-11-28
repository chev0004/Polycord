import { expect, test } from 'bun:test';
import {
  indexPlacements,
  outstanding,
  reviewSections,
  sectionPending,
} from './placements';
import {
  type Finding,
  type Inventory,
  locales,
  type Observation,
  readCheckpoint,
  updateWording,
  wording,
  wordingError,
} from './review-state';

const finding: Finding = {
  key: 'Profile.privacySettings',
  area: 'Profile & onboarding',
  original: {
    develop: { en: 'Privacy Settings', ja: 'プライバシー設定' },
    now: { en: 'Privacy settings', ja: '公開設定' },
  },
  options: { codex: { ja: 'プライバシー' } },
  refs: [],
};

const inventory: Inventory = {
  issues: [finding],
  rules: [
    {
      id: 'visibility',
      label: 'Visibility',
      keys: [finding.key],
      options: [
        {
          id: 'public',
          label: 'Public',
          patch: { [finding.key]: { en: 'Public settings' } },
        },
      ],
    },
  ],
  notes: [],
  bases: { develop: 'Develop', now: 'Working tree' },
};

const html = `<script id="lr-data" type="application/json">${JSON.stringify(inventory)}</script>`;
const modelContent = {
  version: 1,
  toneRevision: 1,
  base: 'now',
  packed: true,
  per: {
    develop: { picks: [[0, 'E', { en: 'Visibility settings' }]] },
    now: { terms: { visibility: 'public' }, picks: [[0, 'C']] },
  },
};

test('imports packed checkpoint choices as locale keys in both snapshots', () => {
  const review = readCheckpoint(html, JSON.stringify({ modelContent }));
  expect(review.per.now.picks).toEqual({ [finding.key]: { source: 'codex' } });
  expect(review.per.develop.picks[finding.key]).toEqual({
    source: 'custom',
    text: { en: 'Visibility settings' },
  });
  expect(wording(review, finding)).toEqual({
    en: 'Public settings',
    ja: 'プライバシー',
  });
  expect(review.per.develop.checks).toEqual({});
  expect(review.per.now.checks).toEqual({});
  expect(review.per.now.observations).toEqual({});
});

test('gates a section on each placement and invalidates only changed wording', () => {
  const review = readCheckpoint(html, JSON.stringify(modelContent));
  const state = review.per.now;
  const privacy = reviewSections[0];
  for (const scene of privacy.scenes) {
    const id = JSON.stringify([finding.key, scene.id, 'Text', 'h2:1']);
    state.observations[scene.id] = Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          occurrences: [
            {
              id,
              key: finding.key,
              surface: 'Text',
              text: wording(review, finding)[locale] as string,
            },
          ],
        } satisfies Observation,
      ]),
    );
    state.checks[id] = { en: 'Public settings' };
  }

  let placements = indexPlacements(state);
  expect(sectionPending(review, privacy, [finding], placements)).toBe(true);
  for (const check of Object.values(state.checks)) check.ja = 'プライバシー';
  expect(sectionPending(review, privacy, [finding], placements)).toBe(false);

  const updated = updateWording(review, {
    picks: { [finding.key]: { source: 'custom', text: { ja: '新しい設定' } } },
  });
  placements = indexPlacements(updated.per.now);
  expect(
    outstanding(updated, finding, placements.get(finding.key) ?? []).map(
      ({ locale }) => locale,
    ),
  ).toEqual(['ja', 'ja']);
  expect(updated.per.develop).toBe(review.per.develop);
  expect(sectionPending(updated, privacy, [finding], placements)).toBe(true);
});

test('retains ICU parameters and rich text when editing copy', () => {
  const original =
    '<strong>{name}</strong> has {count, plural, one {# card} other {# cards}}';
  expect(
    wordingError(
      original,
      '{count, plural, one {# card} other {# cards}} for <strong>{name}</strong>',
    ),
  ).toBe('');
  expect(wordingError(original, '{name} has {count} cards')).toContain(
    'Preserve',
  );
  expect(wordingError(original, '<strong>{name}</strong> {count')).toContain(
    'Check',
  );
});
