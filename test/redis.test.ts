import Redis from 'ioredis';
import {RedisCache} from '../src/redis';

describe('A cache backed by Redis', () => {
    const mockedRedis: jest.MockedObject<Redis.Redis> = {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    } as jest.MockedObject<Redis.Redis>;

    it('should load and return a fresh value when the key is not found in Redis', async () => {
        mockedRedis.get.mockResolvedValue(null);

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        const loader = jest.fn().mockResolvedValue('loaderValue');

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');

        expect(mockedRedis.get).toHaveBeenCalledWith('key');

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledWith('key');
    });

    it('should return cached values from Redis', async () => {
        mockedRedis.get.mockResolvedValue('cachedValue');

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        const loader = jest.fn();

        await expect(cache.get('key', loader)).resolves.toBe('cachedValue');

        expect(mockedRedis.get).toHaveBeenCalledWith('key');

        expect(loader).not.toHaveBeenCalled();
    });

    it('should store values into Redis', async () => {
        mockedRedis.setex.mockResolvedValue('OK');

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        await cache.set('key', 'value');

        expect(mockedRedis.setex).toHaveBeenCalledWith('key', 10, 'value');
    });

    it('should delete values from Redis', async () => {
        mockedRedis.del.mockResolvedValue(1);

        const cache = new RedisCache({
            redis: mockedRedis,
            ttl: 10,
        });

        await cache.delete('key');

        expect(mockedRedis.del).toHaveBeenCalledWith('key');
    });
});
