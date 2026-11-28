import { expect, test } from 'bun:test';
import {
  type Catalogue,
  indexPlacements,
  outstanding,
  reviewSections,
  sectionPending,
} from './placements';
import {
  type Finding,
  type Inventory,
  locales,
  readCheckpoint,
  updateWording,
  verified,
  verifyLine,
  wording,
  wordingError,
} from './review-state';
import { clean, keysIn, tagKey } from './tags';

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
});

test('unlocks multiple placements with one check per language', () => {
  let review = readCheckpoint(html, JSON.stringify(modelContent));
  const catalogue: Catalogue = { scenes: {}, errors: [] };
  const privacy = reviewSections[0];
  for (const scene of privacy.scenes) {
    const id = JSON.stringify([finding.key, scene.id, 'Text', 'h2:1']);
    catalogue.scenes[scene.id] = Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          actions: [],
          scope: '',
          occurrences: [
            {
              id,
              key: finding.key,
              surface: 'Text',
              text:
                scene.viewport === 'mobile'
                  ? 'Fixture value 1'
                  : 'Fixture value 2',
            },
          ],
        },
      ]),
    );
  }

  const placements = indexPlacements(catalogue);
  expect(placements.get(finding.key)).toHaveLength(2);
  expect(sectionPending(review, privacy, [finding], placements)).toBe(true);
  review = verifyLine(review, finding, 'en');
  expect(sectionPending(review, privacy, [finding], placements)).toBe(true);
  review = verifyLine(review, finding, 'ja');
  expect(sectionPending(review, privacy, [finding], placements)).toBe(false);

  const updated = updateWording(review, {
    picks: { [finding.key]: { source: 'custom', text: { ja: '新しい設定' } } },
  });
  expect(
    outstanding(updated, finding, placements.get(finding.key) ?? []).map(
      ({ locale }) => locale,
    ),
  ).toEqual(['ja']);
  expect(verified(updated, finding, 'en')).toBe(true);
  expect(updated.per.develop).toBe(review.per.develop);
  expect(sectionPending(updated, privacy, [finding], placements)).toBe(true);
  const reverted = updateWording(updated, { picks: review.per.now.picks });
  expect(verified(reverted, finding, 'ja')).toBe(false);
});

test('preserves packed checkpoint indexing when removing unused keys', () => {
  const packet = {
    ...inventory,
    issues: [{ ...finding, key: 'Inbox.simulateTitle' }, finding],
  };
  const review = readCheckpoint(
    `<script id="lr-data">${JSON.stringify(packet)}</script>`,
    JSON.stringify({
      ...modelContent,
      per: {
        now: {
          picks: [
            [0, 'K'],
            [1, 'C'],
          ],
        },
      },
    }),
  );
  expect(review.inventory.issues.map(({ key }) => key)).toEqual([finding.key]);
  expect(review.per.now.picks).toEqual({ [finding.key]: { source: 'codex' } });
});

test('round trips source keys without changing clean Japanese and English text', () => {
  const tagged = `Privacy${tagKey('Profile.privacySettings')} プライバシー${tagKey('Settings.privacyTitle')}`;
  expect(keysIn(tagged)).toEqual([
    'Profile.privacySettings',
    'Settings.privacyTitle',
  ]);
  expect(clean(tagged)).toBe('Privacy プライバシー');
  expect(keysIn(clean(tagged))).toEqual([]);
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
