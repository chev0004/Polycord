import { describe, expect, test } from 'bun:test';
import { withSelectedTags } from './discoveryTags';

const tag = (name: string, count: number) => ({ tag: name, count });
const popular = [tag('a', 9), tag('b', 8), tag('c', 7), tag('d', 6)];

describe('withSelectedTags', () => {
  test('replaces the least popular unselected tag and keeps the size', () => {
    expect(withSelectedTags(popular, ['x'], [tag('x', 2)], 4)).toEqual([
      tag('a', 9),
      tag('b', 8),
      tag('c', 7),
      tag('x', 2),
    ]);
  });

  test('never drops a selected tag to make room', () => {
    expect(withSelectedTags(popular, ['d', 'x'], [tag('x', 2)], 4)).toEqual([
      tag('a', 9),
      tag('b', 8),
      tag('d', 6),
      tag('x', 2),
    ]);
  });

  test('keeps several selected tags outside the popular set', () => {
    const result = withSelectedTags(
      popular,
      ['x', 'y'],
      [tag('y', 1), tag('x', 2)],
      4,
    );
    expect(result.map((entry) => entry.tag)).toEqual(['a', 'b', 'x', 'y']);
  });

  test('uses free slots before replacing anything', () => {
    expect(withSelectedTags(popular, ['x'], [tag('x', 2)], 5)).toHaveLength(5);
    expect(withSelectedTags(popular, ['x'], [tag('x', 2)], 5)).toContainEqual(
      tag('d', 6),
    );
  });

  test('leaves the list alone when nothing is missing', () => {
    expect(withSelectedTags(popular, ['a'], [], 4)).toEqual(popular);
  });
});
