import {DefaultWhileMissCache, NoopCache} from '../src';

describe('A cache provider that returns a default value while loading in the background', () => {
    it('should return a default value calling the loader the background', async () => {
        const provider = new NoopCache();

        jest.spyOn(provider, 'get');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new DefaultWhileMissCache({
            provider: provider,
            defaultValue: 'defaultValue',
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(provider.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');
    });

    it('should return a default value handling a loading error in background', async () => {
        const provider = new NoopCache();

        jest.spyOn(provider, 'get');

        const error = new Error('Some error.');

        const loader = jest.fn().mockRejectedValue(error);

        const errorHandler = jest.fn();

        const cache = new DefaultWhileMissCache({
            provider: provider,
            defaultValue: 'defaultValue',
            errorHandler: errorHandler,
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(provider.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');

        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should delegate setting a value to the underlying provider', async () => {
        const provider = new NoopCache();

        jest.spyOn(provider, 'set');

        const cache = new DefaultWhileMissCache({
            provider: provider,
            defaultValue: 'defaultValue',
        });

        await cache.set('key', 'value');

        expect(provider.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should delegate deleting a value to the underlying provider', async () => {
        const provider = new NoopCache();

        jest.spyOn(provider, 'delete');

        const cache = new DefaultWhileMissCache({
            provider: provider,
            defaultValue: 'defaultValue',
        });

        await cache.delete('key');

        expect(provider.delete).toHaveBeenCalledWith('key');
    });
});
