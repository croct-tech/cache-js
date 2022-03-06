import {Instant} from '@croct-tech/time';
import {CacheProvider, HoldWhileRevalidateCache, TimestampedCacheEntry} from '../src';

describe('A cache provider that holds while revalidating the cache', () => {
    const mockCache: jest.MockedObject<CacheProvider<any, any>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should hold while saving a non-cached value', async () => {
        const now = Instant.fromEpochMillis(12345);

        mockCache.get.mockImplementation((key, loader) => loader(key));
        mockCache.set.mockResolvedValue();

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new HoldWhileRevalidateCache({
            cacheProvider: mockCache,
            maxAge: 10,
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

    it('should hold while saving over an expired value', async () => {
        const now = Instant.fromEpochMillis(12345);

        const cachedEntry: TimestampedCacheEntry<string> = {
            value: 'cachedValue',
            timestamp: now.plusSeconds(-11),
        };

        mockCache.get.mockResolvedValue(cachedEntry);
        mockCache.set.mockResolvedValue();

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new HoldWhileRevalidateCache({
            cacheProvider: mockCache,
            maxAge: 10,
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

    it('should return the non-expired cached value', async () => {
        const now = Instant.fromEpochMillis(12345);

        const entry: TimestampedCacheEntry<string> = {
            value: 'cachedValue',
            timestamp: now.plusSeconds(-5),
        };

        mockCache.get.mockResolvedValue(entry);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const loader = jest.fn();

        const cache = new HoldWhileRevalidateCache({
            cacheProvider: mockCache,
            maxAge: 10,
        });

        await expect(cache.get('key', loader)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).not.toHaveBeenCalled();
    });

    it('should set entries with the current time', async () => {
        mockCache.set.mockResolvedValue();

        const now = Instant.fromEpochMillis(12345);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const cache = new HoldWhileRevalidateCache({
            cacheProvider: mockCache,
            maxAge: 10,
        });

        await cache.set('key', 'value');

        const expectedEntry: TimestampedCacheEntry<string> = {
            value: 'value',
            timestamp: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should forward the deletions', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new HoldWhileRevalidateCache({
            cacheProvider: mockCache,
            maxAge: 10,
        });

        await cache.delete('key');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
    });
});
