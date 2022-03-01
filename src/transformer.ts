import {JsonCompatible, JsonValue} from '@croct-tech/json';
import * as hash from 'object-hash';
import {OverridableCacheProvider} from './cacheProvider';

export type Transformer<D, S> = (value: D) => S;

type Configuration<K, V, IK, IV> = {
    cache: OverridableCacheProvider<IK, IV>,
    keySerializer: Transformer<K, IK>,
    valueInputTransformer: Transformer<V, IV>,
    valueOutputTransformer: Transformer<IV, V>,
};

/**
 * A cache wrapper that can transform the key and value before storing them in the cache.
 */
export class TransformerCache<K, V, IK = K, IV = V> implements OverridableCacheProvider<K, V> {
    private readonly cache: OverridableCacheProvider<IK, IV>;

    private readonly keyTransformer: Transformer<K, IK>;

    private readonly valueInputTransformer: Transformer<V, IV>;

    private readonly valueOutputTransformer: Transformer<IV, V>;

    public constructor({
        cache,
        keySerializer,
        valueInputTransformer,
        valueOutputTransformer,
    }: Configuration<K, V, IK, IV>) {
        this.cache = cache;
        this.keyTransformer = keySerializer;
        this.valueInputTransformer = valueInputTransformer;
        this.valueOutputTransformer = valueOutputTransformer;
    }

    public static transformKey<K, IK, V>(
        cache: OverridableCacheProvider<IK, V>,
        keyTransformer: Transformer<K, IK>,
    ): TransformerCache<K, V, IK, V> {
        return new TransformerCache({
            cache: cache,
            keySerializer: keyTransformer,
            valueInputTransformer: value => value,
            valueOutputTransformer: value => value,
        });
    }

    public static transformValue<K, V, IV>(
        cache: OverridableCacheProvider<K, IV>,
        inputTransformer: Transformer<V, IV>,
        outputTransformer: Transformer<IV, V>,
    ): TransformerCache<K, V, K, IV> {
        return new TransformerCache({
            cache: cache,
            keySerializer: key => key,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });
    }

    public get(key: K, fallback: (key: K) => Promise<V>): Promise<V> {
        return this.cache.get(
            this.keyTransformer(key),
            () => fallback(key).then(this.valueInputTransformer),
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
    ): Transformer<any, string> {
        const options: hash.Options = {
            encoding: 'base64',
            algorithm: alg,
        };

        return (value: any): string => hash(value, options);
    }

    // Type-safe wrapper around JSON.stringify
    public static jsonSerializer<T extends JsonCompatible>(): Transformer<T, string> {
        return JSON.stringify;
    }

    // Type-safe wrapper around JSON.parse
    public static jsonDeserializer<T extends JsonValue>(): Transformer<string, T> {
        return JSON.parse;
    }
}
