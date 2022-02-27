import {CacheSetOptions, DataCache, PrefixedCached} from '../src';

describe('A cache wrapper that adds a prefix to the keys', () => {
    const mockCache: jest.MockedObject<DataCache<string, string>> = {
        get: jest.fn(),
        getStale: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should add the prefix when getting a value', async () => {
        mockCache.get.mockResolvedValue('value');

        const cache = new PrefixedCached(mockCache, 'prefix');

        await expect(cache.get('key')).resolves.toBe('value');

        expect(mockCache.get).toHaveBeenCalledWith('prefix/key');
    });

    it('should add the prefix when getting a possibly stale value', async () => {
        mockCache.getStale.mockResolvedValue({
            value: 'value',
            expirationTime: null,
        });

        const cache = new PrefixedCached(mockCache, 'prefix');

        await expect(cache.getStale('key')).resolves.toStrictEqual({
            value: 'value',
            expirationTime: null,
        });

        expect(mockCache.getStale).toHaveBeenCalledWith('prefix/key');
    });

    it('should add the prefix when setting a value', async () => {
        mockCache.set.mockResolvedValue();

        const cache = new PrefixedCached(mockCache, 'prefix');

        const options: CacheSetOptions = {
            ttl: 1000,
            staleWindow: 2000,
        };

        await expect(cache.set('key', 'value', options)).resolves.toBeUndefined();

        expect(mockCache.set).toHaveBeenCalledWith('prefix/key', 'value', options);
    });

    it('should add the prefix when deleting a value', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new PrefixedCached(mockCache, 'prefix');

        await expect(cache.delete('key')).resolves.toBeUndefined();

        expect(mockCache.delete).toHaveBeenCalledWith('prefix/key');
    });
});
