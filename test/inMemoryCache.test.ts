import {Instant} from '@croct-tech/time';
import {InMemoryCache} from '../src';

describe('A cache backed by an in-memory hash map', () => {
    it('should return null when getting unknown keys', async () => {
        const cache = new InMemoryCache();

        await expect(cache.get('unknown')).resolves.toBeNull();
    });

    it('should return previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await expect(cache.get('key')).resolves.toBe('value');
    });

    it('should return null if the previously stored value is expired', async () => {
        const setTime = Instant.fromEpochMillis(1000);
        const queryTime = Instant.fromEpochMillis(61000);

        jest.spyOn(Instant, 'now')
            .mockReturnValueOnce(setTime)
            .mockReturnValueOnce(queryTime);

        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await expect(cache.get('key')).resolves.toBeNull();
    });

    it('should return null when getting unknown stale keys', async () => {
        const cache = new InMemoryCache();

        await expect(cache.getStale('unknown')).resolves.toBeNull();
    });

    it('should return previously stored value without an expiration', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: null,
        });
    });

    it('should return stale data if previously stored value is expired', async () => {
        const setTime = Instant.fromEpochMillis(1000);
        const queryTime = Instant.fromEpochMillis(61000);

        jest.spyOn(Instant, 'now')
            .mockReturnValueOnce(setTime)
            .mockReturnValueOnce(queryTime);

        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: queryTime,
        });
    });

    it('should not fail when deleting an unknown key', async () => {
        const cache = new InMemoryCache();

        await expect(cache.delete('unknown')).resolves.toBeUndefined();
    });

    it('should delete previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await cache.delete('key');

        await expect(cache.get('key')).resolves.toBeNull();
        await expect(cache.getStale('key')).resolves.toBeNull();
    });

    it('should accept a custom default TTL', async () => {
        const setTime = Instant.fromEpochMillis(1000);
        const queryTime = Instant.fromEpochMillis(100000);

        jest.spyOn(Instant, 'now')
            .mockReturnValueOnce(setTime)
            .mockReturnValueOnce(queryTime);

        const cache = new InMemoryCache(30);

        await cache.set('key', 'value');

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: Instant.fromEpochMillis(31000),
        });
    });

    it('should accept a custom TTL per entry', async () => {
        const setTime = Instant.fromEpochMillis(1000);
        const queryTime = Instant.fromEpochMillis(100000);

        jest.spyOn(Instant, 'now')
            .mockReturnValueOnce(setTime)
            .mockReturnValueOnce(queryTime);

        const cache = new InMemoryCache(30);

        await cache.set('key', 'value', {ttl: 90});

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: Instant.fromEpochMillis(91000),
        });
    });
});
