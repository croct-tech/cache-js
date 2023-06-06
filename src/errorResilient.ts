import {extractErrorMessage, Log, Logger, LogLevel} from '@croct/logging';
import {CacheLoader, CacheProvider} from './cacheProvider';

type CacheErrorLog = Log<{
    errorMessage: string,
    errorStack?: string,
}>;

/**
 * A wrapper that indicates the wrapped error originated on the fresh data loader.
 *
 * This allows the error handling logic to differentiate an error that originated on the
 * wrapped cache provider from an error that originated from the caller-provider data loader.
 */
class LoaderError extends Error {
    public readonly internal: unknown;

    public constructor(internal: unknown) {
        super('Loader error.');
        this.internal = internal;
    }
}

/**
 * A cache wrapper that prevents any error from the wrapped cache from propagating to the caller.
 *
 * Errors retrieving values from the cache behave as a cache miss.
 * Errors retrieving a fresh value from the loader are propagated unchanged.
 */
export class ErrorResilientCache<K, V> implements CacheProvider<K, V> {
    private readonly cache: CacheProvider<K, V>;

    private readonly logger: Logger<CacheErrorLog>;

    public constructor(cache: CacheProvider<K, V>, logger: Logger<CacheErrorLog>) {
        this.cache = cache;
        this.logger = logger;

        this.logProviderError = this.logProviderError.bind(this);
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cache
            .get(key, async loaderKey => {
                try {
                    return await loader(loaderKey);
                } catch (error) {
                    throw new LoaderError(error);
                }
            })
            .catch(error => {
                if (error instanceof LoaderError) {
                    this.logLoaderError(error.internal);

                    throw error.internal;
                }

                this.logProviderError(error);

                return loader(key);
            });
    }

    public set(key: K, value: V): Promise<void> {
        return this.cache
            .set(key, value)
            .catch(this.logProviderError);
    }

    public delete(key: K): Promise<void> {
        return this.cache
            .delete(key)
            .catch(this.logProviderError);
    }

    private logLoaderError(error: unknown): void {
        this.logger.log({
            level: LogLevel.ERROR,
            message: 'Error detected on cache loader error.',
            details: {
                errorMessage: extractErrorMessage(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
        });
    }

    private logProviderError(error: unknown): void {
        this.logger.log({
            level: LogLevel.ERROR,
            message: 'Suppressed error on cache operation',
            details: {
                errorMessage: extractErrorMessage(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
        });
    }
}
