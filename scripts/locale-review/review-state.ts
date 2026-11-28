import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import { unusedKeys } from './unused';

export const locales = ['en', 'ja'] as const;
export const snapshots = ['develop', 'now'] as const;
export type Locale = (typeof locales)[number];
export type Snapshot = (typeof snapshots)[number];
export type Wording = Partial<Record<Locale, string>>;

type Variant = Wording & {
  id: string;
  label: string;
  byBase?: Partial<Record<Snapshot, Wording>>;
};

export type Finding = {
  key: string;
  area: string;
  original: Record<Snapshot, Wording>;
  options: Record<string, Wording>;
  variants?: Variant[];
  refs: number[];
  noteOnly?: boolean;
  location?: { pages: [string, string][]; steps: string[] };
};

type RuleOption = {
  id: string;
  label: string;
  patch?: Record<string, Wording>;
  patterns?: Partial<Record<Locale, [string, string][]>>;
  style?: 'sentence' | 'compact';
  requires?: string;
};

export type Inventory = {
  issues: Finding[];
  rules: { id: string; label: string; keys: string[]; options: RuleOption[] }[];
  notes: { src: string; body: string }[];
  bases: Record<Snapshot, string>;
};

export type Choice = { source: string; text?: Wording };
export type Occurrence = {
  id: string;
  key: string;
  surface: string;
  text: string;
};
export type Observation = { occurrences: Occurrence[] };
export type SnapshotReview = {
  picks: Record<string, Choice>;
  terms: Record<string, string>;
  checks: Record<string, Wording>;
  section: string;
};
export type Review = {
  inventory: Inventory;
  base: Snapshot;
  per: Record<Snapshot, SnapshotReview>;
};

const sources: Record<string, string> = {
  C: 'codex',
  L: 'claude',
  K: 'keep',
  S: 'shared',
  E: 'custom',
};

type LegacyReview = {
  version: number;
  toneRevision: number;
  packed?: boolean;
  base: Snapshot;
  per: Partial<
    Record<
      Snapshot,
      {
        terms?: Record<string, string>;
        picks?: Record<string, Choice> | [number, string, Wording?][];
      }
    >
  >;
};

