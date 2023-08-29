import {Clock, Instant} from '@croct-tech/time';
import {DefaultClockProvider} from '@croct-tech/time/defaultClockProvider';
import {CacheLoader, CacheProvider} from './cacheProvider';
import {TimestampedCacheEntry} from './timestampedCacheEntry';

type Configuration<K, V> = {
    /**
     * The underlying cache provider to use.
     */
    cacheProvider: CacheProvider<K, TimestampedCacheEntry<V>>,

    /**
     * The freshness period in seconds for cached data.
     */
    freshPeriod: number,

    /**
     * The clock to use. The default clock is used if none is given
     */
    clock?: Clock,

    /**
     * Handler for background revalidation errors
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
