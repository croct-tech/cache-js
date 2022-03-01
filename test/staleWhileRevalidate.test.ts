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

        let resolveSet: () => void = jest.fn();
        const setPromise = new Promise<void>(resolve => { resolveSet = resolve; });

        mockCache.set.mockImplementation(() => {
            resolveSet();

            return setPromise;
        });

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        let resolveFallback: (value: string) => any = jest.fn();

        const fallback = jest.fn().mockReturnValueOnce(
            new Promise(resolve => { resolveFallback = resolve; }),
        );

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

        resolveFallback('fallbackValue');

        await setPromise;

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
