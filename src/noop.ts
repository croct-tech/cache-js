import {CacheProvider} from './cacheProvider';

/**
 * A no-op implementation of cache provider.
 *
 * Getting a value from the cache will always return the result of the loader function.
 */
export class NoopCache implements CacheProvider<any, any> {
    public get(key: any, loader: (key: any) => any): Promise<any> {
        return loader(key);
    }

    public set(): Promise<void> {
        return Promise.resolve();
    }

    public delete(): Promise<void> {
        return Promise.resolve();
    }
}
