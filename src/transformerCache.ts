import hash from 'node-object-hash';
import {identity} from 'underscore';
import {JsonValue} from '../jsonTypes';
import {CacheSetOptions, DataCache, MaybeExpired} from './dataCache';

export type Transformer<D, S> = (value: D) => S;

type Configuration<K, V, IK, IV> = {
    cache: DataCache<IK, IV>,
    keySerializer: Transformer<K, IK>,
    valueInputTransformer: Transformer<V, IV>,
    valueOutputTransformer: Transformer<IV, V>,
};

export class TransformerCache<K, V, IK = K, IV = V> implements DataCache<K, V> {
    private readonly cache: DataCache<IK, IV>;

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
        cache: DataCache<IK, V>,
        keyTransformer: Transformer<K, IK>,
    ): TransformerCache<K, V, IK, V> {
        return new TransformerCache({
            cache: cache,
            keySerializer: keyTransformer,
            valueInputTransformer: identity,
            valueOutputTransformer: identity,
        });
    }

    public static transformValue<K, V, IV>(
        cache: DataCache<K, IV>,
        inputTransformer: Transformer<V, IV>,
        outputTransformer: Transformer<IV, V>,
    ): TransformerCache<K, V, K, IV> {
        return new TransformerCache({
            cache: cache,
            keySerializer: identity,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });
    }

    public get(key: K): Promise<V | null> {
        return this.cache.get(this.keyTransformer(key))
            .then(
                value => (
                    value != null
                        ? this.valueOutputTransformer(value)
                        : null
                ),
            );
    }

    public getStale(key: K): Promise<MaybeExpired<V> | null> {
        return this.cache.getStale(this.keyTransformer(key))
            .then(
                value => (
                    value != null
                        ? {
                            ...value,
                            value: this.valueOutputTransformer(value.value),
                        }
                        : null
                ),
            );
    }

    public set(key: K, value: V, options?: CacheSetOptions): Promise<void> {
        return this.cache.set(
            this.keyTransformer(key),
            this.valueInputTransformer(value),
            options,
        );
    }

    public delete(key: K): Promise<void> {
        return this.cache.delete(this.keyTransformer(key));
    }

    public static createHashSerializer(
        alg?: 'md5' | 'sha1' | 'sha256' | 'sha3-256',
    ): Transformer<any, string> {
        const hasher = hash({
            alg: alg,
            sort: true,
            enc: 'hex',
        });

        return (value: any): string => hasher.hash(value);
    }

    // Type-safe wrapper around JSON.stringify
    public static jsonSerializer<T extends JsonValue>(): Transformer<T, string> {
        return JSON.stringify;
    }

    // Type-safe wrapper around JSON.parse
    public static jsonDeserializer<T extends JsonValue>(): Transformer<string, T> {
        return JSON.parse;
    }
}
