import { IQueueItem } from '@related-queue/shared/types';
import { QueuedItem } from '../QueuedItem';
import { Queue } from './Queue';
import { QueuedItemOptions, QueueEvent } from '../types';

const dummyStorage = {};

const getMockHandler = () => jest.fn();
export const getMockStorage = () => {
  const storage = {
    get: jest.fn(),
    set: jest.fn().mockReturnValue(Promise.resolve('storagecid')),
    delete: jest.fn(),
    all: jest.fn(),
  };

  return storage;
};
const getMockedQueue = () => {
  const handler = getMockHandler();
  const storage = getMockStorage();
  return new Queue({ storage, handler });
};

const getItem = () => ({ key: 'value' } as const);

describe('Queue class', () => {
  test('exists', () => {
    expect(Queue).toBeDefined();
  });

  test('must be instantiated with an options object', () => {
    const shouldThrow = () => {
      // @ts-ignore
      new Queue();
    };

    expect(shouldThrow).toThrow();

    const shouldAlsoThrow = () => {
      // @ts-ignore
      new Queue('string');
    };

    expect(shouldAlsoThrow).toThrow();
  });

  describe('constructor options object', () => {
    test('must contain a handler function', () => {
      const shouldThrow = () => {
        // @ts-ignore
        new Queue({});
      };

      expect(shouldThrow).toThrow();

      const shouldAlsoThrow = () => {
        // @ts-ignore
        new Queue({ handler: 'notFunction', storage: dummyStorage });
      };

      expect(shouldAlsoThrow).toThrow();

      const shouldNotThrow = () => {
        // @ts-ignore
        new Queue({ handler: () => {}, storage: dummyStorage });
      };

      expect(shouldNotThrow).not.toThrow();
    });

    test('must contain a storage instance', () => {
      const shouldThrow = () => {
        // @ts-ignore
        new Queue({ handler: () => {} });
      };

      expect(shouldThrow).toThrow();

      const shouldAlsoThrow = () => {
        // @ts-ignore
        new Queue({ handler: 'notFunction', storage: 'storage' });
      };

      expect(shouldAlsoThrow).toThrow();

      const andThisShouldThrowToo = () => {
        // @ts-ignore
        new Queue({ handler: () => {}, storage: 1 });
      };

      expect(andThisShouldThrowToo).toThrow();

      const shouldNotThrow = () => {
        // @ts-ignore
        new Queue({ handler: () => {}, storage: dummyStorage });
      };

      expect(shouldNotThrow).not.toThrow();
    });
  });

  describe('queue instance method', () => {
    test('is defined', () => {
      const queue = getMockedQueue();

      expect(queue.queue).toBeDefined();
    });

    test('is a function', () => {
      const queue = getMockedQueue();

      expect(typeof queue.queue).toBe('function');
    });

    test('takes an arbitary object as first item', () => {
      const queue = getMockedQueue();
      const item = getItem();

      const queueItem = () => {
        queue.queue(item);
      };

      expect(queueItem).not.toThrow();
    });

    test('takes an optional options object as second argument', () => {
      const queue = getMockedQueue();
      const item = getItem();
      const options: QueuedItemOptions = { cid: 'cid' };

      const queueItem = () => {
        queue.queue(item, options);
      };

      expect(queueItem).not.toThrow();
    });

    test('returns a Promise', () => {
      const queue = getMockedQueue();
      const item = getItem();
      const options: QueuedItemOptions = { cid: 'cid' };

      const result = queue.queue(item, options);

      expect(result.then).toBeDefined();
    });

    test('returns the cid from storage', async (done) => {
      const queue = getMockedQueue();
      const item = getItem();
      const createdAt = new Date();
      const options: QueuedItemOptions = { createdAt };

      const result = await queue.queue(item, options);

      expect(result).toBe('storagecid');

      done();
    });

    test('calls storage.set with a QueuedItem built from the item and options', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });
      const item = getItem();
      const createdAt = new Date();
      const options: QueuedItemOptions = { cid: 'cid', createdAt };

      await queue.queue(item, options);

      expect(storage.set).toHaveBeenCalled();
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: {
          cid: 'cid',
          context: null,
          createdAt,
          error: null,
          item: { key: 'value' },
          relations: [],
          updatedAt: null,
        },
      });

      done();
    });
  });

  describe('delete method', () => {
    test('exists', () => {
      const queue = getMockedQueue();

      expect(queue.delete).toBeDefined();
    });

    test('calls storage.delete with the supplied cid', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.delete('cid');

      expect(storage.delete).toHaveBeenCalledWith('cid');

      done();
    });
  });

  describe('get method', () => {
    test('exists', () => {
      const queue = getMockedQueue();

      expect(queue.get).toBeDefined();
    });

    test('calls storage.get with the supplied cid', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.get('cid');

      expect(storage.get).toHaveBeenCalledWith('cid');

      done();
    });
  });

  describe('reset method', () => {
    test('exists', () => {
      const queue = getMockedQueue();

      expect(queue.reset).toBeDefined();
    });

    test('calls storage.get with the supplied cid', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.reset('cid');

      expect(storage.get).toHaveBeenCalledWith('cid');

      done();
    });

    test('resets the queue item identified by cid', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const cid = 'cid';
      const error = 'error';
      storage.get.mockReturnValue(
        new QueuedItem({}, { createdAt, cid, error })
      );
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.reset('cid');

      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: {
          cid: 'cid',
          context: null,
          createdAt,
          error: null, // note this is now null
          item: {},
          relations: [],
          // updatedAt: null,
        },
      });

      expect(storage.set.mock.calls[0][0].updatedAt).toBeInstanceOf(Date);

      done();
    });

    test('does not call storage.set if cid is not present', async (done) => {
      const storage = getMockStorage();
      storage.get.mockReturnValue(null);
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.reset('cid');

      expect(storage.set).not.toHaveBeenCalled();

      done();
    });
  });

  describe('flush method', () => {
    test('exists', () => {
      const queue = getMockedQueue();

      expect(queue.flush).toBeDefined();
    });

    test('calls storage.all', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.flush();

      expect(storage.all).toHaveBeenCalled();

      done();
    });

    test('calls handler with each ready queued item', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
        {
          cid: 'two',
          item: { status: 'not_ready' },
          context: {},
          relations: [],
          error: 'error',
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);
      const handler = getMockHandler();
      const queue = new Queue({ storage, handler });

      await queue.flush();

      const calledItems = handler.mock.calls.map((args) => args[0]);
      const itemsNotReady = calledItems.filter((i) => i.status === 'not_ready');
      const itemsReady = calledItems.filter((i) => i.status === 'ready');

      expect(itemsNotReady.length).toBe(0);
      expect(itemsReady.length).toBe(1);

      done();
    });

    test('if the handler throws an unexpected error, sets the item in question with the error', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();
      const error = new Error('Unexpected error');
      handler.mockRejectedValue(error);

      const queue = new Queue({ storage, handler: handler as any });
      await queue.flush();

      expect(storage.set).toHaveBeenCalled();
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: { error },
      });

      done();
    });

    test('if the handler returns nothing, sets the item in question with an error', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();
      const error = new Error(
        'No status returned from handler. Check your handler always returns a status object.'
      );
      handler.mockReturnValue(undefined);

      const queue = new Queue({ storage, handler: handler as any });
      await queue.flush();

      expect(storage.set).toHaveBeenCalled();
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: { error },
      });

      done();
    });

    test('if the handler reports an error, sets the item in question with the error', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();
      handler.mockReturnValue({ error: 'error' });

      const queue = new Queue({ storage, handler });
      await queue.flush();

      expect(storage.set).toHaveBeenCalled();
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: { error: 'error' },
      });

      done();
    });

    test('if the handler returns an id, deletes that item off the queue', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'not_ready' },
          context: {},
          relations: [{ cid: 'two', destPath: 'relation' }],
          error: 'error',
          createdAt,
          updatedAt: null,
        },
        {
          cid: 'two',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();
      const id = 'id_for_cid:two';
      handler.mockReturnValue({ id });

      const queue = new Queue({ storage, handler });
      await queue.flush();

      expect(storage.delete).toHaveBeenCalled();
      expect(storage.delete).toHaveBeenCalledWith('two');
      done();
    });

    test('if the handler returns an id, implements relationships specifying the queued item cid, and clears any error', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: { status: 'not_ready' },
          context: {},
          relations: [{ cid: 'two', destPath: 'relation' }],
          error: 'error',
          createdAt,
          updatedAt: null,
        },
        {
          cid: 'two',
          item: { status: 'ready' },
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all
        .mockReturnValueOnce(
          // Once for initial queue query
          mockQueue
        )
        .mockReturnValueOnce(
          // Again for broadcast of new id
          mockQueue
        )
        .mockReturnValue([]);

      const handler = getMockHandler();
      const id = 'id_for_cid:two';
      handler.mockReturnValue({ id });

      const queue = new Queue({ storage, handler });
      await queue.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({ status: 'ready' });
      expect(storage.set).toHaveBeenCalledTimes(1);
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: { cid: 'one', item: { relation: id } },
        error: null,
      });

      done();
    });

    test('handles queue members which are rendered ready by other members being completed', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const secondId = 'id_for_cid:two';
      const firstId = 'id_for_cid:one';
      const mockQueue: IQueueItem[] = [
        // this member is not ready now, but will be if its relation is fulfilled
        {
          cid: 'one',
          item: {},
          context: {},
          relations: [{ cid: 'two', destPath: 'relation' }],
          error: null,
          createdAt,
          updatedAt: null,
        },
        // this one is ready now, and should be broadcast to fulfill the first
        {
          cid: 'two',
          item: {},
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all
        .mockReturnValueOnce(
          // starting state
          mockQueue
        )
        .mockReturnValueOnce(
          // Second response is the queue after a the second item has been removed
          [
            {
              cid: 'one',
              item: {},
              context: {},
              relations: [{ cid: 'two', destPath: 'relation' }],
              error: null,
              createdAt,
              updatedAt: null,
            },
          ]
        )
        .mockReturnValueOnce(
          // Third is with the first's relationships fulfilled
          [
            {
              cid: 'one',
              item: { relation: secondId },
              context: {},
              relations: [],
              error: null,
              createdAt,
              updatedAt: null,
            },
          ]
        )
        .mockReturnValue([]);

      const handler = getMockHandler();

      // First return value is for the second queue member.
      // Second return value is for the subsequent call with the first item.
      handler
        .mockReturnValueOnce({ id: secondId })
        .mockReturnValueOnce({ id: firstId });

      const queue = new Queue({ storage, handler });

      await queue.flush();

      expect(storage.set).toHaveBeenCalledTimes(1);
      expect(storage.set.mock.calls[0][0]).toMatchObject({
        props: { cid: 'one', item: { relation: secondId } },
      });

      expect(handler).toHaveBeenCalledTimes(2);

      expect(storage.delete).toHaveBeenCalledTimes(2);

      done();
    });

    test('guards against storage erroneously not updating an item, avoiding an infinite loop', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        // this member is not ready now, but will be if its relation is fulfilled
        {
          cid: 'one',
          item: {},
          context: {},
          relations: [{ cid: 'two', destPath: 'relation' }],
          error: null,
          createdAt,
          updatedAt: null,
        },
        // this member is ready and would normally be removed from the queue
        {
          cid: 'two',
          item: {},
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];

      storage.all.mockReturnValue(mockQueue); // note always returns unchanged queue

      const handler = getMockHandler();
      handler.mockReturnValue({ id: 'id' });

      const queue = new Queue({ storage, handler });

      // If this test fails, it forms an infinite loop; guard against a crash.
      setTimeout(() => done(), 1000);

      await queue.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(storage.set).toHaveBeenCalledTimes(2);

      done();
    });

    test('updates lastFlush property', async () => {
      const queue = getMockedQueue();

      expect(queue.lastFlushed).toBe(null);

      await queue.flush();

      expect(queue.lastFlushed).toBeInstanceOf(Date);
    });
  });

  describe('on event registration method', () => {
    test('exists', () => {
      const queue = getMockedQueue();

      expect(queue.on).toBeDefined();
    });

    test('takes an event name of "done" as first argument and an event handler function as second argument', () => {
      const queue = getMockedQueue();

      const shouldThrow = () => {
        // @ts-ignore
        queue.on('wrong');
      };

      expect(shouldThrow).toThrowError();

      const shouldNotThrow = () => {
        queue.on(QueueEvent.Done, () => {});
      };

      expect(shouldNotThrow).not.toThrowError();
    });

    test('passes a queue item and id to the handler if the item is successfully handled', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: {},
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();

      const id = 'id';
      handler.mockReturnValue({ id });

      const queue = new Queue({ storage, handler });

      let itemFromEventHandler = null;
      let itemIdFromEventHandler = null;
      queue.on(QueueEvent.Done, (queuedItem: any, id: any) => {
        itemFromEventHandler = queuedItem;
        itemIdFromEventHandler = id;
      });

      await queue.flush();

      expect(itemFromEventHandler).toBeTruthy();
      expect((itemFromEventHandler as any).cid).toBe('one');
      expect(itemIdFromEventHandler).toBe('id');

      done();
    });

    test('returns a unregister function', async (done) => {
      const storage = getMockStorage();
      const createdAt = new Date();
      const mockQueue: IQueueItem[] = [
        {
          cid: 'one',
          item: {},
          context: {},
          relations: [],
          error: null,
          createdAt,
          updatedAt: null,
        },
      ];
      storage.all.mockReturnValueOnce(mockQueue).mockReturnValue([]);

      const handler = getMockHandler();

      const id = 'id';
      handler.mockReturnValue({ id });

      const queue = new Queue({ storage, handler });

      let itemFromEventHandler = null;
      const unregister = queue.on(QueueEvent.Done, (queuedItem: any) => {
        itemFromEventHandler = queuedItem;
      });

      unregister();

      await queue.flush();

      expect(itemFromEventHandler).toBe(null);

      done();
    });
  });
});
