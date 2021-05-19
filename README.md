# Related Queue

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

A Javascript module to manage queuing items which have relationships to each other which need deferred fulfillment.

## Use Case

You have items which need to be persisted to an API, but you don't have a reliable network connection. The items have relationships to each other which need to be implemented, as well as saving each item - but you can't implement the relationships until you can save items. You want to stash items so they can be saved later, and provide UI updates on their status to the user.

## Example

As an example, imagine we have an API which handles `Pirate` and `Parrot` objects as below:

```typescript
interface Pirate {
  id: string;
  name: string;
  parrotId: string;
}

interface Parrot {
  id: string;
  name: string;
}
```

We want to save a `Pirate` item and a `Parrot` item. The `Pirate` item needs to know the ID of the related `Parrot` before it can be saved. We have all data except for the item IDs:

```typescript
const pirateSally: Partial<Pirate> = {
  name: 'Sally',
};

const parrotPete: Partial<Parrot> = {
  name: 'Pete',
};
```

Related Queue accepts a partially completed item, with context of what relationships are outstanding and how to fulfil them.

In this example, we want Pete to be Sally's parrot. Both `parrotPete` and `pirateSally` can be queued, with their relationship specified.

If `parrotPete` is saved successfully from the queue, the queue will use the saved `Parrot` result to update `pirateSally` with her `Parrot` relationship as specified. Then the completed `pirateSally` item will be saved to the API.

## Implementation

The simplest implementation is with the minimal RelatedQueue class.

To implement the example above, import the RelatedQueue class constructor then instantiate it with a handler function.

You can then add queue items with their relationship specifications.

```typescript
import { RelatedQueue, ItemHandlerFunction } from 'related-queue';

const handler: ItemHandlerFunction = async (item: Pirate | Parrot) => {
  //... save item

  return {
    error: null, // or Error if there was a problem
    id: 'id', // id from API or null if there was a problem
  };
};

const saltyQueue = new RelatedQueue<Pirate | Parrot>(handler);

const pirateSally: Partial<Pirate> = {
  name: 'Sally',
};

const parrotPete: Partial<Parrot> = {
  name: 'Pete',
};
const parrotPeteCID = '123';

saltyQueue.queue(pirateSally, {
  relations: [{ parrotId: parrotPeteCID }],
});

saltyQueue.queue(parrotPete, { cid: parrotPeteCID });
```

And that's it. Note that `parrotPete` was queued with an associated `cid`, and that `cid` was specified as a relationship for `pirateSally`, at the path of `parrotId`.

The queue will handle saving the items and updating their relationships in the following way;

1. The handler function is called with the `parrotPete` item, as `parrotPete` has no outstanding relationships to fulfil.
2. The handler function reports an `id` from the API for `parrotPete`, which is then associated with the `cid` of `parrotPete`.
3. `parrotPete` is removed from the queue, as it now has an `id`.
4. All queuedItems which specified `parrotPete`'s `cid` as a relationship are updated with the new `id` in the way they specified in their relations array. For `pirateSally`, this means that the new `id` is set at the path `parrotId`.
5. The next valid item is then passed to the handler function. This will be `pirateSally`, as her relationships have been fulfilled.
6. Once the handler reports an id for `pirateSally`, she will also be removed from the queue.

# Handler function

You must provide a handler function. Its signature should match:

```typescript
type ItemId = string;

type QueueItemHandlerOutcome = {
  error?: Error | null;
  id?: ItemId | null;
};

type ItemHandlerFunction<ItemType = any, ItemContext = any> = (
  item: ItemType,
  context: ItemContext
) => QueueItemHandlerOutcome | Promise<QueueItemHandlerOutcome>;
```

The handler outcome object **MUST** contain either an error or id parameter with a truthy value.

If the handler returns neither, or throws an error, the item will be marked with an error and blocked from progressing in the queue.

# Queue variants available

All queue class variants are exported from the `related-queue` package.

- `RelatedQueue` - the simplest queue to use, with in-memory storage.
- `Queue` - the base queue class from which all others are based. Takes a handler function and storage implementation as options.
- `AutoFlushingQueue` - the same functionality as `Queue`, but with toggleable auto flushing functionality when items are added/removed/reset.

## class `Queue`

