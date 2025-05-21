export class Storage {
  /** Stores an item with optional expiration (in milliseconds) */
  static setItem(key: string, value: any, ttl?: number, sessionOnly = false) {
    const storage = sessionOnly ? sessionStorage : localStorage;
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };
    storage.setItem(key, JSON.stringify(item));
  }

  /** Retrieves an item, checking expiration */
  static getItem<T>(key: string, sessionOnly = false): T | null {
    const storage = sessionOnly ? sessionStorage : localStorage;
    const itemStr = storage.getItem(key);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      if (item.expiry && Date.now() > item.expiry) {
        storage.removeItem(key);
        return null;
      }
      return item.value as T;
    } catch (e) {
      console.error("Error parsing storage item:", key, e);
      return null;
    }
  }

  /** Removes an item from storage */
  static removeItem(key: string, sessionOnly = false) {
    const storage = sessionOnly ? sessionStorage : localStorage;
    storage.removeItem(key);
  }
}
