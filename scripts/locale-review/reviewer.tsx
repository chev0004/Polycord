import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { height, loadScene, widths } from './frames';
import {
  type Catalogue,
  findingSection,
  indexPlacements,
  outstanding,
  type Placement,
  reviewSections,
  type Scene,
  sectionPending,
} from './placements';
import type { PreviewBridge, ReviewStatus } from './preview';
import {
  available,
  type Choice,
  choiceOptions,
  type Finding,
  type Locale,
  locales,
  type Observation,
  previewWording,
  type Review,
  readCheckpoint,
  type Snapshot,
  shareLines,
  snapshots,
  updateWording,
  verified,
  verifyLine,
  wording,
  wordingError,
} from './review-state';
import { loadReview, saveReview } from './storage';

const languages = { en: 'English', ja: '日本語' };
type SetReview = Dispatch<SetStateAction<Review | null>>;

function localRoute(locale: Locale, route: string) {
  if (route.startsWith('!/')) return `http://localhost:3000${route.slice(1)}`;
  if (!route || route.startsWith('/'))
    return `http://localhost:3000/${locale}${route}`;
}

function exportReview(review: Review, catalogue: Catalogue) {
  const placements = indexPlacements(catalogue);
  const report = Object.fromEntries(
    snapshots.map((base) => {
      const state = review.per[base];
      const snapshot = { ...review, base };
      return [
        base,
        {
          snapshot: review.inventory.bases[base],
          section: state.section,
          rules: state.terms,
          previewErrors: catalogue.errors,
          findings: review.inventory.issues
            .filter((finding) => available(finding, base))
            .map((finding) => {
              const occurrences = placements.get(finding.key) ?? [];
              return {
                key: finding.key,
                section: findingSection(finding),
                locations: finding.location,
                choice: state.picks[finding.key] ?? null,
                original: finding.original[base],
                selected: wording(snapshot, finding),
                placements: occurrences,
                verification: finding.noteOnly
                  ? undefined
                  : Object.fromEntries(
                      locales.map((locale) => [
                        locale,
                        verified(snapshot, finding, locale)
                          ? 'Verified'
                          : 'Needs review',
                      ]),
                    ),
                outstanding: outstanding(snapshot, finding, occurrences),
              };
            }),
        },
      ];
    }),
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, snapshots: report }, null, 2)], {
      type: 'application/json',
    }),
  );
  link.download = 'polycord-visual-locale-review.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function CheckpointImport({
  onImport,
  existing,
}: {
  onImport: (review: Review) => void;
  existing: boolean;
}) {
  const [error, setError] = useState('');

  async function importFiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = new FormData(event.currentTarget);
    const html = files.get('review') as File;
    const progress = files.get('progress') as File;
    try {
      onImport(readCheckpoint(await html.text(), await progress.text()));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'The checkpoint could not be opened.',
      );
    }
  }

  return (
    <form className="lr-import" onSubmit={importFiles}>
      <h2>{existing ? 'Replace checkpoint' : 'Open your saved review'}</h2>
      <p>
        {existing
          ? 'Importing replaces the choices and clears verification in this browser.'
          : 'Choose the live review HTML and its matching progress JSON from the checkpoint.'}
      </p>
      <label>
        Live review HTML
        <input name="review" type="file" accept=".html" required />
      </label>
      <label>
        Progress JSON
        <input name="progress" type="file" accept=".json" required />
      </label>
      <button type="submit" className="lr-primary">
        Import checkpoint
      </button>
      {error && (
        <p role="alert" className="lr-warning">
          {error}
        </p>
      )}
    </form>
  );
}

