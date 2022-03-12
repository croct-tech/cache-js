import {CacheLoader, CacheProvider} from './cacheProvider';

/**
 * A cache provider that automatically caches loaded values.
 *
 * The cache is not automatically cleared.
 */
export class AutoSaveCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: CacheProvider<K, V>;

    public constructor(cacheProvider: CacheProvider<K, V>) {
        this.cacheProvider = cacheProvider;
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cacheProvider.get(key, async () => {
            const value = await loader(key);

            await this.cacheProvider.set(key, value);

            return value;
        });
    }

    public set(key: K, value: V): Promise<void> {
        return this.cacheProvider.set(key, value);
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
