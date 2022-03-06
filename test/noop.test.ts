import {NoopCache, OverridableCacheProvider} from '../src';

describe('A no-op cache', () => {
    it('should load fresh values', async () => {
        const cache: OverridableCacheProvider<any, any> = new NoopCache();

        const sentinelResult = jest.fn();
        const loader = jest.fn().mockResolvedValue(sentinelResult);

        await expect(cache.get('key', loader)).resolves.toBe(sentinelResult);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledWith('key');
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
