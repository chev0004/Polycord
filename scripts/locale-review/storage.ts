import type { Inventory, Review } from './review-state';
import { unusedKeys } from './unused';

type Progress = Omit<Review, 'inventory'>;
let database: Promise<IDBDatabase> | undefined;
let savedInventory: Inventory | undefined;

function open() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('polycord-locale-review', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('review');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

function legacyReview(): Review | null {
  try {
    const state: Review | null = JSON.parse(
      localStorage.getItem('polycord-visual-locale-review-v1') ?? 'null',
    );
    if (!state) return null;
    const per = {} as Review['per'];
    for (const base of ['develop', 'now'] as const) {
      const { picks, terms, section } = state.per[base];
      per[base] = {
        picks: Object.fromEntries(
          Object.entries(picks).filter(([key]) => !unusedKeys.has(key)),
        ),
        terms,
        section,
        checks: {},
      };
    }
    return {
      inventory: {
        ...state.inventory,
        issues: state.inventory.issues.filter(
          ({ key }) => !unusedKeys.has(key),
        ),
      },
      base: state.base,
      per,
    };
  } catch {
    return null;
  }
}

export async function loadReview(): Promise<Review | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('review');
    const store = transaction.objectStore('review');
    const inventory = store.get('inventory');
    const progress = store.get('progress');
    transaction.oncomplete = () => {
      if (!inventory.result || !progress.result) {
        resolve(legacyReview());
        return;
      }
      savedInventory = inventory.result as Inventory;
      resolve({ inventory: savedInventory, ...(progress.result as Progress) });
    };
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveReview({ inventory, ...progress }: Review) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('review', 'readwrite');
    const store = transaction.objectStore('review');
    if (inventory !== savedInventory) store.put(inventory, 'inventory');
    store.put(progress, 'progress');
    transaction.oncomplete = () => {
      savedInventory = inventory;
      resolve();
    };
    transaction.onabort = () => reject(transaction.error);
  });
}
