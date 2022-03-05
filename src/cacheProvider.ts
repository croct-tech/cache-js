export type CacheLoader<K, V> = (key: K) => Promise<V>;

export interface CacheProvider<K, V> {
    /**
     * Gets the cached value for the given key.
     *
     * If there is no cached value, a fresh value is retrieved from the given `loader` function.
     *
     * @param {K} key The key associated with the value to retrieve from the cache.
     * @param {CacheLoader<K, V>} loader A function to load a fresh value.
     * @returns {Promise<V>} A promise that resolves to the latest cached value.
     */
    get(key: K, loader: CacheLoader<K, V>): Promise<V>;
}

export interface ErasableCacheProvider<K, V> extends CacheProvider<K, V> {
    /**
     * Removes the value for the given key from the cache.
     *
     * @param {K} key The key associated with the value to remove from the cache.
     * @returns {Promise<void>}
     */
    delete(key: K): Promise<void>;
}

export interface OverridableCacheProvider<K, V> extends ErasableCacheProvider<K, V> {
    /**
     * Sets the value for the given key.
     *
     * @param {K} key The key associated with the value to remove from the cache.
     * @param {V} value
     * @returns {Promise<void>}
     */
    set(key: K, value: V): Promise<void>;
}
