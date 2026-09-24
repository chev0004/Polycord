const returnLabels = {
  '': 'backToDiscovery',
  '/saved': 'backToSaved',
  '/profile': 'backToEditor',
} as const;

export const profileReturn = (locale: string, from: string | null) => {
  const path = from?.split(/[?#]/)[0] ?? '';
  const segment = path.replace(`/${locale}`, '');

  if (
    from &&
    path.startsWith(`/${locale}`) &&
    Object.hasOwn(returnLabels, segment)
  ) {
    return {
      href: from,
      label: returnLabels[segment as keyof typeof returnLabels],
    };
  }

  return { href: `/${locale}`, label: returnLabels[''] };
};
