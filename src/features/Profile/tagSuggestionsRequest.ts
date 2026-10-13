export type TagSuggestion = {
  tag: string;
  count: number;
};

export const fetchTagSuggestions = async (
  query: string,
  exclude: string[],
  signal: AbortSignal,
): Promise<TagSuggestion[]> => {
  const params = new URLSearchParams({ q: query });
  for (const tag of exclude) {
    params.append('exclude', tag);
  }
  const response = await fetch(`/api/tags?${params}`, { signal });
  if (!response.ok) {
    throw new Error('Tag suggestions failed');
  }
  return (await response.json()).tags;
};
