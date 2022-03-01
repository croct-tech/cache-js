import Redis from 'ioredis';
import {RedisCache} from '../src/redis';

describe('A cache backed by Redis', () => {
    const mockedRedis: jest.MockedObject<Redis.Redis> = {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    } as jest.MockedObject<Redis.Redis>;

    it('should return the fallback value when there is no entry on Redis', async () => {
        mockedRedis.get.mockResolvedValue(null);

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        const fallback = jest.fn().mockResolvedValue('fallbackValue');

        await expect(cache.get('key', fallback)).resolves.toBe('fallbackValue');

        expect(mockedRedis.get).toHaveBeenCalledWith('key');

        expect(fallback).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith('key');
    });

    it('should return the cached value', async () => {
        mockedRedis.get.mockResolvedValue('cachedValue');

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        const fallback = jest.fn();

        await expect(cache.get('key', fallback)).resolves.toBe('cachedValue');

        expect(mockedRedis.get).toHaveBeenCalledWith('key');

        expect(fallback).not.toHaveBeenCalled();
    });

    it('should save the given data to Redis', async () => {
        mockedRedis.setex.mockResolvedValue('OK');

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        await cache.set('key', 'value');

        expect(mockedRedis.setex).toHaveBeenCalledWith('key', 10, 'value');
    });

    it('should delete the entry from Redis', async () => {
        mockedRedis.del.mockResolvedValue(1);

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        await cache.delete('key');

        expect(mockedRedis.del).toHaveBeenCalledWith('key');
    });
});
