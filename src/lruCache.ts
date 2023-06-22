import {CacheProvider} from './cacheProvider';

/**
 * In-memory Least Recently Used cache.
 */
export class LruCache<T = any> implements CacheProvider<string, T> {
    private cache = new Map<string, T>();

    private readonly capacity: number;

    private constructor(capacity: number) {
        this.capacity = capacity;
    }

    /**
     * Creates a new LRU cache with the given maximum size.
     *
     * @param {number} capacity The maximum number of entries in the cache. Must be a
     *      positive safe integer.
     */
    public static ofCapacity(capacity: number): LruCache {
        if (!Number.isSafeInteger(capacity) || capacity < 1) {
            throw new Error('LRU capacity must be a positive safe integer.');
        }

        return new this(capacity);
    }

    public get(key: string, loader: (key: string) => Promise<T>): Promise<T> {
        if (!this.cache.has(key)) {
            return loader(key);
        }

        const value = this.cache.get(key)!;

        // Reposition the key as the most recently used value
        this.cache.delete(key);
        this.cache.set(key, value);

        return Promise.resolve(value);
    }

    public set(key: string, value: T): Promise<void> {
        this.cache.set(key, value);

        while (this.cache.size > this.capacity) {
            const leastRecentlyUsedKey = this.cache
                .keys()
                .next();

            this.cache.delete(leastRecentlyUsedKey.value);
        }

        return Promise.resolve();
    }

    public delete(key: string): Promise<void> {
        this.cache.delete(key);

        return Promise.resolve();
    }
}
