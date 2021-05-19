export type ClientId = string;
export type ItemId = string;

/**
 * Defines a relationship required for an item before it can be progressed off the queue.
 * @param cid is the relationship's target item client id, which is used to identify the correct target once it's progressed off the queue.
 * @param srcPath is the lodash.get style path from which to obtain the relationship's target item id.
 * @param destPath is the lodash.set style path to which to place the resolved relationship id.
 */
export type ItemRelation = {
  cid: ClientId;
  destPath: string;
};

export type IQueueItem<ItemType = any, ItemContext = any> = {
  cid: ClientId;
  item: ItemType;
  context: ItemContext;
  relations: ItemRelation[];
  error: Error | string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type IQueueStorage<ItemType = any, ItemContext = any> = {
  set(queuedItem: IQueueItem<ItemType, ItemContext>): Promise<ClientId>;
  get(cid: ClientId): Promise<IQueueItem<ItemType, ItemContext> | null>;
  delete(cid: ClientId): Promise<void>;
  all(): Promise<IQueueItem<ItemType, ItemContext>[]>;
};

/**
 * The status of an item after processing by the handler function. Must return one of error, id, or context **with** changes.
 * @param id Returning an ID string indicates that the item is complete and can be removed from the queue. The ID will be reported to others in the queue so they may implement any specified relationships with that ID.
 * @param error Returning an Error will record the error in the item's errors field, and halt processing of the item until it is cleared
 * @param context Any context returned will replace the current item context.
 */
export type QueueItemHandlerOutcome = {
  error?: Error | null;
  id?: ItemId | null;
};

/**
 * Is called with when an item is deemed fulfilled, ie its relationships are implemented.
 * @param item ItemType The item to be handled
 * @param context ItemContext The associated item context
 * @returns status QueueItemHandlerOutcome
 */
export type ItemHandlerFunction<ItemType = any, ItemContext = any> = (
  item: ItemType,
  context: ItemContext
) => QueueItemHandlerOutcome | Promise<QueueItemHandlerOutcome>;
