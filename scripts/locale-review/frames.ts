import type { Scene } from './placements';
import type { PreviewWindow } from './preview';
import type { Locale } from './review-state';

export const widths = { desktop: 1120, mobile: 390 };

export async function loadScene(
  iframe: HTMLIFrameElement,
  scene: Scene,
  locale: Locale,
  wording: Record<string, string>,
  scroll: boolean,
  signal: AbortSignal,
  generation = 0,
) {
  const run = `${generation}-${crypto.randomUUID()}`;
  const view = window as PreviewWindow;
  view.localeReviewInputs ??= new Map();
  const inputs = view.localeReviewInputs;
  inputs.set(run, { locale, wording });
  iframe.src = `/iframe.html?${new URLSearchParams({
    id: scene.story,
    viewMode: 'story',
    locale,
    run,
  })}`;

  try {
    for (let attempt = 0; attempt < 240; attempt++) {
      signal.throwIfAborted();
      const child = iframe.contentWindow as PreviewWindow | null;
      const currentRun = new URLSearchParams(child?.location.search).get('run');
      if (currentRun === run && child?.localeReview) {
        await child.localeReview.prepare(scene, scroll);
        await new Promise((resolve) => setTimeout(resolve, 150));
        signal.throwIfAborted();
        return child.localeReview;
      }
      const error = child?.document.body?.querySelector(
        '.sb-show-errordisplay .sb-errordisplay_code',
      );
      if (currentRun === run && error?.textContent?.trim())
        throw new Error(error.textContent);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('The preview did not finish loading.');
  } finally {
    inputs.delete(run);
  }
}
