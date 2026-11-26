export type SearchableOption = {
  label: string;
  value: string;
  names?: string[];
};

const fold = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{Mn}+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const rankOf = (option: SearchableOption, query: string) => {
  const names = [option.label, ...(option.names ?? [])].map(fold);
  if (names.includes(query)) return 0;
  if (names.some((name) => name.startsWith(query))) return 1;
  if ([...query].length > 1 && names.some((name) => name.includes(query)))
    return 2;
  return 3;
};

export const searchOptions = <T extends SearchableOption>(
  options: T[],
  query: string,
) => {
  const folded = fold(query);
  if (!folded) return options;

  return options
    .map((option) => ({ option, rank: rankOf(option, folded) }))
    .filter(({ rank }) => rank < 3)
    .sort((a, b) => a.rank - b.rank)
    .map(({ option }) => option);
};
