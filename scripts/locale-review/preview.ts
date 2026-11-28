import type { Scene, SceneIndex } from './placements';
import type { Locale, Observation, Occurrence } from './review-state';
import { clean, keysIn } from './tags';

export type PreviewBridge = ReturnType<typeof createPreviewBridge>;
export type ReviewStatus = 'pending' | 'verified';
export type PreviewWindow = Window & {
  localeReview?: PreviewBridge;
  localeReviewInputs?: Map<
    string,
    { locale: Locale; wording: Record<string, string> }
  >;
};

const attributes = [
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'alt',
  'title',
  'placeholder',
];
const selector = [
  ...attributes.map((attribute) => `[${attribute}]`),
  'input[type="submit"]',
].join(',');

function visible(element: Element) {
  const box = element.closest('option')?.closest('select') ?? element;
  return Boolean(
    box.getClientRects().length &&
      getComputedStyle(box).visibility === 'visible' &&
      !element.closest('[data-aria-hidden], [hidden]'),
  );
}

function ancestry(element: Element, root: Element) {
  const parts = [];
  for (
    let node: Element | null = element;
    node && node !== root;
    node = node.parentElement
  ) {
    let position = 1;
    for (
      let sibling = node.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      if (sibling.tagName === node.tagName) position++;
    }
    parts.unshift(`${node.localName}:${position}`);
  }
  return parts.join('/');
}

function atPath(path: string, root: Element) {
  let element: Element | undefined = root;
  for (const segment of path ? path.split('/') : []) {
    const [tag, index] = segment.split(':');
    element = Array.from(element?.children ?? []).filter(
      (child) => child.localName === tag,
    )[Number(index) - 1];
  }
  return element;
}

const clickable =
  'button, a, summary, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"]';
const fields = 'input, textarea';
const translationKey = /^\w+(\.\w+)+$/;

function find(target: string, query: string, last = false) {
  const byKey = translationKey.test(target);
  const byText = target.startsWith('=');
  const candidates = [
    ...document.querySelectorAll(byKey || byText ? query : target),
  ];
  if (last && byKey) candidates.reverse();
  return candidates.find((element) => {
    if (!visible(element)) return false;
    if (byText) return element.textContent?.includes(target.slice(1));
    return (
      !byKey ||
      keysIn(
        ['aria-label', 'placeholder']
          .map((attribute) => element.getAttribute(attribute))
          .concat(element.textContent)
          .join(),
      ).includes(target)
    );
  });
}

async function waitFor<T>(read: () => T | undefined | null, label: string) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = read();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(`The preview could not open ${label}.`);
}

function pointer(element: Element, type: string, clientX = 0) {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX,
    }),
  );
}

async function perform(step: string, path?: string) {
  if (step === 'Escape') {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );
    return '';
  }
  if (step === 'refresh inbox') {
    window.dispatchEvent(
      new CustomEvent('polycord:inbox-changed', { detail: 'review' }),
    );
    return '';
  }
  const waiting = step.startsWith('?');
  const [target, value] = (waiting ? step.slice(1) : step).split(' <- ');
  const swipe = target.startsWith('swipe ');
  const name = swipe ? target.slice(6) : target;
  const element = await waitFor(() => {
    if (path === undefined)
      return find(
        name,
        waiting ? 'body *' : value === undefined ? clickable : fields,
        waiting,
      );
    const candidate = atPath(path, document.body);
    return candidate && visible(candidate) ? candidate : undefined;
  }, name);
  const location = ancestry(element, document.body);
  if (waiting) return location;
  if (value !== undefined) {
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value',
    )?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (swipe) {
    pointer(element, 'pointerdown', 300);
    pointer(element, 'pointermove', 150);
    pointer(element, 'pointerup', 150);
  } else if (element.getAttribute('aria-haspopup') === 'menu') {
    pointer(element, 'pointerdown');
  } else {
    (element as HTMLElement).click();
  }
  return location;
}

function privacyScope(scene: Scene) {
  const heading = find('Profile.privacySettings', 'h1,h2,h3,[role="heading"]');
  return heading?.closest(
    scene.viewport === 'mobile' ? '[role="dialog"]' : 'section',
  );
}

