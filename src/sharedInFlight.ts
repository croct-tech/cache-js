import {CacheLoader, CacheProvider} from './cacheProvider';

/**
 * A cache that shares in-flight requests between callers.
 *
 * The scenario target by this cache is as follows:
 * - Caller 1 requests the entry key A.
 * - While the underlying cache is processing that request, possibly waiting
 *   for IO, a caller 2 requests the entry for the same key A.
 * - This cache will return a reference to the same Promise returned to caller 1.
 *
 * Wrapping a cache with a SharedInFlightCache ensures that the same entry
 * is not created twice. On the example above, if the entry was not present in
 * the cache the loader would be called twice and, if the cache auto-saves,
 * the cache entry would also be written twice.
 * With this wrapper, the loaders would only be called once and the entry,
 * if saved, would also be saved once.
 */
export class SharedInFlightCache<T> implements CacheProvider<string, T> {
    private readonly inner: CacheProvider<string, T>;

    private readonly inFlight = new Map<string, Promise<T>>();

    public constructor(inner: CacheProvider<string, T>) {
        this.inner = inner;
    }

    public get(key: string, loader: CacheLoader<string, T>): Promise<T> {
        const inFlight = this.inFlight.get(key);

        if (inFlight !== undefined) {
            return inFlight;
        }

        const newPromise = this.inner
            .get(key, loader)
            .finally(() => this.inFlight.delete(key));

        this.inFlight.set(key, newPromise);

        return newPromise;
    }

    public set(key: string, value: T): Promise<void> {
        return this.inner.set(key, value);
    }

    public delete(key: string): Promise<void> {
        return this.inner.delete(key);
    }
}
