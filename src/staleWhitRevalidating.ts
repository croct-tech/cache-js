import {Instant} from '@croct-tech/time';
import {CacheLoader, CacheProvider} from './cacheProvider';
import {TimestampedCacheEntry} from './timestampedCacheEntry';

type Configuration<K, V> = {
    cacheProvider: CacheProvider<K, TimestampedCacheEntry<V>>,
    freshPeriod: number,

    /**
     * Handler for background revalidation errors
     */
    errorHandler?: (error: Error) => void,
};

export class StaleWhileRevalidateCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly freshPeriod: number;

    private readonly errorHandler: (error: Error) => void;

    public constructor({
        cacheProvider,
        freshPeriod,
        errorHandler = (): void => { /* noop */ },
    }: Configuration<K, V>) {
        this.cacheProvider = cacheProvider;
        this.freshPeriod = freshPeriod;
        this.errorHandler = errorHandler;
    }

    public async get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        const now = Instant.now();

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
            timestamp: Instant.now(),
        });
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
