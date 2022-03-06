import {CacheProvider} from './cacheProvider';

/**
 * In-memory cache implementation backed by a native `Map`.
 */
export class InMemoryCache<T = any> implements CacheProvider<string, T> {
    private cache = new Map<string, T>();

    public get(key: string, loader: (key: string) => Promise<T>): Promise<T> {
        return this.cache.has(key)
            ? Promise.resolve(this.cache.get(key)!)
            : loader(key);
    }

    public set(key: string, value: T): Promise<void> {
        this.cache.set(key, value);

        return Promise.resolve();
    }

    public delete(key: string): Promise<void> {
        this.cache.delete(key);

        return Promise.resolve();
    }
}
