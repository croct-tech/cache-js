import {Instant} from '@croct-tech/time';

/**
 * Parameters for the data to be cached. The values may have a default value
 * for an implementation or may be infinite.
 */
export type CacheSetOptions = {
    /**
     * The time to live for the data in seconds. The data will be
     * considered fresh for this amount of time.
     */
    ttl?: number,

    /**
     * The time period in seconds within which the data can be returned as "stale".
     *
     * This period starts after the data is expired, that means that a data set
     * with a ttl of 10 seconds and a stale period of 20 seconds will be considered
     * fresh for 10 seconds and stale for 20 seconds, being available for a total of
     * 30 seconds.
     */
    staleWindow?: number,
};

/**
 * A cached value that may be expired. If expired, the `expirationTime` will not be `null`.
 */
export type MaybeExpired<T> = {
    /**
     * The cached value.
     */
    value: T,

    /**
     * The time at which the value expired, if it is stale.
     * If the data is still fresh, this will be `null`.
     */
    expirationTime: Instant | null,
};

export interface DataCache<K, V> {
    /**
     * Gets the cached value for the given key. Returns the value if it is fresh,
     * or `null` if it is expired.
     *
     * @param {K} key
     * @returns {Promise<V | null>}
     */
    get(key: K): Promise<V | null>;

    /**
     * Gets the cached value for the given key. Returns:
     * - `null` if the data is not available on the cache
     * - a value with no `expirationTime` that was cached and has not expired
     * - a value with an `expirationTime` that was cached and has expired,
     *   but has not been removed yet
     *
     * @param {K} key
     * @returns {Promise<MaybeExpired<V>> | null>}
     */
    getStale(key: K): Promise<MaybeExpired<V> | null>;

    /**
     * Sets the value for the given key.
     *
     * @param {K} key
     * @param {V} value
     * @param {CacheSetOptions} options
     * @returns {Promise<void>}
     */
    set(key: K, value: V, options?: CacheSetOptions): Promise<void>;

    /**
     * Removes the value for the given key from the cache.
     *
     * @param {K} key
     * @returns {Promise<void>}
     */
    delete(key: K): Promise<void>;
}

export class NoopCache implements DataCache<any, any> {
    public get(): Promise<any | null> {
        return Promise.resolve(null);
    }

    public getStale(): Promise<MaybeExpired<any> | null> {
        return Promise.resolve(null);
    }

    public set(): Promise<void> {
        return Promise.resolve();
    }

    public delete(): Promise<void> {
        return Promise.resolve();
    }
}
