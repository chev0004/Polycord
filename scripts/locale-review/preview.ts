import type { Scene } from './placements';
import type { Locale, Observation, Occurrence } from './review-state';
import { clean, keysIn } from './tags';

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

const clickable =
  'button, a, summary, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"]';
const fields = 'input, textarea';
const translationKey = /^\w+(\.\w+)+$/;

function find(target: string, query: string) {
  const byKey = translationKey.test(target);
  const byText = target.startsWith('=');
  return [...document.querySelectorAll(byKey || byText ? query : target)].find(
    (element) => {
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
    },
  );
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

async function perform(step: string) {
  if (step.startsWith('?')) {
    await waitFor(() => find(step.slice(1), 'body *'), step);
    return;
  }
  const [target, value] = step.split(' <- ');
  const swipe = target.startsWith('swipe ');
  const name = swipe ? target.slice(6) : target;
  const element = await waitFor(
    () => find(name, value === undefined ? clickable : fields),
    name,
  );
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
}

function privacyScope(scene: Scene) {
  const heading = find('Profile.privacySettings', 'h1,h2,h3,[role="heading"]');
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
    return { occurrences };
  }

  return {
    inspect,
    async prepare(scene: Scene, scroll: boolean) {
      for (const step of scene.open ?? []) {
        await perform(step);
        await new Promise((resolve) => setTimeout(resolve, 150));
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
