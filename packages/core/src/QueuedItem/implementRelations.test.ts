import { ItemRelation } from '@related-queue/shared/types';
import { implementRelations } from './implementRelations';

describe('implementRelations', () => {
  test('exists', () => {
    expect(implementRelations).toBeDefined();
  });

  test('takes an item, relationships, id map as arguments', () => {
    const shouldThrow = () => {
      // @ts-ignore
      implementRelations();
    };

    expect(shouldThrow).toThrow();

    const shouldAlsoThrow = () => {
      // @ts-ignore
      implementRelations({});
    };

    expect(shouldAlsoThrow).toThrow();

    const shouldThrowToo = () => {
      // @ts-ignore
      implementRelations({}, [{ destPath: 'key', cid: 'cid' }]);
    };

    expect(shouldThrowToo).toThrow();

    const shouldNotThrow = () => {
      // @ts-ignore
      implementRelations({}, [{ destPath: 'key', cid: '' }], new Map());
    };

    expect(shouldNotThrow).not.toThrow();
  });

  describe('with a relationship specification', () => {
    const item = {};
    const relations: ItemRelation[] = [{ destPath: 'key', cid: 'cid' }];

    test('returns the unmodified item and relations if no id mapping', () => {
      const map = new Map();
      const result = implementRelations(item, relations, map);

      expect(result.item).toBe(item);
      expect(result.relations).toBe(relations);
    });

    test('returns the unmodified item and relations if id mapping does not match any relation', () => {
      const map = new Map();
      map.set('othercid', 'itemid');

      const result = implementRelations(item, relations, map);

      expect(result.item).toBe(item);
      expect(result.relations).toBe(relations);
    });

    test('returns a new item and with the relationship implemented if relation.cid is present in id map', () => {
      const map = new Map();
      map.set('cid', 'id');

      const result = implementRelations(item, relations, map);

      expect(result.item).toMatchObject({ key: 'id' });
    });

    test('returns a new relations array without implemented relations if any are implemented', () => {
      const map = new Map();
      map.set('cid', 'id');

      const result = implementRelations(item, relations, map);

      expect(result.item).toMatchObject({ key: 'id' });

      expect(result.relations.length).toBe(0);
      expect(result.relations).not.toBe(relations);
    });
  });
});
