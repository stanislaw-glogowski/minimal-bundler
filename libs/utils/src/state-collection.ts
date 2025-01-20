import { EventEmitter } from 'events';
import { concat, filter, of, Subject } from 'rxjs';

export interface StateCollectionItem<S extends string = string> {
  state: S;
}

export class StateCollection<I extends StateCollectionItem> {
  readonly items: Array<I> = [];

  readonly item$ = new Subject<I>();

  private itemsMap = new Map<I[typeof this.keyName], I>();

  private stateItemsMap = new Map<I['state'], Array<I>>();

  private eventEmitter = new EventEmitter();

  constructor(readonly keyName: keyof I) {
    //
  }

  getItem(key: I[typeof this.keyName]) {
    return this.itemsMap.get(key);
  }

  subscribeItem(key: I[typeof this.keyName]) {
    return concat(
      of(this.getItem(key)), //
      this.item$.pipe(filter((item) => item[this.keyName] === key)),
    );
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

  updateItem(key: I[typeof this.keyName], changes: Partial<I>) {
    const item = this.itemsMap.get(key);

    if (item) {
      const { state: newState } = changes;
      const { state: oldState } = item;

      Object.assign(item, changes);

      if (newState && newState !== oldState) {
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

    this.item$.next(item);
    this.eventEmitter.emit(`${state}Appear`);
  }
}
