import {OverridableCacheProvider} from './cacheProvider';

/**
 * A cache that prefixes keys with a string.
 */
export class PrefixedCache<V> implements OverridableCacheProvider<string, V> {
    private readonly inner: OverridableCacheProvider<string, V>;

    private readonly prefix: string;

    public constructor(inner: OverridableCacheProvider<string, V>, prefix: string) {
        this.inner = inner;
        this.prefix = prefix;
    }

    public get(key: string, loader: (key: string) => Promise<V>): Promise<V> {
        return this.inner.get(`${this.prefix}/${key}`, () => loader(key));
    }

    public set(key: string, value: V): Promise<void> {
        return this.inner.set(`${this.prefix}/${key}`, value);
    }

    public delete(key: string): Promise<void> {
        return this.inner.delete(`${this.prefix}/${key}`);
    }
}
