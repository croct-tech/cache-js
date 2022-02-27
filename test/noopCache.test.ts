import {DataCache, NoopCache} from '../src';

describe('A no-op cache', () => {
    it('should not fail to get a value', async () => {
        const cache: DataCache<any, any> = new NoopCache();

        await expect(cache.get('key')).resolves.toBeNull();
    });

    it('should not fail to get a stale value', async () => {
        const cache: DataCache<any, any> = new NoopCache();

        await expect(cache.getStale('key')).resolves.toBeNull();
    });

    it('should not fail to set a value', async () => {
        const cache: DataCache<any, any> = new NoopCache();

        await expect(cache.set('key', 'value')).resolves.toBeUndefined();
    });

    it('should not fail to delete a value', async () => {
        const cache: DataCache<any, any> = new NoopCache();

        await expect(cache.delete('key')).resolves.toBeUndefined();
    });
});
