import { ClientId } from '@related-queue/shared/types';
import { Queue } from '../Queue';
import {
  IControlledQueue,
  QueueOptions,
  QueuedItemOptions,
  ItemIDMap,
} from '../types';

export class AutoFlushingQueue<ItemType = any, ItemContext = any>
  extends Queue<ItemType, ItemContext>
  implements IControlledQueue<ItemType, ItemContext>
{
  private _autoFlushEnabled: boolean = true;

  constructor(
    options: QueueOptions<ItemType> & { autoFlushEnabled?: boolean }
  ) {
    super(options);
    if (typeof options.autoFlushEnabled === 'boolean') {
      this._autoFlushEnabled = options.autoFlushEnabled;
    }
  }

  private maybeFlush() {
    if (this._autoFlushEnabled) {
      // call, but dont wait
      super.flush();
    }
  }

  public enableAutoFlush(enabled: boolean) {
    this._autoFlushEnabled = enabled;
  }

  public async queue(
    item: ItemType,
    options: QueuedItemOptions = {}
  ): Promise<ClientId> {
    const result = await super.queue(item, options);
    this.maybeFlush();
    return result;
  }

  public async delete(cid: ClientId): Promise<void> {
    const result = await super.delete(cid);
    this.maybeFlush();
    return result;
  }

  public async reset(cid: ClientId): Promise<void> {
    const result = await super.reset(cid);
    this.maybeFlush();
    return result;
  }

  public updateIds(idMap: ItemIDMap): void {
    super.updateIds(idMap);
    this.maybeFlush();
  }
}
