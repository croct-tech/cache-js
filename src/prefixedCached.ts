import {CacheSetOptions, DataCache, MaybeExpired} from './dataCache';

/**
 * A cache that prefixes keys with a string.
 */
export class PrefixedCached<V> implements DataCache<string, V> {
    private readonly inner: DataCache<string, V>;

    private readonly prefix: string;

    public constructor(inner: DataCache<string, V>, prefix: string) {
        this.inner = inner;
        this.prefix = prefix;
    }

    public get(key: string): Promise<V | null> {
        return this.inner.get(`${this.prefix}/${key}`);
    }

    public getStale(key: string): Promise<MaybeExpired<V> | null> {
        return this.inner.getStale(`${this.prefix}/${key}`);
    }

    public set(key: string, value: V, options?: CacheSetOptions): Promise<void> {
        return this.inner.set(`${this.prefix}/${key}`, value, options);
    }

    public delete(key: string): Promise<void> {
        return this.inner.delete(`${this.prefix}/${key}`);
    }
}
