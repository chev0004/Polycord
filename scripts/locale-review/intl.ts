import {
  createTranslator as createIntlTranslator,
  useTranslations as useIntlTranslations,
} from 'next-intl';
import { isValidElement, useMemo } from 'react';

export * from 'next-intl';

export const renderedTranslations = new Map<string, Set<string>>();

export function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function toText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (Array.isArray(value)) return value.map(toText).join('');
  if (isValidElement<{ children?: unknown }>(value))
    return toText(value.props.children);
  return '';
}

function trace<T extends object>(translator: T, namespace?: string): T {
  const track = (method: unknown) =>
    new Proxy(method as (...args: unknown[]) => unknown, {
      apply(target, receiver, args) {
        const value: unknown = Reflect.apply(target, receiver, args);
        const text = normalize(toText(value));
        if (text) {
          const key = namespace ? `${namespace}.${args[0]}` : String(args[0]);
          if (!renderedTranslations.has(text))
            renderedTranslations.set(text, new Set());
          renderedTranslations.get(text)?.add(key);
        }
        return value;
      },
    });
  return new Proxy(translator, {
    apply(target, receiver, args) {
      return Reflect.apply(track(target), receiver, args);
    },
    get(target, property, receiver) {
      const method: unknown = Reflect.get(target, property, receiver);
      return property === 'rich' || property === 'markup' || property === 'raw'
        ? track(method)
        : method;
    },
  });
}

export const useTranslations = ((namespace?: string) => {
  const translator = useIntlTranslations(namespace);
  return useMemo(() => trace(translator, namespace), [translator, namespace]);
}) as typeof useIntlTranslations;

export const createTranslator = ((
  ...args: Parameters<typeof createIntlTranslator>
) =>
  trace(
    createIntlTranslator(...args),
    args[0].namespace,
  )) as typeof createIntlTranslator;
