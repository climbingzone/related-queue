import { Queue } from '@related-queue/core/Queue';
import { MemoryStorage } from '@related-queue/memory-storage/index';
import { ItemHandlerFunction } from '@related-queue/shared/types';

export * from '@related-queue/shared/types';

export class RelatedQueue extends Queue {
  constructor(handler: ItemHandlerFunction) {
    super({ storage: new MemoryStorage(), handler });
  }
}
