import md5 from 'md5';
import { nanoid } from 'nanoid';
import {
  ClientId,
  ItemRelation,
  IQueueItem,
} from '@related-queue/shared/types';
import { IQueuedItem, ItemIDMap } from '../types';
import { implementRelations } from './implementRelations';

// TODO make serialize function
// TODO make deserialize static creator function --> QueuedItem instance

export class QueuedItem<ItemType = any, ItemContext = any>
  implements IQueuedItem<ItemType, ItemContext>
{
  private props: IQueueItem;

  constructor(item: ItemType, options: Partial<Omit<IQueueItem, 'item'>>) {
    if (!item) throw new Error('QueuedItem constructor missing item argument');
    if (!options)
      throw new Error('QueuedItem constructor missing options argument');

    this.props = {
      item,
      cid: options.cid ?? nanoid(),
      context: options.context ?? null,
      relations: options.relations ?? [],
      error: options.error ?? null,
      createdAt: options.createdAt ?? new Date(),
      updatedAt: options.updatedAt ?? null,
    };
  }

  public get cid(): ClientId {
    return this.props.cid;
  }

  public get item(): ItemType {
    return this.props.item;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | null {
    return this.props.updatedAt;
  }

  public get error(): Error | string | null {
    return this.props.error;
  }

  public get relations(): ItemRelation[] {
    return this.props.relations;
  }

  public get ready(): boolean {
    return !Boolean(this.props.relations.length) && !this.props.error;
  }

  public get context(): ItemContext {
    return this.props.context;
  }

  public set context(context: ItemContext) {
    this.props.context = context;
    this.onChange();
  }

  public get hash(): string {
    return md5(JSON.stringify(this.props));
  }

  private onChange() {
    this.props.updatedAt = new Date();
  }

  public onSuccess(idMap: ItemIDMap) {
    const { item, relations } = implementRelations(
      this.props.item,
      this.props.relations,
      idMap
    );

    // Note assumption of immutability
    const updated =
      item !== this.props.item || relations !== this.props.relations;

    this.props.item = item;
    this.props.relations = relations;

    if (updated) {
      this.props.error = null;
      this.onChange();
    }
  }

  public onError(error: Error | string) {
    this.props.error = error;
    this.onChange();
  }

  public reset() {
    this.props.error = null;
    this.onChange();
  }
}
