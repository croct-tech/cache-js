import {OverridableCacheProvider, PrefixedCache} from '../src';

describe('A cache wrapper that adds a prefix to the keys', () => {
    const mockCache: jest.MockedObject<OverridableCacheProvider<string, string>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should add the prefix when getting a value', async () => {
        mockCache.get.mockImplementation((key, fallback) => fallback(key));

        const cache = new PrefixedCache(mockCache, 'prefix');
        const fallback = jest.fn().mockResolvedValue('value');

        await expect(cache.get('key', fallback)).resolves.toBe('value');

        expect(mockCache.get).toHaveBeenCalledWith('prefix/key', expect.any(Function));

        expect(fallback).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith('key');
    });

    it('should add the prefix when setting a value', async () => {
        mockCache.set.mockResolvedValue();

        const cache = new PrefixedCache(mockCache, 'prefix');

        await expect(cache.set('key', 'value')).resolves.toBeUndefined();

        expect(mockCache.set).toHaveBeenCalledWith('prefix/key', 'value');
    });

    it('should add the prefix when deleting a value', async () => {
        mockCache.delete.mockResolvedValue();

        const cache = new PrefixedCache(mockCache, 'prefix');

        await expect(cache.delete('key')).resolves.toBeUndefined();

        expect(mockCache.delete).toHaveBeenCalledWith('prefix/key');
    });
});
