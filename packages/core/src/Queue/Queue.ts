import { nanoid } from 'nanoid';
import {
  ClientId,
  IQueueItem,
  IQueueStorage,
  ItemHandlerFunction,
} from '@related-queue/shared/types';
import { QueuedItem } from '../QueuedItem';
import {
  IQueue,
  ItemIDMap,
  QueuedItemOptions,
  QueueOptions,
  QueueEventHandlerFunction,
  QueueEvent,
} from '../types';

export class Queue<ItemType = any, ItemContext = any>
  implements IQueue<ItemType>
{
  private handler: ItemHandlerFunction<ItemType, ItemContext>;
  private storage: IQueueStorage<ItemType, ItemContext>;
  private handledHashes: Map<ClientId, string>;
  private eventHandlers: Map<
    QueueEvent,
    Map<string, QueueEventHandlerFunction>
  >;
  private _lastFlushed: Date | null = null;

  constructor(options: QueueOptions<ItemType>) {
    checkOptions(options);
    this.handler = options.handler;
    this.storage = options.storage;
    this.handledHashes = new Map<ClientId, string>();

    this.eventHandlers = new Map<
      QueueEvent,
      Map<string, QueueEventHandlerFunction>
    >();
  }

  // HASH MANAGEMENT
  // - hashes are used defensively to protect against faulty handler or storage implementations.
  // - basically, an item which has not changed since the last time it was passed through the handler is barred from being handled again until it changes.

  private trimHandledHashes(queue: QueuedItem<ItemType, ItemContext>[] | null) {
    if (!queue?.length) {
      // All handledHashes are superfluous
      this.handledHashes.clear();
    } else {
      const queuedClientIds = queue.reduce<string[]>((acc, member) => {
        return [...acc, member.cid];
      }, []);

      const handledClientIds = this.handledHashes.keys();
      let clientId = handledClientIds.next();

      while (!clientId.done) {
        if (!queuedClientIds.includes(clientId.value)) {
          // the handled client id hash no longer has a corresponding queue entry, so can be deleted
          this.handledHashes.delete(clientId.value);
          clientId = handledClientIds.next();
        }
      }
    }
  }

  private updateHash(queuedItem: QueuedItem<ItemType, ItemContext>) {
    this.handledHashes.set(queuedItem.cid, queuedItem.hash);
  }

  private clearHash(cid: ClientId) {
    this.handledHashes.delete(cid);
  }

  private getLastHandledHash(cid: ClientId) {
    return this.handledHashes.get(cid);
  }

  // QUEUE HELPERS

  private async getQueue() {
    const stored = await this.storage.all();
    if (!stored?.length) return null;

    return stored.reduce<QueuedItem<ItemType, ItemContext>[]>((acc, s) => {
      if (!s) return acc;

      return [...acc, this.createQueuedItemFromStored(s)];
    }, []);
  }

  // Note side effect contained!
  private async getQueuedItemsToHandle(
    queue: QueuedItem<ItemType, ItemContext>[]
  ): Promise<QueuedItem<ItemType, ItemContext>[]> {
    const readyAndWaiting = queue.filter((queued) => queued.ready);

    if (!readyAndWaiting.length) return [];

    const handlerNaive = [];

    for (const waiting of readyAndWaiting) {
      const lastHandledHash = this.getLastHandledHash(waiting.cid);
      const currentHash = waiting.hash;
      const naive =
        !Boolean(lastHandledHash) || lastHandledHash !== currentHash;

      if (naive) {
        handlerNaive.push(waiting);
        break;
      }

      // Shouldn't occur, but safety check:
      // Provided handler is badly coded, did not modify item. Mark an error to show why item is not being processed.
      // Could throw error, but this would interrupt UX. At least this way an error may be cleared via reset.
      waiting.onError(
        new Error(
          'Queue item has not updated since last pass through handler. Make sure handler returns one of error, id, or a changed context for every call, and that storage is updating the item in the queue.'
        )
      );
      console.error(
        'Your handler function or storage manager needs attention. Your queue items are being marked with errors as they have not been changed between passes through the handler.'
      );
      await this.queue(waiting.item, waiting);
    }

    return handlerNaive;
  }

  // ITEM TRANSFORMERS

  private createQueuedItemFromStored(
    stored: IQueueItem<ItemType, ItemContext>
  ) {
    return new QueuedItem<ItemType, ItemContext>(stored.item, stored);
  }

  // HANDLERS

  private async handleQueueItemErrorOutcome(
    queuedItem: QueuedItem<ItemType, ItemContext>,
    error: Error | string
  ) {
    queuedItem.onError(error);
    await this.queue(queuedItem.item, queuedItem);
    this.updateHash(queuedItem);
  }

  private async handleIdMapping(idMap: ItemIDMap) {
    const queue = await this.getQueue();

    if (!queue?.length) return;

    for (const i of queue) {
      const hash = i.hash;
      i.onSuccess(idMap);

      if (i.hash === hash) {
        // informing the item of the new id caused no change
        break;
      }

      // the item updated itself in response to the new id
      await this.storage.set(i);
    }
  }

  private async handleQueueItemIdOutcome(
    queuedItem: QueuedItem<ItemType, ItemContext>,
    id: string
  ) {
    await this.delete(queuedItem.cid);
    const idMap = new Map();
    idMap.set(queuedItem.cid, id);

    await this.handleIdMapping(idMap);
    // update the hash, even though complete - to protect against a storage implementation error not deleting item
    this.updateHash(queuedItem);

    // Call event notifier, but DON'T wait for it.
    this.onQueueItemDone(queuedItem, id);
  }

  private async handleQueuedItem(queued: QueuedItem<ItemType, ItemContext>) {
    try {
      // Need to take care with outcome, as user-provided handler code.
      const status = await this.handler(queued.item, queued.context);

      if (!status) {
        // no status returned
        throw new Error(
          'No status returned from handler. Check your handler always returns a status object.'
        );
      }

      const { id, error } = status;

      if (id) {
        // id was set
        await this.handleQueueItemIdOutcome(queued, id);
        return;
      }

      if (error) {
        // error occurred
        await this.handleQueueItemErrorOutcome(queued, error);
        return;
      }
    } catch (error) {
      await this.handleQueueItemErrorOutcome(queued, error);
    }
  }

  // EVENTS

  private async onQueueItemDone(
    queuedItem: QueuedItem<ItemType, ItemContext>,
    id: string
  ) {
    const event = QueueEvent.Done;

    const eventHandlers = this.eventHandlers.get(event);

    const handlersIterator = eventHandlers?.values();

    if (!handlersIterator) return;

    const handlers = [];
    let handler = handlersIterator.next();

    while (!handler.done) {
      handlers.push(handler.value);
      handler = handlersIterator.next();
    }

    if (!handlers.length) return;

    await Promise.all([handlers.map((h) => h(queuedItem, id))]);
    return;
  }

  // FLUSH

  private _flush = async (pass: number = 1): Promise<void> => {
    const queue = await this.getQueue();

    if (pass == 1) {
      // trim handled hashes to prevent memory leak
      // only on first pass, as otherwise an item which is meant to be removed,
      // but isn't, will have its handled hash removed and therefore always be regarded
      // as handler naive.
      this.trimHandledHashes(queue);
    }

    if (!queue?.length) return;

    const ready = await this.getQueuedItemsToHandle(queue);

    if (!ready.length) return;

    for (const next of ready) {
      await this.handleQueuedItem(next);
    }

    return await this._flush(pass + 1);
  };

  // PUBLIC API

  /**
   * Upserts an item to the queue, de-duplicated by the client id provided in options.
   * @param item The item to be processed by the handler
   * @param options Metadata about the item
   * @returns Promise<ClientId>
   */
  public async queue(
    item: ItemType,
    options: QueuedItemOptions = {}
  ): Promise<ClientId> {
    const queuedItem = new QueuedItem(item, options);
    return this.storage.set(queuedItem);
  }

  // Note that handled hash is not cleared here. If the deletion does not occur,
  // and there is no handled hash, it's always thought to be naive. Instead,
  // the handledHashes are trimmed when the queue is retrieved.
  /**
   * Delete an item from the queue, identified by its client id
   * @param cid
   */
  public async delete(cid: ClientId): Promise<void> {
    await this.storage.delete(cid);
  }

  /**
   *
   * @param cid Retrieve an item from the queue, with its metadata.
   * @returns Promise<IQueueItem>
   */
  public async get(
    cid: ClientId
  ): Promise<IQueueItem<ItemType, ItemContext> | null> {
    return await this.storage.get(cid);
  }

  /**
   * Reset a queue item's status in the queue - clears any errors, and allows handling if ready.
   * @param cid
   * @returns
   */
  public async reset(cid: ClientId): Promise<void> {
    const stored = await this.storage.get(cid);
    if (!stored) return;
    const queuedItem = this.createQueuedItemFromStored(stored);

    queuedItem.reset();

    await this.queue(queuedItem.item, queuedItem);
    this.clearHash(queuedItem.cid);
  }

  /**
   * Triggers a recursive sweep of the queue, passing any, and subsequently ready, items through the handler function.
   */
  public async flush() {
    await this._flush();
    this._lastFlushed = new Date();
  }

  public get lastFlushed() {
    return this._lastFlushed;
  }

  /**
   * Pass a map of clientId:finalId, which will be used to implement any matching relationships for queued items.
   */
  public updateIds(idMap: ItemIDMap) {
    this.handleIdMapping(idMap);
  }

  public on(
    event: QueueEvent,
    eventHandler: QueueEventHandlerFunction<ItemType, ItemContext>
  ) {
    if (event !== QueueEvent.Done) throw new Error('Invalid event');

    const handlerId = nanoid();

    const hasEventHandlers = this.eventHandlers.has(event);

    if (!hasEventHandlers) {
      this.eventHandlers.set(
        event,
        new Map<string, QueueEventHandlerFunction<ItemType, ItemContext>>()
      );
    }

    const eventHandlers = this.eventHandlers.get(event)!;

    eventHandlers.set(handlerId, eventHandler);

    return () => {
      const eventHandlers = this.eventHandlers.get(event);

      if (!eventHandlers) return;

      eventHandlers.delete(handlerId);
    };
  }
}

// UTILITY

function checkOptions<ItemType>(
  options: QueueOptions<ItemType>
): asserts options is QueueOptions<ItemType> {
  if (!options) throw new Error('Missing Related Queue constructor options');
  if (typeof options !== 'object')
    throw new Error('Related Queue constructor options must be an object');

  const { handler, storage } = options;

  if (!handler) {
    throw new Error('Missing Related Queue constructor options.handler');
  }

  if (typeof handler !== 'function') {
    throw new Error(
      'Related Queue constructor options.handler must be a function'
    );
  }

  if (!storage) {
    throw new Error('Missing Related Queue constructor options.storage');
  }

  if (typeof storage !== 'object') {
    throw new Error(
      'Related Queue constructor options.storage must be an instance of QueueStorage'
    );
  }
}
