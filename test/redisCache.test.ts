import {Instant} from '@croct-tech/time';
import Redis from 'ioredis';
import {RedisCache} from '../src/redis';

describe('A cache backed by Redis', () => {
    const mockedRedis: jest.MockedObject<Redis.Redis> = {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    } as jest.MockedObject<Redis.Redis>;

    it('should return null when there is no entry on Redis', async () => {
        mockedRedis.get.mockResolvedValue(null);

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.get('key')).resolves.toBeNull();

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should return null when the value is expired', async () => {
        mockedRedis.get.mockResolvedValue(JSON.stringify({
            value: 'value',
            expirationTime: 999,
        }));

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.get('key')).resolves.toBeNull();

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should return the cached value when it is not expired', async () => {
        mockedRedis.get.mockResolvedValue(JSON.stringify({
            value: 'value',
            expirationTime: 1001,
        }));

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.get('key')).resolves.toBe('value');

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should return null entry when there is no entry on Redis', async () => {
        mockedRedis.get.mockResolvedValue(null);

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.getStale('key')).resolves.toBeNull();

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should return non-expired entry when the value is not yet expired', async () => {
        mockedRedis.get.mockResolvedValue(JSON.stringify({
            value: 'value',
            expirationTime: 1001,
        }));

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: null,
        });

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should return expired entry when the value is expired', async () => {
        mockedRedis.get.mockResolvedValue(JSON.stringify({
            value: 'value',
            expirationTime: 999,
        }));

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: Instant.fromEpochMillis(999),
        });

        expect(mockedRedis.get).toHaveBeenCalledWith('key');
    });

    it('should save the given data to Redis', async () => {
        mockedRedis.setex.mockResolvedValue('OK');

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await cache.set('key', 'value');

        expect(mockedRedis.setex).toHaveBeenCalledWith('key', 310, JSON.stringify({
            value: 'value',
            expirationTime: 11000,
        }));
    });

    it('should save the given data to Redis with custom options', async () => {
        mockedRedis.setex.mockResolvedValue('OK');

        jest.spyOn(Instant, 'now')
            .mockReturnValue(Instant.fromEpochMillis(1000));

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await cache.set('key', 'value', {
            ttl: 30,
            staleWindow: 500,
        });

        expect(mockedRedis.setex).toHaveBeenCalledWith('key', 530, JSON.stringify({
            value: 'value',
            expirationTime: 31000,
        }));
    });

    it('should delete the entry from Redis', async () => {
        mockedRedis.del.mockResolvedValue(1);

        const cache = new RedisCache({
            redis: mockedRedis,
            defaultTtl: 10,
            staleWindow: 300,
        });

        await cache.delete('key');

        expect(mockedRedis.del).toHaveBeenCalledWith('key');
    });
});
