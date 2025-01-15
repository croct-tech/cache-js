import {Instant, TimeZone} from '@croct/time';
import {FixedClock} from '@croct/time/clock/fixedClock';
import {CacheProvider, StaleWhileRevalidateCache, TimestampedCacheEntry} from '../src';

describe('A cache provider that uses stale values while revalidating the cache', () => {
    const mockCache: jest.MockedObject<CacheProvider<any, any>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should hold while saving a non-cached value', async () => {
        const now = Instant.ofEpochMilli(12345);
        const clock = FixedClock.of(now, TimeZone.UTC);

        mockCache.get.mockImplementation((key, loader) => loader(key));
        mockCache.set.mockResolvedValue();

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
            clock: clock,
        });

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');

        const expectedEntry: TimestampedCacheEntry<string> = {
            value: 'loaderValue',
            timestamp: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should return the stale value while revalidating expired entries', async () => {
        const now = Instant.ofEpochMilli(12345);
        const clock = FixedClock.of(now, TimeZone.UTC);

        const cachedEntry: TimestampedCacheEntry<string> = {
            value: 'cachedValue',
            timestamp: now.plusSeconds(-11),
        };

        mockCache.get.mockResolvedValue(cachedEntry);

        let resolveSet: () => void = jest.fn();
        const setPromise = new Promise<void>(resolve => { resolveSet = resolve; });

        mockCache.set.mockImplementation(() => {
            resolveSet();

            return setPromise;
        });

        let resolveloader: (value: string) => any = jest.fn();

        const loader = jest.fn().mockReturnValueOnce(
            new Promise(resolve => { resolveloader = resolve; }),
        );

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
            clock: clock,
        });

        await expect(cache.get('key', loader)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');

        expect(mockCache.set).not.toHaveBeenCalled();

        const expectedEntry: TimestampedCacheEntry<string> = {
            value: 'loaderValue',
            timestamp: now,
        };

        resolveloader('loaderValue');

        await setPromise;

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should returned non-expired entries', async () => {
        const now = Instant.ofEpochMilli(12345);
        const clock = FixedClock.of(now, TimeZone.UTC);

        const entry: TimestampedCacheEntry<string> = {
            value: 'cachedValue',
            timestamp: now.plusSeconds(-5),
        };

        mockCache.get.mockResolvedValue(entry);

        const loader = jest.fn();

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
            clock: clock,
        });

        await expect(cache.get('key', loader)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).not.toHaveBeenCalled();
    });

    it('should set entries with the current time', async () => {
        mockCache.set.mockResolvedValue();

        const now = Instant.ofEpochMilli(12345);
        const clock = FixedClock.of(now, TimeZone.UTC);

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
            clock: clock,
        });

        await cache.set('key', 'value');

        const expectedEntry: TimestampedCacheEntry<string> = {
            value: 'value',
            timestamp: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should forward deletions', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await cache.delete('key');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
    });
});
