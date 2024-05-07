import {Clock, Instant} from '@croct-tech/time';
import {DefaultClockProvider} from '@croct-tech/time/defaultClockProvider';
import {CacheLoader, CacheProvider} from './cacheProvider';
import {TimestampedCacheEntry} from './timestampedCacheEntry';

type Configuration<K, V> = {
    /**
     * The underlying cache provider to use for storing the cached data.
     */
    cacheProvider: CacheProvider<K, TimestampedCacheEntry<V>>,

    /**
     * The freshness period of the cached data in seconds.
     *
     * It defines the time duration for which the cache entry
     * is considered fresh. Once the freshness period expires,
     * the data will be revalidated in the background while
     * still serving the stale value on subsequent gets.
     *
     * For example, if freshPeriod is set to 60 seconds,
     * the cache entry will be considered fresh for 60 seconds
     * after its creation or update. After 60 seconds, it will be
     * evaluated in the background on subsequent gets, but the stale value
     * will still be served until the revalidation is complete.
     */
    freshPeriod: number,

    /**
     * The clock to use for time-related operations.
     *
     * It is used for retrieving the current time and for time calculations.
     * If not provided, the default clock is used.
     *
     * @default DefaultClockProvider.getClock()
     */
    clock?: Clock,

    /**
     * The handler for background revalidation errors.
     *
     * It is a function that is called when an error occurs during
     * background revalidation of a cache entry. If not provided,
     * errors during background revalidation are ignored.
     *
     * The most common use case for this handler is logging.
     */
    errorHandler?: (error: Error) => void,
};

export class StaleWhileRevalidateCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly freshPeriod: number;

    private readonly clock: Clock;

    private readonly errorHandler: (error: Error) => void;

    public constructor(config: Configuration<K, V>) {
        this.cacheProvider = config.cacheProvider;
        this.freshPeriod = config.freshPeriod;
        this.clock = config.clock ?? DefaultClockProvider.getClock();
        this.errorHandler = config.errorHandler ?? ((): void => { /* noop */ });
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

        if (now.isAfter(possiblyStaleEntry.timestamp.plusSeconds(this.freshPeriod))) {
            // If expired revalidate on the background and return cached value
            retrieveAndSave().catch(this.errorHandler);
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
