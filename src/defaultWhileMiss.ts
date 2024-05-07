import {CacheLoader, CacheProvider} from './cacheProvider';

type Configuration<K, V> = {
    cacheProvider: CacheProvider<K, V>,
    defaultValue: V,

    /**
     * Handler for background revalidation errors
     */
    errorHandler?: (error: Error) => void,
};

export class DefaultWhileMissCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly defaultValue: V;

    private readonly errorHandler: (error: Error) => void;

    public constructor(config: Configuration<K, V>) {
        this.cacheProvider = config.cacheProvider;
        this.defaultValue = config.defaultValue;
        this.errorHandler = config.errorHandler ?? ((): void => { /* noop */ });
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cacheProvider.get(key, innerKey => {
            loader(innerKey).catch(
                error => this.errorHandler(error),
            );

            return Promise.resolve(this.defaultValue);
        });
    }

    public set(key: K, value: V): Promise<void> {
        return this.cacheProvider.set(key, value);
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
