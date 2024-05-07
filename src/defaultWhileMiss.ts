import {CacheLoader, CacheProvider} from './cacheProvider';

type Configuration<K, V> = {
    cacheProvider: CacheProvider<K, V>,
    timeout: number,
    defaultValue: V,

    /**
     * Handler for background revalidation errors
     */
    errorHandler?: (error: Error) => void,
};

export class DefaultWhileMissCache<K, V> implements CacheProvider<K, V> {
    private readonly cacheProvider: Configuration<K, V>['cacheProvider'];

    private readonly timeout: number;

    private readonly defaultValue: V;

    private readonly errorHandler: (error: Error) => void;

    public constructor(config: Configuration<K, V>) {
        this.cacheProvider = config.cacheProvider;
        this.timeout = config.timeout;
        this.defaultValue = config.defaultValue;
        this.errorHandler = config.errorHandler ?? ((): void => { /* noop */ });
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        const resolveWithTimeout = (value: V): Promise<V> => new Promise<V>(resolve => {
            setTimeout(() => resolve(value), this.timeout);
        });

        return Promise.race<V>([
            resolveWithTimeout(this.defaultValue),
            this.cacheProvider.get(key, loader),
        ]).catch(error => {
            this.errorHandler(error);

            return this.defaultValue;
        });
    }

    public set(key: K, value: V): Promise<void> {
        return this.cacheProvider.set(key, value);
    }

    public delete(key: K): Promise<void> {
        return this.cacheProvider.delete(key);
    }
}
