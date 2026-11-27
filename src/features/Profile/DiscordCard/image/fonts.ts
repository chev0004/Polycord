import 'server-only';

const TTF_AGENT =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

export type CardFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal' | 'italic';
};

const googleFonts = async (query: string) => {
  const response = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
    headers: { 'User-Agent': TTF_AGENT },
  });
  if (!response.ok) throw new Error(`Font CSS failed: ${response.status}`);
  const css = await response.text();
  return Promise.all(
    [
      ...css.matchAll(
        /font-style: (\w+);\s*font-weight: (\d+);[^}]*?src: url\((.+?)\)/g,
      ),
    ].map(async ([, style, weight, url]) => {
      const file = await fetch(url);
      if (!file.ok) throw new Error(`Font file failed: ${file.status}`);
      return {
        style: style as CardFont['style'],
        weight: Number(weight) as CardFont['weight'],
        data: await file.arrayBuffer(),
      };
    }),
  );
};

let figtree: Promise<CardFont[]> | undefined;

export const loadFigtree = () => {
  figtree ??= googleFonts(
    'family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,900',
  )
    .then((files) => files.map((file) => ({ ...file, name: 'Figtree' })))
    .catch((error) => {
      figtree = undefined;
      throw error;
    });
  return figtree;
};

export const loadZen = async (text: string): Promise<CardFont[]> => {
  const glyphs = [...new Set(text.replace(/\s/g, ''))].join('');
  if (!glyphs) return [];
  const files = await googleFonts(
    `family=Zen+Kaku+Gothic+New:wght@700&text=${encodeURIComponent(glyphs)}`,
  ).catch(() => []);
  return files.map((file) => ({ ...file, name: 'Zen' }));
};

let mono: Promise<CardFont[]> | undefined;

export const loadMono = () => {
  mono ??= googleFonts('family=Roboto+Mono:wght@700')
    .then((files) => files.map((file) => ({ ...file, name: 'Mono' })))
    .catch((error) => {
      mono = undefined;
      throw error;
    });
  return mono;
};
