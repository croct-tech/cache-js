import {LruCache} from '../src';

describe('A cache backed by an in-memory hash map', () => {
    it('should reject non integer capacities', () => {
        expect(() => LruCache.ofCapacity(2.5))
            .toThrow('LRU capacity must be a positive safe integer');
    });

    it('should reject non positive capacities', () => {
        expect(() => LruCache.ofCapacity(0))
            .toThrow('LRU capacity must be a positive safe integer');

        expect(() => LruCache.ofCapacity(-1))
            .toThrow('LRU capacity must be a positive safe integer');
    });

    it('should load and return a fresh value when the key is not found', async () => {
        const cache = LruCache.ofCapacity(2);

        const loader = jest.fn().mockResolvedValue('loaderValue');

        await expect(cache.get('unknown', loader)).resolves.toBe('loaderValue');

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledWith('unknown');
    });

    it('should return cached values', async () => {
        const cache = LruCache.ofCapacity(2);

        await cache.set('key', 'value');

        const loader = jest.fn();

        await expect(cache.get('key', loader)).resolves.toBe('value');

        expect(loader).not.toHaveBeenCalled();
    });

    it('should remove least recently used value from the cache', async () => {
        const cache = LruCache.ofCapacity(2);

        const loader = jest.fn().mockResolvedValue('value-loader');

        await cache.set('a', 'value-a');
        await cache.set('b', 'value-b');

        // Use b then a, b is the least recently used and should be removed when adding a new entry
        await expect(cache.get('b', loader)).resolves.toBe('value-b');
        await expect(cache.get('a', loader)).resolves.toBe('value-a');

        await cache.set('c', 'value-c');

        await expect(cache.get('a', loader)).resolves.toBe('value-a');
        await expect(cache.get('b', loader)).resolves.toBe('value-loader');
        await expect(cache.get('c', loader)).resolves.toBe('value-c');

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledWith('b');
    });

    it('should not fail when deleting an unknown key', async () => {
        const cache = LruCache.ofCapacity(2);

        await expect(cache.delete('unknown')).resolves.toBeUndefined();
    });

    it('should delete previously stored values', async () => {
        const cache = LruCache.ofCapacity(2);

        await cache.set('key', 'value');

        await cache.delete('key');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');
    });
});
