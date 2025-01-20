import { StateCollection, StateCollectionItem } from './state-collection';

interface TestItem extends StateCollectionItem<'active' | 'inactive'> {
  id: number;
}

describe('StateCollection', () => {
  let stateCollection: StateCollection<TestItem>;

  beforeEach(() => {
    stateCollection = new StateCollection<TestItem>('id');
  });

  it('should add an item and retrieve it by key', () => {
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.addItem(item);

    expect(stateCollection.getItem(1)).toBe(item);
  });

  it('should update an item and change its state correctly', () => {
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.addItem(item);
    stateCollection.updateItem(1, { state: 'inactive' });

    expect(stateCollection.getStateItems('active')).toEqual([]);
    expect(stateCollection.getStateItems('inactive')).toContain(item);
  });

  it('should drop an item from the old state collection when state changes and drop is true', () => {
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.addItem(item);
    stateCollection.updateItem(1, { state: 'inactive' }, true);

    expect(stateCollection.getStateItems('active')).toEqual([]);
    expect(stateCollection.getStateItems('inactive')).not.toContain(item);
  });

  it('should emit an event when an item is added', () => {
    const mockListener = jest.fn();
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.on('activeAppear', mockListener);
    stateCollection.addItem(item);

    expect(mockListener).toHaveBeenCalled();
  });

  it('should subscribe to an item and receive updates', (done) => {
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.addItem(item);

    stateCollection.subscribeItem(1).subscribe((updatedItem) => {
      expect(updatedItem).toEqual({ id: 1, state: 'inactive' });
      done();
    });

    stateCollection.updateItem(1, { state: 'inactive' });
  });

  it('should remove all listeners for a specific event', () => {
    const mockListener = jest.fn();
    const item = { id: 1, state: 'active' } as TestItem;

    stateCollection.on('activeAppear', mockListener);
    stateCollection.off('activeAppear');
    stateCollection.addItem(item);

    expect(mockListener).not.toHaveBeenCalled();
  });
});
