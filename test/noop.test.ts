import {NoopCache, OverridableCacheProvider} from '../src';

describe('A no-op cache', () => {
    it('should always return the fallback on get', async () => {
        const cache: OverridableCacheProvider<any, any> = new NoopCache();

        const sentinelResult = jest.fn();
        const fallback = jest.fn().mockResolvedValue(sentinelResult);

        await expect(cache.get('key', fallback)).resolves.toBe(sentinelResult);

        expect(fallback).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith('key');
    });

    it('should not fail to set a value', async () => {
        const cache: OverridableCacheProvider<any, any> = new NoopCache();

        await expect(cache.set('key', 'value')).resolves.toBeUndefined();
    });

    it('should not fail to delete a value', async () => {
        const cache: OverridableCacheProvider<any, any> = new NoopCache();

        await expect(cache.delete('key')).resolves.toBeUndefined();
    });
});
