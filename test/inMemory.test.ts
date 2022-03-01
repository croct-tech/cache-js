import {InMemoryCache} from '../src';

describe('A cache backed by an in-memory hash map', () => {
    it('should return the fallback value when getting unknown keys', async () => {
        const cache = new InMemoryCache();

        const fallback = jest.fn().mockResolvedValue('fallbackValue');

        await expect(cache.get('unknown', fallback)).resolves.toBe('fallbackValue');

        expect(fallback).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith('unknown');
    });

    it('should return previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        const fallback = jest.fn();

        await expect(cache.get('key', fallback)).resolves.toBe('value');

        expect(fallback).not.toHaveBeenCalled();
    });

    it('should not fail when deleting an unknown key', async () => {
        const cache = new InMemoryCache();

        await expect(cache.delete('unknown')).resolves.toBeUndefined();
    });

    it('should delete previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await cache.delete('key');

        const fallback = jest.fn().mockResolvedValue('fallbackValue');

        await expect(cache.get('key', fallback)).resolves.toBe('fallbackValue');
    });
});