export function readCheckpoint(html: string, progress: string): Review {
  const packet = html.match(
    /<script\b[^>]*\bid=["']lr-data["'][^>]*>([\s\S]*?)<\/script>/,
  );
  if (!packet)
    throw new Error('Choose the saved locale-review-live.html file.');
  const inventory: Inventory = JSON.parse(packet[1]);
  if (
    !Array.isArray(inventory.issues) ||
    !inventory.issues.length ||
    !Array.isArray(inventory.rules) ||
    !Array.isArray(inventory.notes) ||
    !inventory.bases ||
    new Set(inventory.issues.map(({ key }) => key)).size !==
      inventory.issues.length
  ) {
    throw new Error('The saved review inventory is invalid.');
  }
  const saved = JSON.parse(progress);
  const model: LegacyReview = saved?.modelContent ?? saved;
  if (model?.version !== 1 || !model.per || !snapshots.includes(model.base)) {
    throw new Error('Choose the matching locale-review-progress.json file.');
  }

  const keys = new Set(inventory.issues.map(({ key }) => key));
  const per = {} as Review['per'];
  for (const base of snapshots) {
    const savedReview = model.per[base];
    const entries = savedReview?.picks ?? {};
    const picks = Array.isArray(entries)
      ? Object.fromEntries(
          entries.map(([id, source, text]) => {
            const finding = inventory.issues[id];
            if (!finding)
              throw new Error(
                'The saved review and progress files do not match.',
              );
            return [
              finding.key,
              { source: sources[source] ?? source, ...(text && { text }) },
            ];
          }),
        )
      : entries;
    if (Object.keys(picks).some((key) => !keys.has(key))) {
      throw new Error('The saved review and progress files do not match.');
    }
    per[base] = {
      picks: Object.fromEntries(
        Object.entries(picks).filter(([key]) => !unusedKeys.has(key)),
      ),
      terms: {
        ...savedReview?.terms,
        ...(model.toneRevision !== 1 && {
          case: 'sentence',
          polish: 'compact',
        }),
      },
      checks: {},
      section: 'profile-privacy',
    };
  }
  return {
    inventory: {
      ...inventory,
      issues: inventory.issues.filter(({ key }) => !unusedKeys.has(key)),
    },
    base: model.base,
    per,
  };
}

export function choiceOptions(
  inventory: Inventory,
  finding: Finding,
  base: Snapshot,
) {
  return [
    { id: 'keep', label: 'Keep original' },
    { id: 'shared', label: 'Use shared wording' },
    ...['codex', 'claude'].flatMap((id) => {
      const label = id === 'codex' ? 'Codex' : 'Claude';
      const hasNotes = finding.refs.some(
        (index) => inventory.notes[index]?.src === label,
      );
      return hasNotes || finding.options[id]
        ? [{ id, label, ...finding.options[id] }]
        : [];
    }),
    ...(finding.variants ?? []).map((option) => ({
      ...option,
      ...option.byBase?.[base],
      id: `alt:${option.id}`,
    })),
    { id: 'custom', label: 'Custom wording' },
  ] as (Wording & { id: string; label: string })[];
}

function sentenceCase(value: string) {
  return value.replace(/\b[A-Za-z]+\b/g, (word, index) => {
    if (
      /^(Discord|Polycord|Supporter|Discover|Discovery|ID|API|AM|PM|UTC)$/.test(
        word,
      )
    )
      return word;
    return index === 0
      ? word[0].toUpperCase() + word.slice(1).toLowerCase()
      : word.toLowerCase();
  });
}

function compactJapanese(value: string) {
  return value.replace(
    /^([^。！？\n]+(?:を|に|で|から)(?:表示|非表示|反映|設定|共有|保存|コピー|管理|通知|記録|選択|変更|追加|利用|確認|解除|参加|検索|削除|適用))(?:する|します)。?(?![\s\S])/u,
    '$1',
  );
}

function messageSignature(message: string) {
  const signature = new Set<string>();
  function visit(nodes: ReturnType<typeof parse>) {
    for (const node of nodes) {
      if (node.type === TYPE.literal) continue;
      if (node.type === TYPE.pound) continue;
      signature.add(`${node.type}:${node.value}`);
      if (node.type === TYPE.tag) visit(node.children);
      if (node.type === TYPE.plural || node.type === TYPE.select) {
        for (const option of Object.values(node.options)) visit(option.value);
      }
    }
  }
  visit(parse(message));
  return [...signature].sort().join(',');
}

export function wordingError(original: string, proposed: string) {
  if (original === proposed) return '';
  try {
    return messageSignature(original) === messageSignature(proposed)
      ? ''
      : 'Preserve the original placeholders and formatting tags.';
  } catch {
    return 'Check the message braces, plural branches, and formatting tags.';
  }
}

export function wording(
  review: Review,
  finding: Finding,
  choice = review.per[review.base].picks[finding.key],
): Wording {
  const { base, inventory } = review;
  const original = finding.original[base];
  if (choice?.source === 'keep') return original;
  const candidate = choiceOptions(inventory, finding, base).find(
    ({ id }) => id === choice?.source,
  );
  const rules = inventory.rules
    .filter(({ keys }) => keys.includes(finding.key))
    .flatMap((rule) =>
      rule.options.filter(({ id }) => id === review.per[base].terms[rule.id]),
    );
  const result: Wording = {};
  for (const locale of locales) {
    if (original[locale] === undefined) continue;
    const explicit = choice?.text?.[locale];
    if (explicit !== undefined) {
      result[locale] = explicit;
      continue;
    }
    let message = candidate?.[locale] ?? original[locale];
    for (const rule of rules) {
      if (candidate?.[locale] === undefined)
        message = rule.patch?.[finding.key]?.[locale] ?? message;
      for (const [pattern, value] of rule.patterns?.[locale] ?? []) {
        message = message.replace(new RegExp(pattern, 'g'), value);
      }
      if (rule.style === 'sentence' && locale === 'en')
        message = sentenceCase(message);
      if (rule.style === 'compact' && locale === 'ja')
        message = compactJapanese(message);
    }
    result[locale] = message;
  }
  return result;
}

export function updateWording(
  review: Review,
  update: Pick<SnapshotReview, 'picks'> | Pick<SnapshotReview, 'terms'>,
): Review {
  const previous = review.per[review.base];
  const current = { ...previous, ...update, checks: { ...previous.checks } };
  const next = { ...review, per: { ...review.per, [review.base]: current } };
  for (const finding of review.inventory.issues) {
    const check = previous.checks[finding.key];
    if (!check) continue;
    const before = wording(review, finding);
    const after = wording(next, finding);
    const remaining = { ...check };
    for (const locale of locales) {
      if (before[locale] !== after[locale]) delete remaining[locale];
    }
    current.checks[finding.key] = remaining;
  }
  return next;
}

export function verified(review: Review, finding: Finding, locale: Locale) {
  const selected = wording(review, finding)[locale];
  return (
    selected !== undefined &&
    review.per[review.base].checks[finding.key]?.[locale] === selected
  );
}

export function verifyLine(
  review: Review,
  finding: Finding,
  locale: Locale,
  mode: 'verify' | 'toggle' = 'verify',
): Review {
  const selected = wording(review, finding)[locale];
  const original = finding.original[review.base][locale];
  if (
    selected === undefined ||
    original === undefined ||
    wordingError(original, selected)
  )
    return review;
  const state = review.per[review.base];
  const line = { ...state.checks[finding.key] };
  if (mode === 'toggle' && line[locale] === selected) delete line[locale];
  else line[locale] = selected;
  return {
    ...review,
    per: {
      ...review.per,
      [review.base]: {
        ...state,
        checks: {
          ...state.checks,
          [finding.key]: line,
        },
      },
    },
  };
}

export function previewWording(review: Review, locale: Locale) {
  return Object.fromEntries(
    review.inventory.issues.flatMap((finding) => {
      const original = finding.original[review.base][locale];
      if (original === undefined) return [];
      const proposed = wording(review, finding)[locale] ?? original;
      return [
        [finding.key, wordingError(original, proposed) ? original : proposed],
      ];
    }),
  );
}

export function available(finding: Finding, base: Snapshot) {
  return (
    finding.noteOnly ||
    locales.some((locale) => finding.original[base][locale] !== undefined)
  );
}
