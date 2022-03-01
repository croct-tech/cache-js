import {Instant} from '@croct-tech/time';
import {OverridableCacheProvider, StaleWhileRevalidatingCache, TimedCacheEntry} from '../src';

describe('A cache provider wrapper that automatically caches the fallback value in the background', () => {
    const mockCache: jest.MockedObject<OverridableCacheProvider<any, any>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should returned and save fallback value when not cached', async () => {
        const now = Instant.fromEpochMillis(12345);

        mockCache.get.mockImplementation((key, fallback) => fallback(key));
        mockCache.set.mockResolvedValue();

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const fallback = jest.fn().mockResolvedValue('fallbackValue');

        const cache = new StaleWhileRevalidatingCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await expect(cache.get('key', fallback)).resolves.toBe('fallbackValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(fallback).toHaveBeenCalledWith('key');

        const expectedEntry: TimedCacheEntry<string> = {
            value: 'fallbackValue',
            retrievalTime: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should returned and save fallback value when cached data is expired', async () => {
        const now = Instant.fromEpochMillis(12345);

        const cachedEntry: TimedCacheEntry<string> = {
            value: 'cachedValue',
            retrievalTime: now.plusSeconds(-11),
        };

        mockCache.get.mockResolvedValue(cachedEntry);
        mockCache.set.mockResolvedValue();

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        let thenCallback: (value: string) => any = jest.fn();

        const fallback = jest.fn().mockReturnValueOnce({
            // Use Node's A* PromiseLike specification where, once awaiting a value,
            // if it contains a `then` key, the value at that key is called with a
            // callback that will reschedule the running microtask with the called value
            // as the return of the "Promise".
            // This allows us to test that the cache update is done in the background.
            then: callback => {
                thenCallback = callback!;

                return Promise.resolve('fallbackValue');
            },
        } as PromiseLike<string>);

        const cache = new StaleWhileRevalidatingCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await expect(cache.get('key', fallback)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(fallback).toHaveBeenCalledWith('key');

        expect(mockCache.set).not.toHaveBeenCalled();

        const expectedEntry: TimedCacheEntry<string> = {
            value: 'fallbackValue',
            retrievalTime: now,
        };

        await expect(thenCallback('fallbackValue')).resolves.toStrictEqual(expectedEntry);

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should returned the cached value if not expired', async () => {
        const now = Instant.fromEpochMillis(12345);

        const entry: TimedCacheEntry<string> = {
            value: 'cachedValue',
            retrievalTime: now.plusSeconds(-5),
        };

        mockCache.get.mockResolvedValue(entry);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const fallback = jest.fn();

        const cache = new StaleWhileRevalidatingCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await expect(cache.get('key', fallback)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(fallback).not.toHaveBeenCalled();
    });

    it('should set an entry with the current time', async () => {
        mockCache.set.mockResolvedValue();

        const now = Instant.fromEpochMillis(12345);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const cache = new StaleWhileRevalidatingCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await cache.set('key', 'value');

        const expectedEntry: TimedCacheEntry<string> = {
            value: 'value',
            retrievalTime: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should forward the deletion of a key', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new StaleWhileRevalidatingCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await cache.delete('key');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
    });
});
