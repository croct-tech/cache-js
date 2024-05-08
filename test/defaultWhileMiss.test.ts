import {extractErrorMessage, InMemoryLogger, LogLevel} from '@croct/logging';
import {NoopCache} from '../src';
import {DefaultWhileMissCache} from '../src/defaultWhileMiss';

describe('A cache provider that returns a default value while load on the background', () => {
    it('should return a default value calling the loader the background', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = new DefaultWhileMissCache({
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');
    });

    it('should return a default value handling a background loading error', async () => {
        const inner = new NoopCache();
        const logger = new InMemoryLogger();

        jest.spyOn(inner, 'get');

        const loader = jest.fn().mockRejectedValue(new Error('Some error.'));

        const errorHandler = (error: Error): void => logger.log({
            message: extractErrorMessage(error),
            level: LogLevel.ERROR,
        });

        const cache = new DefaultWhileMissCache({
            cacheProvider: inner,
            defaultValue: 'defaultValue',
            errorHandler: errorHandler,
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(loader).toHaveBeenCalledWith('key');

        expect(logger.getLogs()).toStrictEqual([{
            message: 'Some error.',
            level: LogLevel.ERROR,
        }]);
    });

    it('should forward the setting of values', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'set');

        const cache = new DefaultWhileMissCache({
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await cache.set('key', 'value');

        expect(inner.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should forward deletions', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'delete');

        const cache = new DefaultWhileMissCache({
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await cache.delete('key');

        expect(inner.delete).toHaveBeenCalledWith('key');
    });
});
