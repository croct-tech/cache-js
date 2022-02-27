import {Instant} from '@croct-tech/time';
import {CacheSetOptions, DataCache, MaybeExpired} from './dataCache';

type CacheEntry<T> = {
    value: T,
    expiresAt: Instant,
};

/**
 * In-memory cache implementation backed by a native `Map`.
 */
export class InMemoryCache<T = any> implements DataCache<string, T> {
    private readonly defaultTtl: number;

    public constructor(defaultTtl = 60) {
        this.defaultTtl = defaultTtl;
    }

    private cache = new Map<string, CacheEntry<T>>();

    public getCount(): number {
        return this.cache.size;
    }

    public get(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (entry === undefined) {
            return Promise.resolve(null);
        }

        if (entry.expiresAt.isBeforeOrEqual(Instant.now())) {
            return Promise.resolve(null);
        }

        return Promise.resolve(entry.value);
    }

    public getStale(key: string): Promise<MaybeExpired<T> | null> {
        const entry = this.cache.get(key);

        if (entry === undefined) {
            return Promise.resolve(null);
        }

        if (entry.expiresAt.isBeforeOrEqual(Instant.now())) {
            return Promise.resolve({
                value: entry.value,
                expirationTime: entry.expiresAt,
            });
        }

        return Promise.resolve({
            value: entry.value,
            expirationTime: null,
        });
    }

    public set(key: string, value: T, options?: CacheSetOptions): Promise<void> {
        this.cache.set(key, {
            value: value,
            expiresAt: Instant.now().plusSeconds(options?.ttl ?? this.defaultTtl),
        });

        return Promise.resolve();
    }

    public delete(key: string): Promise<void> {
        this.cache.delete(key);

        return Promise.resolve();
    }
}
