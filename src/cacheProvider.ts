import {Instant} from '@croct-tech/time';

export type CacheLoader<K, V> = (key: K) => Promise<V>;

export interface CacheProvider<K, V> {
    /**
     * Gets the cached value for the given key. If there is no cached value,
     * a fresh value is retrieved from the given `loader` function.
     *
     * @param {K} key to the cached value
     * @param {CacheLoader<K, V>} loader function to retrieve the fresh value
     * @returns {Promise<V>}
     */
    get(key: K, loader: CacheLoader<K, V>): Promise<V>;
}

export interface ErasableCacheProvider<K, V> extends CacheProvider<K, V> {
    /**
     * Removes the value for the given key from the cache.
     *
     * @param {K} key
     * @returns {Promise<void>}
     */
    delete(key: K): Promise<void>;
}

export interface OverridableCacheProvider<K, V> extends ErasableCacheProvider<K, V> {
    /**
     * Sets the value for the given key.
     *
     * @param {K} key
     * @param {V} value
     * @returns {Promise<void>}
     */
    set(key: K, value: V): Promise<void>;
}

/**
 * A cache entry with the timestamp of when it was set.
 */
export type TimedCacheEntry<T> = Readonly<{
    /**
     * The cached value.
     */
    value: T,

    /**
     * The time at which the value has expired or will expire.
     */
    retrievalTime: Instant,
}>;

export class NoopCache implements OverridableCacheProvider<any, any> {
    public get(key: any, loader: (key: any) => any): Promise<any> {
        return loader(key);
    }

    public set(): Promise<void> {
        return Promise.resolve();
    }

    public delete(): Promise<void> {
        return Promise.resolve();
    }
}
