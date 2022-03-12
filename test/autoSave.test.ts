import {AutoSaveCache, CacheProvider} from '../src';

describe('A cache provider that automatically saves loaded values', () => {
    const mockCache: jest.MockedObject<CacheProvider<any, any>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should automatically save non-cached values', async () => {
        mockCache.get.mockImplementation((key, loader) => loader(key));
        mockCache.set.mockResolvedValue();

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new AutoSaveCache(mockCache);

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');

        expect(mockCache.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');

        expect(mockCache.set).toHaveBeenCalledWith('key', 'loaderValue');
    });

    it('should forward the setting of values', async () => {
        mockCache.set.mockResolvedValue();

        const cache = new AutoSaveCache(mockCache);

        await cache.set('key', 'value');

        expect(mockCache.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should forward the deletions', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new AutoSaveCache(mockCache);

        await cache.delete('key');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
    });
});
