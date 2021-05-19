import { AutoFlushingQueue } from './AutoFlushingQueue';
import { Queue } from '../Queue';

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

const getMockedControlledQueue = () => {
  const handler = getMockHandler();
  const storage = getMockStorage();
  return new AutoFlushingQueue({ storage, handler });
};

describe('AutoFlushingQueue', () => {
  test('exists', () => {
    expect(AutoFlushingQueue).toBeDefined();
  });

  test('inherits from Queue', () => {
    const controlled = getMockedControlledQueue();
    expect(controlled).toBeInstanceOf(Queue);
  });

  describe('auto flush behaviour', () => {
    test('is enabled by default', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new AutoFlushingQueue({
        storage,
        handler,
      });
      await queue.queue({});

      setTimeout(() => {
        expect(queue.lastFlushed).toBeInstanceOf(Date);
        done();
      }, 100);
    });

    test('can be disabled in constructor options', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new AutoFlushingQueue({
        storage,
        handler,
        autoFlushEnabled: false,
      });
      await queue.queue({});

      setTimeout(() => {
        expect(queue.lastFlushed).toBe(null);
        done();
      }, 100);
    });

    test('can be toggled with enableAutoFlush method', async (done) => {
      const storage = getMockStorage();
      const handler = getMockHandler();
      const queue = new AutoFlushingQueue({
        storage,
        handler,
        autoFlushEnabled: false,
      });

      queue.enableAutoFlush(true);

      await queue.queue({});

      setTimeout(() => {
        expect(queue.lastFlushed).toBeInstanceOf(Date);
        done();
      }, 100);
    });

    test('is activated on delete', async (done) => {
      const queue = getMockedControlledQueue();
      await queue.delete('cid');

      setTimeout(() => {
        expect(queue.lastFlushed).toBeInstanceOf(Date);
        done();
      }, 100);
    });

    test('is activated on reset', async (done) => {
      const queue = getMockedControlledQueue();
      await queue.reset('cid');

      setTimeout(() => {
        expect(queue.lastFlushed).toBeInstanceOf(Date);
        done();
      }, 100);
    });

    test('is activated on updateIds', async (done) => {
      const queue = getMockedControlledQueue();

      const idMap = new Map();
      idMap.set('cid', 'id');

      queue.updateIds(idMap);

      setTimeout(() => {
        expect(queue.lastFlushed).toBeInstanceOf(Date);
        done();
      }, 100);
    });
  });
});
