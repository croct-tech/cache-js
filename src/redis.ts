import Redis from 'ioredis';
import {CacheProvider} from './cacheProvider';

type Configuration = {
    redis: Redis.Redis,
    ttl: number,
};

/**
 * A cache that stores data in Redis.
 */
export class RedisCache implements CacheProvider<string, string> {
    private readonly redis: Redis.Redis;

    private readonly ttl: number;

    public constructor({
        redis,
        ttl,
    }: Configuration) {
        this.redis = redis;
        this.ttl = ttl;
    }

    public async get(key: string, fallback: (key: string) => Promise<string>): Promise<string> {
        const entry = await this.redis.get(key);

        return entry == null
            ? fallback(key)
            : entry;
    }

    public async set(key: string, value: string): Promise<void> {
        await this.redis.setex(key, this.ttl, value);
    }

    public async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}
