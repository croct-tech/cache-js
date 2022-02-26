import {Instant} from '@croct-tech/time';

export type CacheSetOptions = {
    ttl?: number,
    staleWindow?: number,
};

export type MaybeExpired<T> = {
    value: T,
    expirationTime: Instant | null,
};

export interface DataCache<K, V> {
    get(key: K): Promise<V | null>;

    getStale(key: K): Promise<MaybeExpired<V> | null>;

    set(key: K, value: V, options?: CacheSetOptions): Promise<void>;

    delete(key: K): Promise<void>;
}

export class NoopCache implements DataCache<any, any> {
    public get(): Promise<any | null> {
        return Promise.resolve(null);
    }

    public getStale(): Promise<MaybeExpired<any> | null> {
        return Promise.resolve(null);
    }

    public set(): Promise<void> {
        return Promise.resolve();
    }

    public delete(): Promise<void> {
        return Promise.resolve();
    }
}
