import {Instant} from '@croct-tech/time';
import {OverridableCacheProvider, StaleWhileRevalidateCache, TimestampedCacheEntry} from '../src';

describe('A cache provider wrapper that automatically caches the loader value in the background', () => {
    const mockCache: jest.MockedObject<OverridableCacheProvider<any, any>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should returned and save loader value when not cached', async () => {
        const now = Instant.fromEpochMillis(12345);

        mockCache.get.mockImplementation((key, loader) => loader(key));
        mockCache.set.mockResolvedValue();

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
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

    it('should returned and save loader value when cached data is expired', async () => {
        const now = Instant.fromEpochMillis(12345);

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

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        let resolveloader: (value: string) => any = jest.fn();

        const loader = jest.fn().mockReturnValueOnce(
            new Promise(resolve => { resolveloader = resolve; }),
        );

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
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

    it('should returned the cached value if not expired', async () => {
        const now = Instant.fromEpochMillis(12345);

        const entry: TimestampedCacheEntry<string> = {
            value: 'cachedValue',
            timestamp: now.plusSeconds(-5),
        };

        mockCache.get.mockResolvedValue(entry);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const loader = jest.fn();

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await expect(cache.get('key', loader)).resolves.toBe('cachedValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).not.toHaveBeenCalled();
    });

    it('should set an entry with the current time', async () => {
        mockCache.set.mockResolvedValue();

        const now = Instant.fromEpochMillis(12345);

        jest.spyOn(Instant, 'now').mockReturnValue(now);

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await cache.set('key', 'value');

        const expectedEntry: TimestampedCacheEntry<string> = {
            value: 'value',
            timestamp: now,
        };

        expect(mockCache.set).toHaveBeenCalledWith('key', expectedEntry);
    });

    it('should forward the deletion of a key', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new StaleWhileRevalidateCache({
            cacheProvider: mockCache,
            freshPeriod: 10,
        });

        await cache.delete('key');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
    });
});
