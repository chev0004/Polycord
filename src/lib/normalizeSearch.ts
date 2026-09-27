export const normalizeSearch = (text: string) =>
  text.toLowerCase().replaceAll('_', ' ');
