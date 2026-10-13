import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { TagAutocomplete } from './TagAutocomplete';
import 'src/app/globals.css';

const catalog = [
  { tag: 'Anime', count: 42 },
  { tag: 'Gaming', count: 40 },
  { tag: 'Cooking', count: 31 },
  { tag: 'Travel', count: 27 },
  { tag: 'Music', count: 22 },
  { tag: 'Photography', count: 12 },
  { tag: 'Rugby', count: 9 },
  { tag: 'Running', count: 7 },
  { tag: 'Ruby', count: 3 },
];

type ApiOptions = {
  failing?: boolean;
  delay?: (query: string) => number;
  ignoreAbort?: boolean;
};

const installTagApi =
  ({ failing, delay, ignoreAbort }: ApiOptions = {}) =>
  () => {
    const original = globalThis.fetch;
    globalThis.fetch = Object.assign(
      async (...args: Parameters<typeof fetch>) => {
        const [input, init] = args;
        if (!String(input).startsWith('/api/tags')) return original(...args);
        const params = new URL(String(input), 'http://localhost').searchParams;
        const query = (params.get('q') ?? '').toLowerCase();
        const skipped = params
          .getAll('exclude')
          .map((tag) => tag.toLowerCase());
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay?.(query) ?? 0);
          if (!ignoreAbort)
            init?.signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            });
        });
        if (failing) return new Response('{}', { status: 503 });
        const tags = catalog
          .filter(({ tag }) => !skipped.includes(tag.toLowerCase()))
          .filter(({ tag }) => tag.toLowerCase().includes(query))
          .sort(
            (a, b) =>
              Number(b.tag.toLowerCase() === query) -
                Number(a.tag.toLowerCase() === query) || b.count - a.count,
          )
          .slice(0, query ? 8 : 5);
        return new Response(JSON.stringify({ tags }));
      },
      { preconnect: original.preconnect },
    );
    return () => {
      globalThis.fetch = original;
    };
  };

const Harness = () => {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState<string[]>(['Anime']);

  return (
    <div className="flex w-[360px] flex-col gap-3">
      <div className="flex gap-2">
        <TagAutocomplete
          id="tags"
          value={value}
          onValueChange={setValue}
          selected={selected}
          onAdd={(tag) => {
            setSelected((current) => [...current, tag]);
            setValue('');
          }}
          placeholder="Type a tag and press Enter"
        />
      </div>
      <ul aria-label="Selected tags" className="flex gap-2 text-sm">
        {selected.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );
};

const meta: Meta<typeof Harness> = {
  title: 'Features/Profile/TagAutocomplete',
  component: Harness,
  decorators: [
    (Story) => (
      <div className="min-h-[420px] p-6">
        <Story />
      </div>
    ),
  ],
  beforeEach: installTagApi(),
};

export default meta;
type Story = StoryObj<typeof Harness>;

const body = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body);

const selectedTags = (canvasElement: HTMLElement) =>
  within(within(canvasElement).getByRole('list', { name: 'Selected tags' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

const optionNames = async (canvasElement: HTMLElement) =>
  (await body(canvasElement).findAllByRole('option')).map(
    (option) => option.textContent,
  );

export const PopularOnFocus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));

    await waitFor(async () =>
      expect(await optionNames(canvasElement)).toEqual([
        'Gaming(40)',
        'Cooking(31)',
        'Travel(27)',
        'Music(22)',
        'Photography(12)',
      ]),
    );
    await waitFor(() =>
      expect(body(canvasElement).getByText('Popular tags')).toBeVisible(),
    );
  },
};

export const SearchAndSelectWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.type(input, 'RU');
    await waitFor(async () =>
      expect(await optionNames(canvasElement)).toEqual([
        'Rugby(9)',
        'Running(7)',
        'Ruby(3)',
        expect.stringContaining('Create tag'),
      ]),
    );

    await userEvent.keyboard('{ArrowDown}{Enter}');

    await waitFor(() =>
      expect(selectedTags(canvasElement)).toEqual(['Anime', 'Running']),
    );
    await expect(input).toHaveValue('');
    await expect(body(canvasElement).queryByRole('listbox')).toBeNull();
  },
};

export const SelectWithClick: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'rub');

    await userEvent.click(
      await body(canvasElement).findByRole('option', { name: /^Ruby/ }),
    );

    await waitFor(() =>
      expect(selectedTags(canvasElement)).toEqual(['Anime', 'Ruby']),
    );
  },
};

export const CreateMissingTag: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.type(input, 'Brand new');
    const create = await body(canvasElement).findByRole('option', {
      name: 'Create tag "Brand new"',
    });
    await waitFor(() =>
      expect(
        body(canvasElement).getByText('No existing tags match.'),
      ).toBeVisible(),
    );

    await userEvent.click(create);

    await waitFor(() =>
      expect(selectedTags(canvasElement)).toEqual(['Anime', 'Brand new']),
    );
    await expect(input).toHaveValue('');
  },
};

export const ExactMatchHidesCreate: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'ruby');

    await waitFor(() =>
      expect(
        body(canvasElement).getByRole('option', { name: /^Ruby/ }),
      ).toBeVisible(),
    );
    await expect(
      body(canvasElement).queryByRole('option', { name: /Create tag/ }),
    ).toBeNull();
  },
};

export const SelectedTagsAreNotSuggested: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'anime');

    await waitFor(() =>
      expect(
        body(canvasElement).getByText('No existing tags match.'),
      ).toBeVisible(),
    );
    await expect(
      body(canvasElement).queryByRole('option', { name: /Anime/ }),
    ).toBeNull();
    await expect(
      body(canvasElement).queryByRole('option', { name: /Create tag/ }),
    ).toBeNull();
  },
};

export const EscapeDismisses: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');
    await userEvent.click(input);
    await waitFor(() =>
      expect(body(canvasElement).getByRole('listbox')).toBeVisible(),
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(body(canvasElement).queryByRole('listbox')).toBeNull(),
    );
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveFocus();
  },
};

export const SlowStaleResponseIsIgnored: Story = {
  beforeEach: installTagApi({
    delay: (query) => (query === 'ru' ? 700 : 0),
    ignoreAbort: true,
  }),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.type(input, 'ru');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await userEvent.type(input, 'n');

    await waitFor(async () =>
      expect(await optionNames(canvasElement)).toEqual([
        'Running(7)',
        expect.stringContaining('Create tag'),
      ]),
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await expect(await optionNames(canvasElement)).toEqual([
      'Running(7)',
      expect.stringContaining('Create tag'),
    ]);
  },
};

export const Loading: Story = {
  beforeEach: installTagApi({ delay: () => 1500 }),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));

    await waitFor(() =>
      expect(body(canvasElement).getByText('Loading tags...')).toBeVisible(),
    );
  },
};

export const LoadError: Story = {
  beforeEach: installTagApi({ failing: true }),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');

    await userEvent.type(input, 'Fallback');

    await waitFor(() =>
      expect(
        body(canvasElement).getByText("Couldn't load tag suggestions."),
      ).toBeVisible(),
    );
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(selectedTags(canvasElement)).toEqual(['Anime', 'Fallback']),
    );
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));

    await userEvent.click(
      await body(canvasElement).findByRole('option', { name: /^Cooking/ }),
    );

    await waitFor(() =>
      expect(selectedTags(canvasElement)).toEqual(['Anime', 'Cooking']),
    );
  },
};
