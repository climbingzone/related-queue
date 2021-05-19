import { ItemRelation } from '@related-queue/shared/types';
import { QueuedItem } from './QueuedItem';
import { QueuedItemOptions } from '../types';

describe('QueuedItem', () => {
  test('exists', () => {
    expect(QueuedItem).toBeDefined();
  });

  describe('constructor function', () => {
    test('takes an item and options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem).toBeInstanceOf(QueuedItem);
    });

    test('throws if options is missing', () => {
      const item = { key: 'value' };

      const shouldThrow = () => {
        // @ts-ignore
        new QueuedItem(item);
      };

      expect(shouldThrow).toThrow();
    });

    test('throws if item is missing', () => {
      const options: QueuedItemOptions = {};

      const shouldThrow = () => {
        // @ts-ignore
        new QueuedItem(null, options);
      };

      expect(shouldThrow).toThrow();
    });
  });

  describe('CID parameter', () => {
    test('is initialized if not present in constructor options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(typeof queuedItem.cid).toBe('string');
      expect(queuedItem.cid.length).toBeTruthy();
    });
    test('can be set in constructor options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = { cid: 'cid' };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.cid).toBe('cid');
    });
  });

  describe('item parameter', () => {
    test('is set from constructor', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.item).toEqual(item);
    });
  });

  describe('createdAt parameter', () => {
    test('is initialized if not present in constructor options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.createdAt).toBeInstanceOf(Date);
    });
    test('can be set in constructor options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = { createdAt: new Date() };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.createdAt).toBe(options.createdAt);
    });
  });

  describe('updatedAt parameter', () => {
    test('is initialized to null if no updatedAt in constructor options', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.updatedAt).toBe(null);
    });
    test('is initialized as null if not present in constructor options', () => {
      const item = {};
      const options: QueuedItemOptions = {};
      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.updatedAt).toBe(null);
    });
    test('can be set in constructor options', () => {
      const item = { key: 'value' };
      const updatedAt = new Date();
      const options: QueuedItemOptions = { updatedAt };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.updatedAt).toBe(updatedAt);
    });
  });

  describe('error parameter', () => {
    test('is null by default', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.error).toBe(null);
    });

    test('can be set in constructor options', () => {
      const item = { key: 'value' };
      const error = new Error();
      const options: QueuedItemOptions = { error };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.error).toBe(error);
    });
  });

  describe('ready parameter', () => {
    test('is true if no relations and no error', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.ready).toBeDefined();
      expect(queuedItem.ready).toBe(true);
    });

    test('is false if relation specifications are present', () => {
      const item = {};
      const options: QueuedItemOptions = {
        relations: [{ destPath: 'path', cid: 'cid' }],
      };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.ready).toBe(false);
    });

    test('is false if error is present', () => {
      const item = {};
      const options: QueuedItemOptions = {
        error: 'error',
      };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.ready).toBe(false);
    });
  });

  describe('context parameter', () => {
    test('can be set from constructor options.context', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = { context: 'context' };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.context).toEqual(options.context);
    });

    test('can set directly', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = { context: 'context' };

      const queuedItem = new QueuedItem(item, options);

      queuedItem.context = 'newContext';

      expect(queuedItem.context).toEqual('newContext');
    });
  });

  describe('relations parameter', () => {
    test('is set from constructor options.relations', () => {
      const item = {};
      const relations: ItemRelation[] = [{ cid: 'cid', destPath: 'key' }];

      const options: QueuedItemOptions = { relations };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.relations).toEqual(relations);
    });
  });

  describe('onSuccess method', () => {
    test('exists', () => {
      const item = { key: 'value' };
      const options: QueuedItemOptions = { context: 'context' };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.onSuccess).toBeDefined();
    });

    test('updates the item with relationships as specified, updates updatedAt parameter, clears error', () => {
      const item = {};
      const options: QueuedItemOptions = {
        relations: [{ cid: 'cid', destPath: 'key' }],
        error: 'error',
      };

      const queuedItem = new QueuedItem(item, options);
      const idMap = new Map();
      idMap.set('cid', 'id');

      expect(queuedItem.item).toBe(item);
      expect(queuedItem.updatedAt).toBe(null);
      expect(queuedItem.error).toBe('error');

      queuedItem.onSuccess(idMap);

      expect(queuedItem.item).toMatchObject({ key: 'id' });
      expect(queuedItem.updatedAt).toBeInstanceOf(Date);
      expect(queuedItem.error).toBe(null);
    });

    test('if no relationships match, does not modify item nor updatedAt', () => {
      const item = {};
      const options: QueuedItemOptions = {
        relations: [{ cid: 'cid', destPath: 'key' }],
      };

      const queuedItem = new QueuedItem(item, options);
      const idMap = new Map();

      expect(queuedItem.updatedAt).toBe(null);

      queuedItem.onSuccess(idMap);

      expect(queuedItem.item).toBe(item);
      expect(queuedItem.updatedAt).toBe(null);
    });
  });

  describe('onError method', () => {
    test('exists', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.onError).toBeDefined();
    });

    test('updates the item with error as specified, and updates updatedAt parameter', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.error).toBe(null);
      expect(queuedItem.updatedAt).toBe(null);

      const error = new Error();

      queuedItem.onError(error);

      expect(queuedItem.error).toBe(error);
      expect(queuedItem.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('hash parameter', () => {
    test('exists', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.hash).toBeDefined();
    });

    test('is a hash of the item', () => {
      const item = {};
      const now = new Date();
      const options: QueuedItemOptions = { createdAt: now, cid: 'cid' };

      const queuedItem = new QueuedItem(item, options);
      const hash = queuedItem.hash;

      expect(hash).toBeDefined();

      const secondQueuedItem = new QueuedItem(item, options);
      const secondHash = secondQueuedItem.hash;

      expect(hash === secondHash).toBe(true);

      const differentItem = new QueuedItem(item, {
        cid: 'cid2',
        createdAt: now,
      });
      const differentHash = differentItem.hash;

      expect(hash === differentHash).not.toBe(true);
    });
  });

  describe('reset method', () => {
    test('exists', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.reset).toBeDefined();
      expect(typeof queuedItem.reset).toBe('function');
    });

    test('clears item.error', () => {
      const item = {};
      const error = new Error();
      const options: QueuedItemOptions = { error };

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.error).toBeDefined();

      queuedItem.reset();

      expect(queuedItem.error).toBe(null);
    });

    test('updates item.updatedAt', () => {
      const item = {};
      const options: QueuedItemOptions = {};

      const queuedItem = new QueuedItem(item, options);

      expect(queuedItem.updatedAt).toBe(null);

      queuedItem.reset();

      expect(queuedItem.updatedAt).toBeInstanceOf(Date);
    });
  });
});
