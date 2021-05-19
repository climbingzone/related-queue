import { ItemRelation } from '@related-queue/shared/types';
import cloneDeep from 'lodash.clonedeep';
import set from 'lodash.set';
import { ItemIDMap } from '../types';

type ImplementRelationsResult<ItemType = any> = {
  item: ItemType;
  relations: ItemRelation[];
};

/**
 * Implements relations as indicated by relationship specs and id mapping.
 * @param item
 * @param relations
 * @param idMap
 * @returns New item object if relations implemented, or the un modified item if not, with any outstanding relations.
 */
export function implementRelations<ItemType = any>(
  item: ItemType,
  relations: ItemRelation[],
  idMap: ItemIDMap
): ImplementRelationsResult<ItemType> {
  if (!item) throw new Error('Missing item argument');
  if (!relations) throw new Error('Missing relations argument');
  if (!idMap) throw new Error('Missing idMap argument');

  const matchedRelations = relations.filter((relation) =>
    idMap.has(relation.cid)
  );

  if (!matchedRelations.length) {
    return { item, relations };
  }

  const updatedItem = cloneDeep(item);

  for (const relation of matchedRelations) {
    const id = idMap.get(relation.cid);
    set(updatedItem as any, relation.destPath, id);
  }

  const remainingRelations = relations.filter(
    (relation) => !idMap.has(relation.cid)
  );

  return {
    item: updatedItem,
    relations: remainingRelations,
  };
}
