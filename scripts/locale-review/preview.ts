import { normalize, renderedTranslations } from './intl';
import type { Scene } from './placements';
import type { Locale, Observation, Occurrence } from './review-state';

export interface Messages {
  [key: string]: string | Messages;
}

export function mergeMessages(
  original: Messages,
  wording: Record<string, string>,
) {
  const messages: Messages = structuredClone(original);
  for (const [key, value] of Object.entries(wording)) {
    const parts = key.split('.');
    const leaf = parts.pop() as string;
    let node: Messages | undefined = messages;
    for (const part of parts) {
      const child: string | Messages | undefined = Object.hasOwn(node, part)
        ? node[part]
        : undefined;
      if (typeof child !== 'object') {
        node = undefined;
        break;
      }
      node = child;
    }
    if (node && Object.hasOwn(node, leaf) && typeof node[leaf] === 'string')
      node[leaf] = value;
  }
  return messages;
}

export type PreviewBridge = ReturnType<typeof createPreviewBridge>;
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
  'svg title',
].join(',');

function visible(element: Element) {
  return Boolean(
    element.getClientRects().length &&
      getComputedStyle(element).visibility === 'visible' &&
      !element.closest('[aria-hidden="true"], [hidden]'),
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

function copyKeys(text: string, privacy?: boolean) {
  const value = normalize(text);
  const translated =
    renderedTranslations.get(value) ??
    renderedTranslations.get(
      value.replace(/^[:：·「」\s]+|[:：·「」\s]+$/g, ''),
    );
  return [...(translated ?? [])].filter(
    (key) => !privacy || key.startsWith('Profile.'),
  );
}

function findControl(key: string, query: string) {
  return [...document.querySelectorAll(query)].find(
    (element) =>
      visible(element) &&
      [
        element.textContent,
        element.getAttribute('aria-label'),
        ...[...element.querySelectorAll('span, p, h2, h3')].map(
          (child) => child.textContent,
        ),
      ].some((text) => text && copyKeys(text).includes(key)),
  );
}

async function waitFor<T>(read: () => T | undefined | null, label: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = read();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(`The preview could not open ${label}.`);
}

function privacyScope(scene: Scene) {
  const heading = findControl(
    'Profile.privacySettings',
    'h1,h2,h3,[role="heading"]',
  );
  return heading?.closest(
    scene.viewport === 'mobile' ? '[role="dialog"]' : 'section',
  );
}

export function createPreviewBridge() {
  let targets = new Map<string, Element>();
  let active: Element | undefined;

  function inspect(scene: Scene): Observation {
    const root = scene.privacy ? privacyScope(scene) : document.body;
    targets = new Map();
    const occurrences: Occurrence[] = [];
    const ambiguous = new Set<string>();
    if (!root) return { occurrences, ambiguous: [] };

    const add = (element: Element, value: string, surface: string) => {
      const text = normalize(value);
      const keys = copyKeys(text, scene.privacy);
      if (keys.length > 1) {
        for (const key of keys) ambiguous.add(key);
        return;
      }
      if (!keys.length) return;
      const [key] = keys;
      const id = JSON.stringify([
        key,
        scene.id,
        surface,
        ancestry(element, root),
      ]);
      if (targets.has(id)) return;
      targets.set(id, element);
      occurrences.push({ id, key, surface, text });
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (
        !element ||
        !node.textContent?.trim() ||
        element.closest('script, style, noscript, svg') ||
        !visible(element)
      )
        continue;
      const surface = element.closest('.sr-only')
        ? 'Screen reader text'
        : 'Text';
      add(element, node.textContent, surface);
    }
    for (const element of root.querySelectorAll(
      'p, span, a, button, label, h1, h2, h3, li',
    )) {
      const text = normalize(element.textContent ?? '');
      if (
        !element.children.length ||
        !copyKeys(text, scene.privacy).length ||
        [...element.children].some(
          (child) => normalize(child.textContent ?? '') === text,
        ) ||
        [...element.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            normalize(node.textContent ?? '') === text,
        ) ||
        !visible(element)
      )
        continue;
      add(
        element,
        text,
        element.closest('.sr-only') ? 'Screen reader text' : 'Text',
      );
    }
    for (const element of root.querySelectorAll(selector)) {
      if (!visible(element)) continue;
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        if (value) add(element, value, attribute);
      }
      if (element instanceof HTMLInputElement && element.type === 'submit')
        add(element, element.value, 'value');
    }
    return { occurrences, ambiguous: [...ambiguous] };
  }

  return {
    inspect,
    async prepare(scene: Scene, scroll: boolean) {
      for (const key of scene.open ?? []) {
        const control = await waitFor(
          () => findControl(key, 'button, [role="button"], [role="tab"]'),
          key,
        );
        if (!(control instanceof HTMLElement)) continue;
        if (control.getAttribute('aria-haspopup') === 'menu') {
          control.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              button: 0,
              pointerType: 'mouse',
            }),
          );
        } else {
          control.click();
        }
      }
      if (scene.privacy) {
        const root = await waitFor(
          () => privacyScope(scene),
          'Profile Privacy',
        );
        if (scroll && scene.viewport === 'desktop')
          root.scrollIntoView({ block: 'start' });
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
