import {Instant} from '@croct-tech/time';
import {OverridableCacheProvider, TimedCacheEntry} from './cacheProvider';

type Configuration<K, V> = {
    cacheProvider: OverridableCacheProvider<K, TimedCacheEntry<V>>,
    freshPeriod: number,
};

export class HoldWhileRevalidate<K, V> implements OverridableCacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly freshPeriod: number;

    public constructor({
        cacheProvider,
        freshPeriod,
    }: Configuration<K, V>) {
        this.cacheProvider = cacheProvider;
        this.freshPeriod = freshPeriod;
    }

    public async get(key: K, fallback: (key: K) => Promise<V>): Promise<V> {
        const now = Instant.now();
        const expirationTime = now.plusSeconds(this.freshPeriod);

        const retrieveAndSave = (): Promise<TimedCacheEntry<V>> => fallback(key)
            .then(async value => {
                const entry = {
                    value: value,
                    retrievalTime: now,
                };

                await this.cacheProvider.set(key, entry);

                return entry;
            });

        const possiblyStaleEntry = await this.cacheProvider.get(key, retrieveAndSave);

        if (possiblyStaleEntry.retrievalTime.isAfter(expirationTime)) {
            return retrieveAndSave().then(entry => entry.value);
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
