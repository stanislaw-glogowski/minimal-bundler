import { EventEmitter } from 'events';
import { Subject } from 'rxjs';

export interface StateCollectionItem<S extends string = string> {
  state: S;
}

export class StateCollection<I extends StateCollectionItem> {
  public readonly items$ = new Subject<I>();

  public readonly items: Array<I> = [];

  private itemsMap = new Map<I[typeof this.keyName], I>();

  private stateItemsMap = new Map<I['state'], Array<I>>();

  private eventEmitter = new EventEmitter();

  constructor(public readonly keyName: keyof I) {
    //
  }

  getItem(key: I[typeof this.keyName]) {
    return this.itemsMap.get(key);
  }

  addItem(item: I) {
    const key = item[this.keyName];
    const { state } = item;

    this.items.push(item);
    this.itemsMap.set(key, item);

    this.getStateItemsReference(state).push(item);

    this.notify(item);

    return this;
  }

  updateItem(
    key: I[typeof this.keyName],
    changes: Pick<I, 'state'> & Omit<Partial<I>, 'state'>,
  ) {
    const item = this.itemsMap.get(key);

    if (item) {
      const { state: oldState } = item;
      const { state: newState } = changes;

      Object.assign(item, changes);

      if (oldState !== newState) {
        const oldItems = this.getStateItemsReference(oldState);

        oldItems.splice(oldItems.indexOf(item), 1);

        this.getStateItemsReference(newState).push(item);

        this.notify(item);
      }
    }

    return item;
  }

  getStateItems(state: I['state']) {
    return [...this.getStateItemsReference(state)];
  }

  on(event: `${I['state']}Appear`, listener: () => void) {
    this.eventEmitter.on(event, listener);

    return this;
  }

  off(event?: `${I['state']}Appear`) {
    this.eventEmitter.removeAllListeners(event);
    return this;
  }

  private getStateItemsReference(state: I['state']) {
    let result = this.stateItemsMap.get(state);

    if (!result) {
      result = [];
      this.stateItemsMap.set(state, result);
    }

    return result;
  }

  private notify(item: I) {
    const { state } = item;

    this.items$.next(item);
    this.eventEmitter.emit(`${state}Appear`);
  }
}
