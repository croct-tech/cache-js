import {JsonCompatible, JsonValue} from '@croct-tech/json';
import * as hash from 'object-hash';
import {CacheLoader, OverridableCacheProvider} from './cacheProvider';

export type Adapted<D, S> = (value: D) => S;

type Configuration<K, V, IK, IV> = {
    cache: OverridableCacheProvider<IK, IV>,
    keyTransformer: Adapted<K, IK>,
    valueInputTransformer: Adapted<V, IV>,
    valueOutputTransformer: Adapted<IV, V>,
};

/**
 * A cache wrapper that can transform the key and value before storing them in the cache.
 */
export class AdaptedCache<K, V, IK = K, IV = V> implements OverridableCacheProvider<K, V> {
    private readonly cache: OverridableCacheProvider<IK, IV>;

    private readonly keyTransformer: Adapted<K, IK>;

    private readonly valueInputTransformer: Adapted<V, IV>;

    private readonly valueOutputTransformer: Adapted<IV, V>;

    public constructor({
        cache,
        keyTransformer,
        valueInputTransformer,
        valueOutputTransformer,
    }: Configuration<K, V, IK, IV>) {
        this.cache = cache;
        this.keyTransformer = keyTransformer;
        this.valueInputTransformer = valueInputTransformer;
        this.valueOutputTransformer = valueOutputTransformer;
    }

    public static transformKeys<K, IK, V>(
        cache: OverridableCacheProvider<IK, V>,
        keyTransformer: Adapted<K, IK>,
    ): AdaptedCache<K, V, IK, V> {
        return new AdaptedCache({
            cache: cache,
            keyTransformer: keyTransformer,
            valueInputTransformer: value => value,
            valueOutputTransformer: value => value,
        });
    }

    public static transformValues<K, V, IV>(
        cache: OverridableCacheProvider<K, IV>,
        inputTransformer: Adapted<V, IV>,
        outputTransformer: Adapted<IV, V>,
    ): AdaptedCache<K, V, K, IV> {
        return new AdaptedCache({
            cache: cache,
            keyTransformer: key => key,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cache.get(
            this.keyTransformer(key),
            () => loader(key).then(this.valueInputTransformer),
        ).then(this.valueOutputTransformer);
    }

    public set(key: K, value: V): Promise<void> {
        return this.cache.set(
            this.keyTransformer(key),
            this.valueInputTransformer(value),
        );
    }

    public delete(key: K): Promise<void> {
        return this.cache.delete(this.keyTransformer(key));
    }

    public static createHashSerializer(
        alg?: hash.Options['algorithm'],
    ): Adapted<any, string> {
        const options: hash.Options = {
            encoding: 'base64',
            algorithm: alg,
        };

        return (value: any): string => hash(value, options);
    }

    // Type-safe wrapper around JSON.stringify
    public static jsonSerializer<T extends JsonCompatible>(): Adapted<T, string> {
        return JSON.stringify;
    }

    // Type-safe wrapper around JSON.parse
    public static jsonDeserializer<T extends JsonValue>(): Adapted<string, T> {
        return JSON.parse;
    }
}
