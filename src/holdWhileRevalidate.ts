import {Clock, Instant} from '@croct/time';
import {DefaultClockProvider} from '@croct/time/defaultClockProvider';
import {CacheLoader, CacheProvider} from './cacheProvider';
import {TimestampedCacheEntry} from './timestampedCacheEntry';

type Configuration<K, V> = {
    /**
     * The underlying cache provider to use for storing the cached data.
     */
    cacheProvider: CacheProvider<K, TimestampedCacheEntry<V>>,

    /**
     * The maximum retention period of the cached data in seconds.
     *
     * It defines the time duration for which the cache entry is
     * retained. Once the maximum age expires, the cache entry
     * will be removed and a new value will be retrieved using
     * the provided loader.
     *
     * For example, if maxAge is set to 3600 seconds (1 hour),
     * the cache entry will be retained for 1 hour. After 1 hour,
     * it will be removed and a new value will be retrieved.
     */
    maxAge: number,

    /**
     * The clock to use for time-related operations.
     *
     * It is used for retrieving the current time and for time calculations.
     * If not provided, the default clock is used.
     *
     *  @default DefaultClockProvider.getClock()
     */
    clock?: Clock,
};

export class HoldWhileRevalidateCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly maxAge: number;

    private readonly clock: Clock;

    public constructor({cacheProvider, maxAge, clock}: Configuration<K, V>) {
        this.cacheProvider = cacheProvider;
        this.maxAge = maxAge;
        this.clock = clock ?? DefaultClockProvider.getClock();
    }

    public async get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        const now = Instant.now(this.clock);

        const retrieveAndSave = async (): Promise<TimestampedCacheEntry<V>> => {
            const entry: TimestampedCacheEntry<V> = {
                value: await loader(key),
                timestamp: now,
            };

            await this.cacheProvider.set(key, entry);

            return entry;
        };

        const possiblyStaleEntry = await this.cacheProvider.get(key, retrieveAndSave);

        if (now.isAfter(possiblyStaleEntry.timestamp.plusSeconds(this.maxAge))) {
            const entry = await retrieveAndSave();

            return entry.value;
        }

        return possiblyStaleEntry.value;
    }

    public set(key: K, value: V): Promise<void> {
        return this.cacheProvider.set(key, {
            value: value,
            timestamp: Instant.now(this.clock),
        });
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
