import {Instant} from '@croct-tech/time';
import Redis from 'ioredis';
import {CacheSetOptions, DataCache, MaybeExpired} from './dataCache';

type CacheEntry = {
    value: string,
    expirationTime: number,
};

type Configuration = {
    redis: Redis.Redis,
    defaultTtl: number,
    staleWindow: number,
};

export class RedisCache implements DataCache<string, string> {
    private readonly redis: Redis.Redis;

    private readonly defaultTtl: number;

    private readonly staleWindow: number;

    public constructor({redis, defaultTtl, staleWindow}: Configuration) {
        this.redis = redis;
        this.defaultTtl = defaultTtl;
        this.staleWindow = staleWindow;
    }

    public async get(key: string): Promise<string | null> {
        const entry = await this.getStale(key);

        return (
            entry === null
            || entry.expirationTime?.isBeforeOrEqual(Instant.now()) === true
        )
            ? null
            : entry.value;
    }

    public async getStale(key: string): Promise<MaybeExpired<string> | null> {
        const serializedEntry = await this.redis.get(key);

        if (serializedEntry == null) {
            return null;
        }

        const entry: CacheEntry = JSON.parse(serializedEntry);

        const expirationTime = Instant.fromEpochMillis(entry.expirationTime);

        return {
            value: entry.value,
            expirationTime: expirationTime.isBeforeOrEqual(Instant.now())
                ? expirationTime
                : null,
        };
    }

    public async set(key: string, value: string, options?: CacheSetOptions): Promise<void> {
        const effectiveTtl = options?.ttl ?? this.defaultTtl;
        const staleWindow = options?.staleWindow ?? this.staleWindow;

        const entry: CacheEntry = {
            value: value,
            expirationTime: Instant.now().plusSeconds(effectiveTtl).toMillis(),
        };

        const serializedEntry = JSON.stringify(entry);

        await this.redis.setex(key, effectiveTtl + staleWindow, serializedEntry);
    }

    public async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}
