import {CacheLoader, CacheProvider} from './cacheProvider';

export type Configuration<K, V> = {
    provider: CacheProvider<K, V>,
    defaultValue: V,
    /**
     * Handler for background revalidation errors
     */
    errorHandler?: (error: Error) => void,
};

export class DefaultWhileMissCache<K, V> implements CacheProvider<K, V> {
    private readonly provider: Configuration<K, V>['provider'];

    private readonly defaultValue: V;

    private readonly errorHandler: (error: Error) => void;

    public constructor(config: Configuration<K, V>) {
        this.provider = config.provider;
        this.defaultValue = config.defaultValue;
        this.errorHandler = config.errorHandler ?? ((): void => { /* noop */ });
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.provider.get(key, innerKey => {
            loader(innerKey).catch(this.errorHandler);

            return Promise.resolve(this.defaultValue);
        });
    }

    public set(key: K, value: V): Promise<void> {
        return this.provider.set(key, value);
    }

    public delete(key: K): Promise<void> {
        return this.provider.delete(key);
    }
}
