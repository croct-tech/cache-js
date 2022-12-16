import {JsonCompatible, JsonValue} from '@croct/json';
import * as hash from 'object-hash';
import {CacheLoader, CacheProvider} from './cacheProvider';

export type Transformer<D, S> = (value: D) => S;

export type SerializationAlgorithm = 'passthrough' | 'md5' | 'sha1';

type Configuration<K, V, IK, IV> = {
    cache: CacheProvider<IK, IV>,
    keyTransformer: Transformer<K, IK>,
    valueInputTransformer: Transformer<V, IV>,
    valueOutputTransformer: Transformer<IV, V>,
};

function identity<T>(value: T): T {
    return value;
}

/**
 * A cache provider to transform keys and values between composition layers.
 */
export class AdaptedCache<K, V, IK = K, IV = V> implements CacheProvider<K, V> {
    private readonly cache: CacheProvider<IK, IV>;

    private readonly keyTransformer: Transformer<K, IK>;

    private readonly valueInputTransformer: Transformer<V, IV>;

    private readonly valueOutputTransformer: Transformer<IV, V>;

    public constructor(config: Configuration<K, V, IK, IV>) {
        this.cache = config.cache;
        this.keyTransformer = config.keyTransformer;
        this.valueInputTransformer = config.valueInputTransformer;
        this.valueOutputTransformer = config.valueOutputTransformer;
    }

    public static transformKeys<K, IK, V>(
        cache: CacheProvider<IK, V>,
        keyTransformer: Transformer<K, IK>,
    ): AdaptedCache<K, V, IK, V> {
        return new AdaptedCache({
            cache: cache,
            keyTransformer: keyTransformer,
            valueInputTransformer: identity,
            valueOutputTransformer: identity,
        });
    }

    public static transformValues<K, V, IV>(
        cache: CacheProvider<K, IV>,
        inputTransformer: Transformer<V, IV>,
        outputTransformer: Transformer<IV, V>,
    ): AdaptedCache<K, V, K, IV> {
        return new AdaptedCache({
            cache: cache,
            keyTransformer: identity,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cache
            .get(
                this.keyTransformer(key),
                () => loader(key).then(this.valueInputTransformer),
            )
            .then(this.valueOutputTransformer);
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

    public static createHashSerializer(algorithm?: SerializationAlgorithm): Transformer<any, string> {
        const options: hash.Options = {
            encoding: 'base64',
            algorithm: algorithm,
        };

        return (value: any): string => hash(value, options);
    }

    /**
     * Serializes a JSON compatible value to a string using JSON.stringify.
     *
     * This is a helper function for type safety.
      */
    public static jsonSerializer<T extends JsonCompatible>(): Transformer<T, string> {
        return JSON.stringify;
    }

    /**
     * Deserializes a string into a JSON value using JSON.parse.
     *
     * This is a helper function for type safety.
      */
    public static jsonDeserializer<T extends JsonValue>(): Transformer<string, T> {
        return JSON.parse;
    }
}
