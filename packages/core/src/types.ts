import {
  ClientId,
  IQueueItem,
  ItemId,
  IQueueStorage,
  ItemHandlerFunction,
} from '@related-queue/shared/types';

export type QueueOptions<ItemType = any> = {
  handler: ItemHandlerFunction<ItemType>;
  storage: IQueueStorage<ItemType>;
};

export enum QueueEvent {
  Done = 'done',
}

export type QueueEventHandlerFunction<ItemType = any, ItemContext = any> = (
  queuedItem: IQueueItem<ItemType, ItemContext>,
  id: string | null
) => any;

/**
 * Maps from CID:ID
 */
export type ItemIDMap = Map<ClientId, ItemId>;

export type QueuedItemOptions = Partial<Omit<IQueueItem, 'item'>>;

/**
 * The item DTO with meta concerning its internal ID and status in the queue
 */
export type IQueuedItem<ItemType = any, ItemContext = any> = IQueueItem<
  ItemType,
  ItemContext
> & {
  ready: boolean;
  onSuccess: (idMap: ItemIDMap) => void;
  onError: (error: Error | string) => void;
  reset: () => void;
};

export type IQueue<ItemType = any, ItemContext = any> = {
  queue(item: ItemType, options?: QueuedItemOptions): Promise<ClientId>;
  delete(cid: ClientId): Promise<void>;
  get(cid: ClientId): Promise<IQueueItem<ItemType, ItemContext> | null>;
  reset(cid: ClientId): Promise<void>;
  flush(): Promise<void>;
  lastFlushed: Date | null;
};

export type IControlledQueue<ItemType = any, ItemContext = any> = IQueue<
  ItemType,
  ItemContext
> & {
  enableAutoFlush: (enabled: boolean) => void;
};