function WordingEditor({
  finding,
  review,
  onChoose,
  readOnly,
}: {
  finding: Finding;
  review: Review;
  onChoose: (choice: Choice) => void;
  readOnly: boolean;
}) {
  const options = choiceOptions(review.inventory, finding, review.base);
  const choice = review.per[review.base].picks[finding.key];
  const selected = wording(review, finding);
  const original = finding.original[review.base];
  const [custom, setCustom] = useState<WordingDraft | null>(null);
  const optionIndex = options.findIndex(
    ({ id }) => id === (custom ? 'custom' : choice?.source),
  );
  const errors = locales.map((locale) =>
    original[locale] === undefined
      ? ''
      : wordingError(
          original[locale],
          (custom ?? selected)[locale] ?? original[locale],
        ),
  );

  function stepOption(direction: -1 | 1) {
    const current = optionIndex < 0 && direction === -1 ? 0 : optionIndex;
    const next = (current + direction + options.length) % options.length;
    const source = options[next].id;
    if (source === 'custom') {
      setCustom({ ...selected });
      return;
    }
    setCustom(null);
    onChoose({ source });
  }

  return (
    <>
      {!finding.noteOnly && (
        <>
          <fieldset
            className="lr-field"
            onKeyDown={(event) => {
              if (
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
              )
                return;
              event.preventDefault();
              stepOption(event.key === 'ArrowLeft' ? -1 : 1);
            }}
          >
            <legend>Wording option</legend>
            <div className="lr-option-picker">
              <button
                type="button"
                aria-label="Previous wording option"
                disabled={readOnly}
                onClick={() => stepOption(-1)}
              >
                <MdChevronLeft aria-hidden="true" />
              </button>
              <span aria-live="polite">
                {options[optionIndex]?.label ??
                  choice?.source ??
                  'Choose wording'}
              </span>
              <button
                type="button"
                aria-label="Next wording option"
                disabled={readOnly}
                onClick={() => stepOption(1)}
              >
                <MdChevronRight aria-hidden="true" />
              </button>
            </div>
          </fieldset>
          <div className="lr-wording">
            {locales.map((locale, index) => (
              <section key={locale} lang={locale}>
                <span className="lr-label">{languages[locale]}</span>
                {custom && original[locale] !== undefined ? (
                  <textarea
                    aria-label={`Custom ${languages[locale]} wording`}
                    value={custom[locale] ?? ''}
                    onChange={(event) =>
                      setCustom({ ...custom, [locale]: event.target.value })
                    }
                  />
                ) : (
                  <p>{selected[locale] ?? 'Unavailable in this snapshot'}</p>
                )}
                {errors[index] && <p className="lr-warning">{errors[index]}</p>}
              </section>
            ))}
          </div>
          {choice?.source === 'custom' && !custom && !readOnly && (
            <button type="button" onClick={() => setCustom({ ...selected })}>
              Edit custom wording
            </button>
          )}
          {custom && (
            <button
              type="button"
              className="lr-primary"
              disabled={readOnly || errors.some(Boolean)}
              onClick={() => {
                onChoose({ source: 'custom', text: custom });
                setCustom(null);
              }}
            >
              Apply custom wording
            </button>
          )}
        </>
      )}
      {finding.refs.length > 0 && (
        <details className="lr-detail">
          <summary>Audit notes</summary>
          {finding.refs.map((index) => {
            const note = review.inventory.notes[index];
            return (
              note && (
                <p key={index}>
                  <strong>{note.src}</strong> {note.body}
                </p>
              )
            );
          })}
        </details>
      )}
    </>
  );
}

type WordingDraft = Partial<Record<Locale, string>>;

function LineStatus({
  review,
  finding,
  locale,
}: {
  review: Review;
  finding: Finding;
  locale: Locale;
}) {
  const done = verified(review, finding, locale);
  return (
    <span className={done ? 'lr-verified' : 'lr-warning'}>
      {languages[locale]} <strong>{done ? 'Verified' : 'Needs review'}</strong>
    </span>
  );
}

