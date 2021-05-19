import uniqBy from 'lodash.uniqby';
import {
  IQueueStorage,
  IQueueItem,
  ClientId,
} from '@related-queue/shared/types';

const UNIQUE_KEY = 'cid';

export class MemoryStorage<ItemType = any, ItemContext = any>
  implements IQueueStorage
{
  private queue: IQueueItem<ItemType, ItemContext>[] = [];

  private sortCompareFunction = (
    i1: IQueueItem<ItemType, ItemContext>,
    i2: IQueueItem<ItemType, ItemContext>
  ) => i1.createdAt.valueOf() - i2.createdAt.valueOf();

  private sortAndDeduplicateQueue(queue: IQueueItem<ItemType, ItemContext>[]) {
    return uniqBy(queue, UNIQUE_KEY).sort(this.sortCompareFunction);
  }

  public async set(
    queuedItem: IQueueItem<ItemType, ItemContext>
  ): Promise<ClientId> {
    // Place the item first, so that its preserved in case of duplicate - uniqBy preserves the first it encounters
    this.queue = this.sortAndDeduplicateQueue([queuedItem, ...this.queue]);
    return queuedItem.cid;
  }

  public async get(
    cid: ClientId
  ): Promise<IQueueItem<ItemType, ItemContext> | null> {
    if (!cid) return null;
    return this.queue.find((item) => item.cid === cid) ?? null;
  }

  public async delete(cid: ClientId): Promise<void> {
    if (!cid) return;
    this.queue = this.queue.filter((item) => item.cid !== cid);
  }

  public async all(): Promise<IQueueItem<ItemType, ItemContext>[]> {
    return this.queue;
  }
}