```typescript
import { Queue, ItemHandlerFunction, MemoryStorage } from 'related-queue';

const handler: ItemHandlerFunction = async (item: Pirate | Parrot) => {
  //... save item

  return {
    error: null, // or Error if there was a problem
    id: 'id', // id from API or null if there was a problem
  };
};

const queue = new Queue({ handler, storage: new MemoryStorage() });

// ... use queue
```

### Queue<ItemType = any, ItemContext = any>#_constructor_({ storage: IQueueStorage<ItemType, ItemContext>, handler: ItemHandlerFunction<ItemType, ItemContext> }): Queue instance

### Queue<ItemType>#_queue_(item: ItemType, context?: ItemContext): Promise<CID>

Adds an item to the queue, with optional context. If item with specified CID exists already in the queue, updates that item.

### Queue<ItemType>#_get_(cid: string): Promise<ItemType | null>

Retrieves an item from the queue by CID.

### Queue<ItemType>#_delete_(cid: string): void

Deletes an item from the queue by CID.

### Queue#_flush_(): Promise<void>

Flushes the queue, ie runs each valid queue item through the handler and updates relationships, recursively until no further items may be progressed off the queue.

## class `AutoFlushingQueue`

```typescript
import {
  AutoFlushingQueue,
  ItemHandlerFunction,
  MemoryStorage,
} from 'related-queue';

const handler: ItemHandlerFunction = async (item: Pirate | Parrot) => {
  //... save item

  return {
    error: null, // or Error if there was a problem
    id: 'id', // id from API or null if there was a problem
  };
};

const queue = new AutoFlushingQueue({
  handler,
  storage: new MemoryStorage(),
  autoFlushEnabled: false,
});

// ... use queue

// ...later, enable auto flush
queue.enableAutoFlush(true);

// ... use queue
```

... as for `Queue`, with:

### AutoFlushingQueue<ItemType = any, ItemContext = any>#_constructor_({ storage: IQueueStorage<ItemType, ItemContext>, handler: ItemHandlerFunction<ItemType, ItemContext>, enableAutoFlush?: boolean }): Queue instance

### AutoFlushingQueue<ItemType>#_enableAutoFlush_(enabled: boolean): void

Toggle queue auto flushing whenever on any interaction, which is the default behaviour.

## class `RelatedQueue`

... as for `Queue`, but only requiring a handler function as sole constructor argument; in-memory storage is already set up. See first example.

# Storage

## Memory Storage

The `MemoryStorage` class is exported from `related-queue` and is a drop in solution for any of the queues.

## Custom Storage

You can pass whatever custom Storage implementation you like to a queue constructor, but it must implement the `IQueueStorage` interface (see Basic Types below) and follow these basic rules:

- Items are uniquely identified by their unique `cid`.
- If a queued item is passed to `set()` twice, the last passed item should be the only item in the queue with its `cid`.
- Each set or delete operation must be wholly complete before the promise returns.

The queue works in a LTR fashion - so if you intend FIFO or LIFO functionality, you should sort by the item's createdAt property.

# Basic Types

```typescript
type ClientId = string;
```

```typescript
type ItemRelation = {
  cid: ClientId;
  destPath: string;
};
```

```typescript
type IQueueItem<ItemType = any, ItemContext = any> = {
  cid: ClientId;
  item: ItemType;
  context: ItemContext;
  relations: ItemRelation[];
  error: Error | string | null;
  createdAt: Date;
  updatedAt: Date | null;
};
```

```typescript
type IQueueStorage<ItemType = any, ItemContext = any> = {
  set(queuedItem: IQueueItem<ItemType, ItemContext>): Promise<ClientId>;
  get(cid: ClientId): Promise<IQueueItem<ItemType, ItemContext> | null>;
  delete(cid: ClientId): Promise<void>;
  all(): Promise<IQueueItem<ItemType, ItemContext>[] | null>;
};
```

# Caveats

## Bidirectional relationships

Related Queue cannot handle cases in which two items are related to each other. This relationship can be specified, but both items would remain on the queue and never be handed to the handler. It would be possible to save one of the items externally to the queue, and update the queued item's relationship via queue.updateIds().

## IE support

Related Queue uses `nanoid` as a dependency. If you want to support IE, you'll need to polyfill `crypto`. [See the `nanoid` README, under Usage --> IE](https://www.npmjs.com/package/nanoid)
