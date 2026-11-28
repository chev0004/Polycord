import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { loadScene, widths } from './frames';
import {
  allScenes,
  findingSection,
  indexPlacements,
  outstanding,
  type Placement,
  reviewSections,
  type Scene,
  sectionPending,
  verified,
} from './placements';
import type { PreviewBridge } from './preview';
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
  snapshots,
  updateWording,
  wording,
  wordingError,
} from './review-state';
import './reviewer.css';

const storageKey = 'polycord-visual-locale-review-v1';
const languages = { en: 'English', ja: '日本語' };
type SetReview = Dispatch<SetStateAction<Review | null>>;

function loadReview(): Review | null {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  } catch {
    return null;
  }
}

function localRoute(locale: Locale, route: string) {
  if (route.startsWith('!/')) return `http://localhost:3000${route.slice(1)}`;
  if (!route || route.startsWith('/'))
    return `http://localhost:3000/${locale}${route}`;
}

function exportReview(review: Review) {
  const report = Object.fromEntries(
    snapshots.map((base) => {
      const state = review.per[base];
      const snapshot = { ...review, base };
      const placements = indexPlacements(state);
      return [
        base,
        {
          snapshot: review.inventory.bases[base],
          section: state.section,
          rules: state.terms,
          unscanned: allScenes.flatMap((scene) =>
            locales
              .filter((locale) => !state.observations[scene.id]?.[locale])
              .map((locale) => ({ scene, locale })),
          ),
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
                placements: occurrences.map((placement) => ({
                  ...placement,
                  verification: Object.fromEntries(
                    locales.map((locale) => [
                      locale,
                      verified(state, placement, locale)
                        ? 'Verified'
                        : 'Needs review',
                    ]),
                  ),
                })),
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
  const errors = locales.map((locale) =>
    original[locale] === undefined
      ? ''
      : wordingError(
          original[locale],
          (custom ?? selected)[locale] ?? original[locale],
        ),
  );

  function choose(event: ChangeEvent<HTMLSelectElement>) {
    const source = event.target.value;
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
          <label className="lr-field">
            Wording option
            <select
              aria-label="Wording option"
              disabled={readOnly}
              value={custom ? 'custom' : (choice?.source ?? '')}
              onChange={choose}
            >
              <option value="" disabled>
                Choose wording
              </option>
              {choice &&
                !options.some((option) => option.id === choice.source) && (
                  <option value={choice.source}>{choice.source}</option>
                )}
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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

function PlacementStatus({
  state,
  placement,
  locale,
}: {
  state: Review['per'][Snapshot];
  placement: Placement;
  locale: Locale;
}) {
  const done = verified(state, placement, locale);
  return (
    <span className={done ? 'lr-verified' : 'lr-warning'}>
      {languages[locale]} <strong>{done ? 'Verified' : 'Needs review'}</strong>
    </span>
  );
}

function Workspace({
  review,
  setReview,
}: {
  review: Review;
  setReview: SetReview;
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
  const [scanError, setScanError] = useState('');
  const [scan, setScan] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [browsedSection, setBrowsedSection] = useState(0);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [live, setLive] = useState<Observation>();
  const [search, setSearch] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const scanFrame = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<PreviewBridge | null>(null);
  const scanning = useRef<AbortController | null>(null);
  const inspect = useRef(true);
  inspect.current = !interactive;

  const findings = useMemo(
    () => inventory.issues.filter((finding) => available(finding, base)),
    [inventory, base],
  );
  const findingKeys = useMemo(
    () => new Set(findings.map(({ key }) => key)),
    [findings],
  );
  const positions = useMemo(() => indexPlacements(state), [state]);
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
  const previewScenes =
    scene && !section.scenes.includes(scene)
      ? [...section.scenes, scene]
      : section.scenes;
  const sectionFindings = findings.filter(
    (finding) =>
      findingSection(finding) === section.id ||
      positions
        .get(finding.key)
        ?.some(({ scene }) => scene.sectionId === section.id),
  );
  const finding =
    sectionFindings.find(({ key }) => key === findingKey) ?? sectionFindings[0];
  const placements = finding ? (positions.get(finding.key) ?? []) : [];
  const displayedPlacements = browsing
    ? placements
    : placements.filter(
        ({ scene: item }) =>
          sections.findIndex(({ id }) => id === item.sectionId) <= sectionLimit,
      );
  const selectedPlacement =
    displayedPlacements.find(({ id }) => id === placementId) ??
    displayedPlacements.find(({ scene: item }) => item === scene);
  const occurrence = live?.occurrences.find(
    ({ id }) => id === selectedPlacement?.id,
  );
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
  const canVerify = Boolean(
    occurrence &&
      validWording &&
      !browsing &&
      !reading &&
      !interactive &&
      !error,
  );

  const mutate = useCallback(
    (change: (current: Review) => Review) => {
      setReview((current) =>
        current?.base === base ? change(current) : current,
      );
    },
    [base, setReview],
  );

  const record = useCallback(
    (item: Scene, language: Locale, observed: Observation) => {
      const cleaned = {
        occurrences: observed.occurrences.filter(({ key }) =>
          findingKeys.has(key),
        ),
        ambiguous: observed.ambiguous.filter((key) => findingKeys.has(key)),
      };
      mutate((current) => {
        const latest = current.per[base];
        if (
          JSON.stringify(latest.observations[item.id]?.[language]) ===
          JSON.stringify(cleaned)
        )
          return current;
        return {
          ...current,
          per: {
            ...current.per,
            [base]: {
              ...latest,
              observations: {
                ...latest.observations,
                [item.id]: {
                  ...latest.observations[item.id],
                  [language]: cleaned,
                },
              },
            },
          },
        };
      });
      return cleaned;
    },
    [base, findingKeys, mutate],
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
    async function open() {
      if (!element || !scene) return;
      try {
        const api = await loadScene(
          element,
          scene,
          locale,
          JSON.parse(preview),
          true,
          controller.signal,
          reload,
        );
        if (!api || controller.signal.aborted) return;
        bridge.current = api;
        const observed = record(scene, locale, api.inspect(scene));
        setLive(observed);
        element.contentDocument?.addEventListener(
          'click',
          (event) => {
            if (
              !inspect.current ||
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
            const matched = inventory.issues.find(
              ({ key }) => key === occurrence.key,
            );
            if (!matched || !findingKeys.has(matched.key)) return;
            setFinding(occurrence.key);
            setPlacement(occurrence.id);
          },
          { capture: true, signal: controller.signal },
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
  }, [scene, locale, preview, reload, record, inventory, findingKeys]);

  useEffect(() => {
    if (!reading && !interactive)
      bridge.current?.highlight(selectedPlacement?.id);
  }, [interactive, reading, selectedPlacement?.id]);

  useEffect(() => () => scanning.current?.abort(), []);

  function resetSection() {
    scanning.current?.abort();
    setScene(undefined);
    setFinding('');
    setPlacement('');
    setSearch('');
    setScanError('');
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
  }

  async function scanSection() {
    const element = scanFrame.current;
    if (!element || scanning.current) return;
    const controller = new AbortController();
    scanning.current = controller;
    const failed: string[] = [];
    setScanError('');
    try {
      for (const language of locales) {
        const messages = previewWording(review, language);
        for (const item of section.scenes) {
          if (controller.signal.aborted) return;
          setScan(`${languages[language]} · ${item.state} · ${item.viewport}`);
          element.style.width = `${widths[item.viewport]}px`;
          try {
            const api = await loadScene(
              element,
              item,
              language,
              messages,
              false,
              controller.signal,
            );
            if (api) record(item, language, api.inspect(item));
          } catch {
            if (controller.signal.aborted) return;
            failed.push(
              `${languages[language]} ${item.state} (${item.viewport})`,
            );
          }
        }
      }
      if (failed.length)
        setScanError(`Unmapped previews: ${failed.join(', ')}.`);
    } finally {
      setScan('');
      element.src = 'about:blank';
      scanning.current = null;
    }
  }

  function verify() {
    if (!occurrence || !canVerify) return;
    mutate((current) => {
      const latest = current.per[base];
      return {
        ...current,
        per: {
          ...current.per,
          [base]: {
            ...latest,
            checks: {
              ...latest.checks,
              [occurrence.id]: {
                ...latest.checks[occurrence.id],
                [locale]: occurrence.text,
              },
            },
          },
        },
      };
    });
  }

  const width = scene ? widths[scene.viewport] : widths.desktop;
  const scale = Math.min(1, sceneSize.width / width) || 1;
  const qualified = search
    ? sectionFindings.filter(({ key }) =>
        key.toLowerCase().includes(search.toLowerCase()),
      )
    : sectionFindings;
  const selectedAudit = finding ? outstanding(review, finding, placements) : [];

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
            disabled={Boolean(scan)}
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
          disabled={!section.scenes.length}
          onClick={() =>
            scan ? scanning.current?.abort() : void scanSection()
          }
        >
          {scan ? 'Stop finding placements' : 'Find placements'}
        </button>
        <button
          type="button"
          disabled={browsing || Boolean(scan) || sectionIndex >= sectionLimit}
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
      {scan && (
        <output className="lr-status">Finding placements · {scan}</output>
      )}
      {error && (
        <p className="lr-status lr-warning" role="alert">
          {error}
        </p>
      )}
      {scanError && (
        <p className="lr-status lr-warning" role="alert">
          {scanError}
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
          {scene ? (
            <div className="lr-stage" ref={stage} aria-busy={reading}>
              <div className="lr-frame-box" style={{ width: width * scale }}>
                <iframe
                  ref={frame}
                  title="Polycord fixture"
                  style={{
                    width,
                    height: Math.max(320, sceneSize.height / scale),
                    transform: `scale(${scale})`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="lr-status">This section contains audit notes.</p>
          )}
          <iframe
            className="lr-scan-frame"
            ref={scanFrame}
            title="Placement discovery"
            aria-hidden="true"
            tabIndex={-1}
          />
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
                  value={qualified.includes(finding) ? finding.key : ''}
                  onChange={(event) => {
                    setFinding(event.target.value);
                    setPlacement('');
                  }}
                >
                  {!qualified.includes(finding) && (
                    <option value="">Choose a finding</option>
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
                readOnly={browsing || Boolean(scan)}
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
              <div className="lr-placements">
                <h3>Placements</h3>
                {selectedAudit.some(({ reason }) =>
                  /[Uu]nmapped|[Aa]mbiguous|missing/.test(reason),
                ) && (
                  <p className="lr-warning">
                    Unmapped or ambiguous placement needs review.
                  </p>
                )}
                {displayedPlacements.map((placement) => (
                  <div className="lr-placement" key={placement.id}>
                    <button
                      type="button"
                      aria-pressed={selectedPlacement?.id === placement.id}
                      onClick={() => openPlacement(placement)}
                    >
                      {placement.scene.state} · {placement.scene.viewport} ·{' '}
                      {placement.surface}
                      <small>
                        {placement.scene.route}
                        {placement.rendered[locale]
                          ? ` · ${placement.rendered[locale]?.text}`
                          : ''}
                      </small>
                    </button>
                    <div className="lr-placement-status">
                      {locales.map((language) => (
                        <PlacementStatus
                          key={language}
                          state={state}
                          placement={placement}
                          locale={language}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {selectedPlacement && (
                  <button
                    type="button"
                    className="lr-primary lr-verify"
                    disabled={
                      !canVerify || verified(state, selectedPlacement, locale)
                    }
                    onClick={verify}
                  >
                    Verify {languages[locale]} placement
                  </button>
                )}
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
                {Boolean(
                  live?.occurrences.some((item) => item.surface !== 'Text'),
                ) && (
                  <details className="lr-detail">
                    <summary>Inspect accessibility and attributes</summary>
                    {live?.occurrences
                      .filter(
                        ({ surface, key }) =>
                          surface !== 'Text' &&
                          sectionFindings.some(
                            (finding) => finding.key === key,
                          ),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFinding(item.key);
                            setPlacement(item.id);
                          }}
                        >
                          {item.surface} · {item.text}
                          <small>{item.key}</small>
                        </button>
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
                  disabled={browsing || Boolean(scan)}
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
  const [review, setReview] = useState(loadReview);
  const [importing, setImporting] = useState(!review);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    if (!review) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(review));
      setStorageError('');
    } catch {
      setStorageError(
        'This browser could not save the review. Export your work before closing.',
      );
    }
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
            <button type="button" onClick={() => exportReview(review)}>
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
      {importing && (
        <CheckpointImport
          existing={Boolean(review)}
          onImport={(next) => {
            setReview(next);
            setImporting(false);
          }}
        />
      )}
      {review && !importing && (
        <Workspace review={review} setReview={setReview} />
      )}
    </main>
  );
}
