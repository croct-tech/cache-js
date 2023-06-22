import {CacheProvider} from './cacheProvider';

export class LruCache<T = any> implements CacheProvider<string, T> {
    private cache = new Map<string, T>();

    private readonly maxSize: number;

    private constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    public static ofMaxSize(maxSize: number): LruCache {
        if (!Number.isSafeInteger(maxSize) || maxSize < 1) {
            throw new Error('LRU max size must be a positive safe integer.');
        }

        return new this(maxSize);
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

        while (this.cache.size > this.maxSize) {
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
