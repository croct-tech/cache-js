import {InMemoryCache} from '../src';

describe('A cache backed by an in-memory hash map', () => {
    it('should return the loader value when getting unknown keys', async () => {
        const cache = new InMemoryCache();

        const loader = jest.fn().mockResolvedValue('loaderValue');

        await expect(cache.get('unknown', loader)).resolves.toBe('loaderValue');

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledWith('unknown');
    });

    it('should return previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        const loader = jest.fn();

        await expect(cache.get('key', loader)).resolves.toBe('value');

        expect(loader).not.toHaveBeenCalled();
    });

    it('should not fail when deleting an unknown key', async () => {
        const cache = new InMemoryCache();

        await expect(cache.delete('unknown')).resolves.toBeUndefined();
    });

    it('should delete previously stored values', async () => {
        const cache = new InMemoryCache();

        await cache.set('key', 'value');

        await cache.delete('key');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');
    });
});
