import {extractErrorMessage, Log, Logger, LogLevel} from '@croct/logging';
import {CacheLoader, CacheProvider} from './cacheProvider';

type CacheErrorLog = Log<{
    errorMessage: string,
    errorStack?: string,
}>;

/**
 * A cache wrapper that prevents any error from propagating to the caller.
 *
 * Errors retrieving values from the cache behave as a cache miss.
 */
export class ErrorResilientCache<K, V> implements CacheProvider<K, V> {
    private readonly cache: CacheProvider<K, V>;

    private readonly logger: Logger<CacheErrorLog>;

    public constructor(cache: CacheProvider<K, V>, logger: Logger<CacheErrorLog>) {
        this.cache = cache;
        this.logger = logger;

        this.logError = this.logError.bind(this);
    }

    public get(key: K, loader: CacheLoader<K, V>): Promise<V> {
        return this.cache
            .get(key, loader)
            .catch(error => {
                this.logError(error);

                return loader(key);
            });
    }

    public set(key: K, value: V): Promise<void> {
        return this.cache
            .set(key, value)
            .catch(this.logError);
    }

    public delete(key: K): Promise<void> {
        return this.cache
            .delete(key)
            .catch(this.logError);
    }

    private logError(error: unknown): void {
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