export function createPreviewBridge() {
  let targets = new Map<string, Element>();
  const marked = new Set<Element>();
  let active: Element | undefined;
  let confirmation: string | undefined;
  const nativeConfirm = window.confirm;
  window.confirm = (message) => {
    confirmation = message;
    return false;
  };

  function inspect(scene: Scene, index?: SceneIndex): Observation {
    if (index) {
      targets = new Map();
      const root = atPath(index.scope, document.body);
      const occurrences = index.occurrences.flatMap((occurrence) => {
        if (!root) return [];
        const [, , surface, path] = JSON.parse(occurrence.id) as [
          string,
          string,
          string,
          string,
        ];
        if (surface === 'Browser confirmation') {
          return confirmation === undefined
            ? []
            : [{ ...occurrence, text: confirmation }];
        }
        if (surface === 'Page description') {
          const description = document.head
            .querySelector('meta[name="description"]')
            ?.getAttribute('content');
          return description === undefined || description === null
            ? []
            : [{ ...occurrence, text: description }];
        }
        const target = atPath(path, root);
        if (!target || !visible(target)) return [];
        const value =
          surface === 'value' && target instanceof HTMLInputElement
            ? target.value
            : attributes.includes(surface)
              ? (target.getAttribute(surface) ??
                (surface === 'title'
                  ? target.querySelector('title')?.textContent
                  : null))
              : target.textContent;
        if (value == null) return [];
        targets.set(occurrence.id, target);
        return [{ ...occurrence, text: clean(value) }];
      });
      return { occurrences };
    }
    const root = scene.privacy ? privacyScope(scene) : document.body;
    targets = new Map();
    const occurrences: Occurrence[] = [];
    if (!root) return { occurrences };

    const add = (
      element: Element,
      source: string,
      value: string,
      surface: string,
    ) => {
      for (const key of keysIn(source)) {
        if (scene.privacy && !key.startsWith('Profile.')) continue;
        const id = JSON.stringify([
          key,
          scene.id,
          surface,
          ancestry(element, root),
        ]);
        if (targets.has(id)) continue;
        targets.set(id, element);
        occurrences.push({ id, key, surface, text: clean(value) });
      }
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (
        !element ||
        !node.textContent ||
        element.closest('script, style, noscript, title') ||
        !visible(element)
      )
        continue;
      const surface = element.closest('.sr-only')
        ? 'Screen reader text'
        : element.closest('option')
          ? 'Menu option'
          : 'Text';
      add(element, node.textContent, element.textContent ?? '', surface);
    }
    for (const element of root.querySelectorAll(selector)) {
      if (!visible(element)) continue;
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        if (value) add(element, value, value, attribute);
      }
      if (element instanceof HTMLInputElement && element.type === 'submit')
        add(element, element.value, element.value, 'value');
    }
    for (const title of root.querySelectorAll('svg title')) {
      const element = title.parentElement;
      const value = title.textContent ?? '';
      if (element && visible(element)) add(element, value, value, 'title');
    }
    for (const [surface, copy] of [
      ['Browser confirmation', confirmation],
      [
        'Page description',
        document.head
          .querySelector('meta[name="description"]')
          ?.getAttribute('content'),
      ],
    ] as const) {
      for (const key of keysIn(copy ?? '')) {
        const id = JSON.stringify([key, scene.id, surface, '']);
        occurrences.push({ id, key, surface, text: clean(copy ?? '') });
      }
    }
    return { occurrences };
  }

  return {
    inspect,
    dispose() {
      window.confirm = nativeConfirm;
    },
    showConfirmation() {
      if (confirmation !== undefined) nativeConfirm.call(window, confirmation);
    },
    async prepare(scene: Scene, scroll: boolean, index?: SceneIndex) {
      const actions: string[] = [];
      for (const [stepIndex, step] of (scene.open ?? []).entries()) {
        actions.push(await perform(step, index?.actions[stepIndex]));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      const mobileToast = document.querySelector(
        '.MobileToast[data-state="open"]',
      );
      if (mobileToast) pointer(mobileToast, 'pointerdown');
      let scope = '';
      if (scene.privacy) {
        const root = await waitFor(
          () =>
            index ? atPath(index.scope, document.body) : privacyScope(scene),
          'Profile Privacy',
        );
        scope = ancestry(root, document.body);
        if (scroll && scene.viewport === 'desktop')
          root.scrollIntoView({ block: 'start' });
      }
      return { actions, scope };
    },
    markReview(statuses?: ReadonlyMap<string, ReviewStatus>) {
      for (const element of marked) {
        element.removeAttribute('data-locale-review-status');
      }
      marked.clear();
      for (const [id, status] of statuses ?? []) {
        const element = targets.get(id);
        if (
          !element ||
          element.getAttribute('data-locale-review-status') === 'pending'
        )
          continue;
        element.setAttribute('data-locale-review-status', status);
        marked.add(element);
      }
    },
    highlight(id: string | undefined) {
      active?.removeAttribute('data-locale-review-active');
      active = id ? targets.get(id) : undefined;
      active?.setAttribute('data-locale-review-active', '');
      active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    },
    occurrenceAt(element: Element, observation: Observation) {
      for (
        let node: Element | null = element;
        node;
        node = node.parentElement
      ) {
        const occurrence = observation.occurrences.find(
          ({ id, surface }) => targets.get(id) === node && surface === 'Text',
        );
        if (occurrence) return occurrence;
      }
      return observation.occurrences.find(
        ({ id }) => targets.get(id) === element,
      );
    },
  };
}