function Workspace({
  review,
  setReview,
  catalogue,
}: {
  review: Review;
  setReview: SetReview;
  catalogue: Catalogue;
}) {
  const { base, inventory } = review;
  const state = review.per[base];
  const sections = reviewSections;
  const [locale, setLocale] = useState<Locale>('en');
  const [sceneOverride, setScene] = useState<Scene>();
  const [findingKey, setFinding] = useState('');
  const [placementId, setPlacement] = useState('');
  const [interactive, setInteractive] = useState(false);
  const [reload, setReload] = useState(0);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [browsedSection, setBrowsedSection] = useState(0);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [live, setLive] = useState<Observation>();
  const [search, setSearch] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<PreviewBridge | null>(null);
  const canEdit = !browsing && !reading && !interactive && !error;
  const interaction = useRef({ inspect: !interactive, canEdit });
  interaction.current = { inspect: !interactive, canEdit };

  const findings = useMemo(
    () => inventory.issues.filter((finding) => available(finding, base)),
    [inventory, base],
  );
  const findingsByKey = useMemo(
    () => new Map(findings.map((finding) => [finding.key, finding])),
    [findings],
  );
  const positions = useMemo(() => indexPlacements(catalogue), [catalogue]);
  const unlocked = sections.findIndex((section) =>
    sectionPending(review, section, findings, positions),
  );
  const sectionLimit = unlocked < 0 ? sections.length - 1 : unlocked;
  const reviewSectionIndex = Math.min(
    sectionLimit,
    Math.max(
      0,
      sections.findIndex(({ id }) => id === state.section),
    ),
  );
  const sectionIndex = browsing ? browsedSection : reviewSectionIndex;
  const section = sections[sectionIndex];
  const scene = sceneOverride ?? section.scenes[0];
  const sceneIndex = scene && catalogue.scenes[scene.id]?.[locale];
  const previewScenes =
    scene && !section.scenes.includes(scene)
      ? [...section.scenes, scene]
      : section.scenes;
  const sectionId = section.id;
  const sectionFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          findingSection(finding) === sectionId ||
          positions
            .get(finding.key)
            ?.some(({ scene }) => scene.sectionId === sectionId),
      ),
    [findings, positions, sectionId],
  );
  const reviewStatusByKey = useMemo(
    () =>
      new Map<string, ReviewStatus>(
        sectionFindings
          .filter((finding) => !finding.noteOnly)
          .map((finding) => [
            finding.key,
            verified(review, finding, locale) ? 'verified' : 'pending',
          ]),
      ),
    [sectionFindings, review, locale],
  );
  const textStatuses = useMemo(
    () =>
      new Map(
        live?.occurrences.flatMap(({ id, key, surface }) => {
          const status = reviewStatusByKey.get(key);
          return surface === 'Text' && status ? [[id, status] as const] : [];
        }),
      ),
    [live, reviewStatusByKey],
  );
  const inspectable =
    live?.occurrences.filter(
      ({ key, surface }) => surface !== 'Text' && reviewStatusByKey.has(key),
    ) ?? [];
  const pendingAttributes = new Set(
    inspectable
      .filter(({ key }) => reviewStatusByKey.get(key) === 'pending')
      .map(({ key }) => key),
  );
  const finding = findingsByKey.get(findingKey) ?? sectionFindings[0];
  const placements = finding ? (positions.get(finding.key) ?? []) : [];
  const selectedPlacement =
    placements.find(({ id }) => id === placementId) ??
    placements.find(
      ({ scene: item, rendered }) => item === scene && rendered[locale],
    );
  const occurrence = live?.occurrences.find(({ key }) => key === finding?.key);
  const preview = useMemo(
    () => JSON.stringify(previewWording(review, locale)),
    [review, locale],
  );
  const proposed = finding && wording(review, finding)[locale];
  const original = finding?.original[base][locale];
  const validWording =
    proposed !== undefined &&
    original !== undefined &&
    !wordingError(original, proposed);
  const canVerify = Boolean(occurrence && validWording && canEdit);

  const mutate = useCallback(
    (change: (current: Review) => Review) => {
      setReview((current) =>
        current?.base === base ? change(current) : current,
      );
    },
    [base, setReview],
  );

  useEffect(() => {
    const element = stage.current;
    if (!element || !scene) return;
    const observer = new ResizeObserver(([entry]) => {
      setSceneSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scene]);

  useEffect(() => {
    const element = frame.current;
    if (!scene || !element) return;
    const controller = new AbortController();
    bridge.current = null;
    setLive(undefined);
    setError('');
    setReading(true);
    setInteractive(false);
    if (!sceneIndex) {
      element.src = 'about:blank';
      setError(
        'This preview location is unavailable in the selected language.',
      );
      setReading(false);
      return;
    }
    async function open() {
      if (!sceneIndex || !element || !scene) return;
      try {
        const api = await loadScene(
          element,
          scene,
          locale,
          JSON.parse(preview),
          sceneIndex,
          controller.signal,
          reload,
        );
        if (!api || controller.signal.aborted) return;
        bridge.current = api;
        const observed = api.inspect(scene, sceneIndex);
        setLive(observed);
        const inspectCopy = (event: MouseEvent) => {
          if (
            !interaction.current.inspect ||
            (event.target as Node | null)?.nodeType !== Node.ELEMENT_NODE
          )
            return;
          event.preventDefault();
          event.stopImmediatePropagation();
          const occurrence = api.occurrenceAt(
            event.target as Element,
            observed,
          );
          if (!occurrence) return;
          const clicked = findingsByKey.get(occurrence.key);
          if (!clicked) return;
          setFinding(clicked.key);
          setPlacement(occurrence.id);
          if (
            event.type === 'dblclick' &&
            interaction.current.canEdit &&
            occurrence.surface === 'Text' &&
            !clicked.noteOnly
          ) {
            element?.contentDocument?.getSelection()?.removeAllRanges();
            mutate((current) => verifyLine(current, clicked, locale, 'toggle'));
          }
        };
        const options = { capture: true, signal: controller.signal };
        element.contentDocument?.addEventListener(
          'click',
          inspectCopy,
          options,
        );
        element.contentDocument?.addEventListener(
          'dblclick',
          inspectCopy,
          options,
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : 'Preview failed to load.',
          );
      } finally {
        if (!controller.signal.aborted) setReading(false);
      }
    }
    void open();
    return () => controller.abort();
  }, [scene, sceneIndex, locale, preview, reload, findingsByKey, mutate]);

  useEffect(() => {
    bridge.current?.highlight(
      !reading && !interactive ? selectedPlacement?.id : undefined,
    );
  }, [interactive, reading, selectedPlacement?.id]);

  useEffect(() => {
    bridge.current?.markReview(
      !reading && !interactive ? textStatuses : undefined,
    );
  }, [interactive, textStatuses, reading]);

  function resetSection() {
    setScene(undefined);
    setFinding('');
    setPlacement('');
    setSearch('');
  }

  function moveSection(id: string) {
    const index = sections.findIndex((item) => item.id === id);
    if (!browsing && index > sectionLimit) return;
    resetSection();
    if (browsing) {
      setBrowsedSection(index);
      return;
    }
    mutate((current) => ({
      ...current,
      per: { ...current.per, [base]: { ...current.per[base], section: id } },
    }));
  }

  function openPlacement(placement: Placement) {
    setScene(placement.scene);
    setPlacement(placement.id);
    if (!placement.rendered[locale]) {
      const supported = locales.find(
        (language) => placement.rendered[language],
      );
      if (supported) setLocale(supported);
    }
  }

  function verify() {
    if (finding && canVerify)
      mutate((current) => verifyLine(current, finding, locale));
  }

  const width = scene ? widths[scene.viewport] : widths.desktop;
  const scale =
    Math.min(1, sceneSize.width / width, sceneSize.height / height) || 1;
  const qualified = search
    ? sectionFindings.filter(({ key }) =>
        key.toLowerCase().includes(search.toLowerCase()),
      )
    : sectionFindings;

  return (
    <>
      <div className="lr-controls">
        <label>
          Section
          <select
            aria-label="Section"
            value={section.id}
            onChange={(event) => moveSection(event.target.value)}
          >
            {sections.map((item, index) => (
              <option
                key={item.id}
                value={item.id}
                disabled={!browsing && index > sectionLimit}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Snapshot
          <select
            aria-label="Snapshot"
            value={base}
            onChange={(event) => {
              resetSection();
              setReview({ ...review, base: event.target.value as Snapshot });
            }}
          >
            {snapshots.map((snapshot) => (
              <option key={snapshot} value={snapshot}>
                {inventory.bases[snapshot]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={browsing || sectionIndex >= sectionLimit}
          onClick={() => moveSection(sections[sectionIndex + 1].id)}
        >
          Next section
        </button>
        <button
          type="button"
          aria-pressed={browsing}
          onClick={() => {
            resetSection();
            setBrowsedSection(reviewSectionIndex);
            setBrowsing(!browsing);
          }}
        >
          {browsing ? 'Return to review' : 'Browse inventory'}
        </button>
      </div>
      {error && (
        <p className="lr-status lr-warning" role="alert">
          {error}
        </p>
      )}
      <div className="lr-workspace">
        <section className="lr-preview" aria-label="Polycord preview">
          <div className="lr-preview-controls">
            <label>
              Preview
              <select
                aria-label="Preview"
                value={scene?.id ?? ''}
                onChange={(event) => {
                  setScene(
                    previewScenes.find(({ id }) => id === event.target.value),
                  );
                  setPlacement('');
                }}
              >
                {previewScenes.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.route} · {item.state} · {item.viewport}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="lr-language" aria-label="Preview language">
              {locales.map((language) => (
                <button
                  type="button"
                  key={language}
                  aria-pressed={locale === language}
                  onClick={() => setLocale(language)}
                >
                  {languages[language]}
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              aria-pressed={interactive}
              disabled={reading || !scene}
              onClick={() => {
                if (interactive) setReload((value) => value + 1);
                setInteractive(!interactive);
              }}
            >
              {interactive ? 'Resume inspection' : 'Interact with preview'}
            </button>
          </div>
          {!reading && !interactive && textStatuses.size > 0 && (
            <div className="lr-review-legend">
              <span data-locale-review-status="pending">Needs review</span>
              <span data-locale-review-status="verified">Verified</span>
              {!browsing && (
                <span>Double-click copy to toggle verification</span>
              )}
            </div>
          )}
          {scene ? (
            <div className="lr-stage" ref={stage} aria-busy={reading}>
              <div className="lr-frame-box" style={{ width: width * scale }}>
                <iframe
                  ref={frame}
                  title="Polycord fixture"
                  style={{
                    width,
                    height,
                    transform: `scale(${scale})`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="lr-status">This section contains audit notes.</p>
          )}
        </section>
        <aside className="lr-inspector" aria-label="Copy and placements">
          <div className="lr-inspector-head">
            <h2>Copy and placements</h2>
            <small>{sectionFindings.length} findings</small>
          </div>
          <label className="lr-field">
            Find a key
            <input
              type="search"
              placeholder="Filter by translation key"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {finding && (
            <>
              <label className="lr-field">
                Finding
                <select
                  aria-label="Finding"
                  value={finding.key}
                  onChange={(event) => {
                    setFinding(event.target.value);
                    setPlacement('');
                  }}
                >
                  {!qualified.includes(finding) && (
                    <option value={finding.key}>{finding.key}</option>
                  )}
                  {qualified.map(({ key }) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
              <WordingEditor
                key={`${base}:${finding.key}`}
                finding={finding}
                review={review}
                readOnly={browsing}
                onChoose={(choice) =>
                  mutate((current) =>
                    updateWording(current, {
                      picks: {
                        ...current.per[base].picks,
                        [finding.key]: choice,
                      },
                    }),
                  )
                }
              />
              {!finding.noteOnly && (
                <div className="lr-line-checks">
                  <div className="lr-line-status">
                    {locales.map((language) => (
                      <LineStatus
                        key={language}
                        review={review}
                        finding={finding}
                        locale={language}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="lr-primary"
                    disabled={!canVerify || verified(review, finding, locale)}
                    onClick={verify}
                  >
                    Verify this line in{' '}
                    {locale === 'en' ? 'English' : 'Japanese'}
                  </button>
                  {occurrence?.surface === 'Browser confirmation' && (
                    <button
                      type="button"
                      onClick={() => bridge.current?.showConfirmation()}
                    >
                      Show browser prompt
                    </button>
                  )}
                </div>
              )}
              {!interactive && inspectable.length > 0 && (
                <details className="lr-detail">
                  <summary>
                    Inspect accessibility and attributes
                    {pendingAttributes.size > 0 && (
                      <small className="lr-attribute-count">
                        {' '}
                        · {pendingAttributes.size} to review
                      </small>
                    )}
                  </summary>
                  {inspectable.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFinding(item.key);
                        setPlacement(item.id);
                      }}
                      onDoubleClick={() => {
                        const clicked = findingsByKey.get(item.key);
                        if (canEdit && clicked)
                          mutate((current) =>
                            verifyLine(current, clicked, locale, 'toggle'),
                          );
                      }}
                    >
                      {item.surface} ·{' '}
                      <span
                        data-locale-review-status={reviewStatusByKey.get(
                          item.key,
                        )}
                      >
                        {item.text}
                      </span>
                      <small>{item.key}</small>
                    </button>
                  ))}
                </details>
              )}
              <div className="lr-placements">
                {!finding.noteOnly && (
                  <h3>
                    Locations <small>{placements.length}</small>
                  </h3>
                )}
                {!finding.noteOnly &&
                  locales.some(
                    (language) =>
                      !placements.some(({ rendered }) => rendered[language]),
                  ) && (
                    <p className="lr-warning">
                      Some languages have no mapped preview location.
                    </p>
                  )}
                {placements.map((placement) => (
                  <button
                    className="lr-placement"
                    key={placement.id}
                    type="button"
                    aria-pressed={selectedPlacement?.id === placement.id}
                    onClick={() => openPlacement(placement)}
                  >
                    {placement.scene.state} · {placement.scene.viewport} ·{' '}
                    {placement.surface}
                    <small>
                      {placement.scene.route} · {placement.scene.section}
                      {live?.occurrences.find(({ id }) => id === placement.id)
                        ?.text && (
                        <>
                          {' '}
                          ·{' '}
                          {
                            live.occurrences.find(
                              ({ id }) => id === placement.id,
                            )?.text
                          }
                        </>
                      )}
                    </small>
                  </button>
                ))}
                {finding.location && (
                  <details className="lr-detail">
                    <summary>Locations from checkpoint</summary>
                    {finding.location.pages.map(([name, route]) => {
                      const href = localRoute(locale, route);
                      return (
                        href && (
                          <div key={route}>
                            <a href={href} target="_blank" rel="noreferrer">
                              {name} <code>{route || '/'}</code>
                            </a>
                          </div>
                        )
                      );
                    })}
                    {finding.location.steps.map((step) => (
                      <p key={step}>{step}</p>
                    ))}
                  </details>
                )}
              </div>
            </>
          )}
          <details className="lr-detail lr-rules">
            <summary>Shared wording rules</summary>
            {inventory.rules.map((rule) => (
              <label key={rule.id} className="lr-field">
                {rule.label}
                <select
                  disabled={browsing}
                  value={state.terms[rule.id] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    mutate((current) =>
                      updateWording(current, {
                        terms: { ...current.per[base].terms, [rule.id]: value },
                      }),
                    );
                  }}
                >
                  <option value="">Undecided</option>
                  {rule.options.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                {rule.options.find(({ id }) => id === state.terms[rule.id])
                  ?.requires && (
                  <small className="lr-warning">
                    {
                      rule.options.find(({ id }) => id === state.terms[rule.id])
                        ?.requires
                    }
                  </small>
                )}
              </label>
            ))}
          </details>
        </aside>
      </div>
    </>
  );
}

export function LocaleReviewer() {
  const [review, setReview] = useState<Review | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [catalogue, setCatalogue] = useState<Catalogue>();
  const [catalogueError, setCatalogueError] = useState('');
  useEffect(() => {
    void loadReview().then(
      (saved) => {
        setReview(saved && shareLines(saved));
        setImporting(!saved);
        setLoading(false);
      },
      () => {
        setStorageError('This browser could not open the saved review.');
        setImporting(true);
        setLoading(false);
      },
    );
    void fetch('/placements.json')
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        setCatalogue(await response.json());
      })
      .catch(() =>
        setCatalogueError(
          'The preview index could not be opened. Restart the locale reviewer to rebuild it.',
        ),
      );
  }, []);
  useEffect(() => {
    if (!review) return;
    void saveReview(review).then(
      () => {
        setStorageError('');
      },
      () => {
        setStorageError(
          'This browser could not save the review. Export your work before closing.',
        );
      },
    );
  }, [review]);

  return (
    <main className="lr-app">
      <header className="lr-header">
        <div>
          <span>Polycord</span>
          <h1>Visual locale review</h1>
        </div>
        {review && (
          <div>
            <button type="button" onClick={() => setImporting(!importing)}>
              {importing ? 'Close import' : 'Import checkpoint'}
            </button>
            <button
              type="button"
              disabled={!catalogue}
              onClick={() => catalogue && exportReview(review, catalogue)}
            >
              Export review
            </button>
          </div>
        )}
      </header>
      {storageError && (
        <p className="lr-status lr-warning" role="alert">
          {storageError}
        </p>
      )}
      {catalogueError && (
        <p className="lr-status lr-warning" role="alert">
          {catalogueError}
        </p>
      )}
      {(loading || (!catalogue && !catalogueError)) && (
        <output className="lr-status">Opening the locale reviewer…</output>
      )}
      {Boolean(catalogue?.errors.length) && (
        <details className="lr-status lr-warning">
          <summary>
            {catalogue?.errors.length} preview locations could not be indexed
          </summary>
          {catalogue?.errors.map(({ scene, locale, reason }) => (
            <p key={`${scene}:${locale}`}>
              {languages[locale]} · {reason}
            </p>
          ))}
        </details>
      )}
      {importing && (
        <CheckpointImport
          existing={Boolean(review)}
          onImport={(next) => {
            setReview(next);
            setImporting(false);
          }}
        />
      )}
      {review && catalogue && !importing && (
        <Workspace
          review={review}
          setReview={setReview}
          catalogue={catalogue}
        />
      )}
    </main>
  );
}
