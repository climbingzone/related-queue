import { IQueueItem } from '@related-queue/shared/types';
import { MemoryStorage } from './MemoryStorage';

const mockItem: IQueueItem = {
  cid: 'cid',
  item: {},
  context: {},
  relations: [],
  error: null,
  createdAt: new Date(),
  updatedAt: null,
};

describe('MemoryStorage', () => {
  test('exists', () => {
    expect(MemoryStorage).toBeDefined();
  });

  describe('all method', () => {
    test('returns an initially empty array', async () => {
      const storage = new MemoryStorage();

      const queue = await storage.all();

      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBe(0);
    });
  });

  describe('set method', () => {
    test('places an item in the queue', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);

      const queue = await storage.all();

      expect(queue[0].cid).toBe('cid');
    });

    describe('when an item is placed in the queue', () => {
      test('the item replaces one already there', async () => {
        const storage = new MemoryStorage();

        await storage.set(mockItem);

        const newContext = { key: 'value' };

        await storage.set({ ...mockItem, context: newContext });

        const queue = await storage.all();

        expect(queue.length).toBe(1);
        expect(queue[0].context.key).toBe('value');
      });

      test('the items are ordered by ascending createdAt field', async () => {
        const storage = new MemoryStorage();
        const now = new Date();
        const before = new Date(now.valueOf() - 1000);
        const ahead = new Date(now.valueOf() + 1000);

        const newest = { ...mockItem, cid: 'newest', createdAt: ahead };
        const middle = { ...mockItem, cid: 'middle', createdAt: now };
        const oldest = { ...mockItem, cid: 'oldest', createdAt: before };

        await storage.set(middle);
        await storage.set(oldest);
        await storage.set(newest);

        const queue = await storage.all();

        expect(queue.length).toBe(3);
        expect(queue[0].cid).toBe('oldest');
        expect(queue[1].cid).toBe('middle');
        expect(queue[2].cid).toBe('newest');
      });
    });
  });

  describe('get method', () => {
    test('retrieves an item in the queue by cid', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);
      await storage.set({
        cid: 'cid2',
        item: {},
        context: {},
        relations: [],
        error: null,
        createdAt: new Date(),
        updatedAt: null,
      });

      const item = await storage.get('cid2');

      expect(item?.cid).toBe('cid2');
    });

    test('returns null if no cid', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);
      // @ts-ignore
      const item = await storage.get(null);

      expect(item).toBe(null);
    });

    test('returns null if no item found for that cid', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);
      // @ts-ignore
      const item = await storage.get('not_there');

      expect(item).toBe(null);
    });
  });

  describe('delete method', () => {
    test('has no effect if cid argument is falsy', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);

      const queue = await storage.all();

      expect(queue.length).toBe(1);

      // @ts-ignore
      await storage.delete(null);

      expect(queue.length).toBe(1);
    });

    test('removes an item from the queue', async () => {
      const storage = new MemoryStorage();

      await storage.set(mockItem);

      const queue = await storage.all();

      expect(queue.length).toBe(1);

      await storage.delete('cid');

      const queueAfterDelete = await storage.all();

      expect(queueAfterDelete.length).toBe(0);
    });
  });
});
