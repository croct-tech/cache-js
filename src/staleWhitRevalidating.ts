import {Instant} from '@croct-tech/time';
import {CacheLoader, OverridableCacheProvider, TimedCacheEntry} from './cacheProvider';

type Configuration<K, V> = {
    cacheProvider: OverridableCacheProvider<K, TimedCacheEntry<V>>,
    freshPeriod: number,

    // Handler for background revalidation errors
    errorHandler?: (error: Error) => void,
};

export class StaleWhileRevalidatingCache<K, V> implements OverridableCacheProvider<K, V> {
    private readonly cacheProvider: OverridableCacheProvider<K, TimedCacheEntry<V>>;

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

        const retrieveAndSave = (): Promise<TimedCacheEntry<V>> => loader(key)
            .then(async value => {
                const entry = {
                    value: value,
                    retrievalTime: now,
                };

                await this.cacheProvider.set(key, entry);

                return entry;
            });

        const possiblyStaleEntry = await this.cacheProvider.get(key, retrieveAndSave);

        if (now.isAfter(possiblyStaleEntry.retrievalTime.plusSeconds(this.freshPeriod))) {
            // If expired revalidate on the background and return cached value
            retrieveAndSave().catch(this.errorHandler);
        }

        return possiblyStaleEntry.value;
    }

    public set(key: K, value: V): Promise<void> {
        return this.cacheProvider.set(key, {
            value: value,
            retrievalTime: Instant.now(),
        });
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
