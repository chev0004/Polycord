import type { PreviewWindow } from './preview';
import type { Locale } from './review-state';

export type Messages = { [key: string]: string | Messages };

const offset = 0xe0000;
const end = '\u{E007F}';
const tag = /([\u{E0020}-\u{E007E}]+)\u{E007F}/gu;

const shift = (text: string, by: number) =>
  String.fromCodePoint(
    ...[...text].map((char) => (char.codePointAt(0) as number) + by),
  );

export const tagKey = (key: string) => shift(key, offset) + end;

export const keysIn = (text: string) =>
  [...text.matchAll(tag)].map(([, hidden]) => shift(hidden, -offset));

export const clean = (text: string) =>
  text.replace(tag, '').replace(/\s+/g, ' ').trim();

export function localize(messages: Messages, locale: Locale) {
  const run = new URLSearchParams(window.location.search).get('run') ?? '';
  const input = (window.parent as PreviewWindow).localeReviewInputs?.get(run);
  const wording = input?.locale === locale ? input.wording : {};
  const visit = (node: Messages, prefix: string): Messages =>
    Object.fromEntries(
      Object.entries(node).map(([name, value]) => {
        const key = prefix + name;
        return [
          name,
          typeof value === 'string'
            ? (wording[key] ?? value) + tagKey(key)
            : visit(value, `${key}.`),
        ];
      }),
    );
  return visit(messages, '');
}
