import {extractErrorMessage, InMemoryLogger, LogLevel} from '@croct/logging';
import {NoopCache} from '../src';
import {DefaultWhileMissCache} from '../src/defaultWhileMiss';

describe('A cache provider that returns a default value if a timeout occurs', () => {
    it('should return the inner cache value when it returns before the timeout', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const loader = (): Promise<string> => Promise.resolve('loaderValue');

        const cache = new DefaultWhileMissCache({
            timeout: 10,
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await expect(cache.get('key', loader)).resolves.toBe('loaderValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should return the default value when the inner cache returns after the timeout', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const loader = (): Promise<string> => new Promise(resolve => {
            setTimeout(() => resolve('loaderValue'), 10);
        });

        const cache = new DefaultWhileMissCache({
            timeout: 0,
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should return the default value when the inner cache rejects', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const loader = (): Promise<unknown> => Promise.reject(new Error('Some error'));

        const cache = new DefaultWhileMissCache({
            timeout: 10,
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should return the default value using a custom error handler when the inner cache rejects', async () => {
        const inner = new NoopCache();
        const logger = new InMemoryLogger();

        jest.spyOn(inner, 'get');

        const loader = (): Promise<unknown> => Promise.reject(new Error('Some error'));

        const errorHandler = (error: Error): void => logger.log({
            message: extractErrorMessage(error),
            level: LogLevel.ERROR,
        });

        const cache = new DefaultWhileMissCache({
            timeout: 10,
            cacheProvider: inner,
            defaultValue: 'defaultValue',
            errorHandler: errorHandler,
        });

        await expect(cache.get('key', loader)).resolves.toBe('defaultValue');

        expect(inner.get).toHaveBeenCalledWith('key', expect.any(Function));

        expect(logger.getLogs()).toStrictEqual([{
            message: 'Some error',
            level: LogLevel.ERROR,
        }]);
    });

    it('should forward the setting of values', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'set');

        const cache = new DefaultWhileMissCache({
            timeout: 10,
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
            timeout: 10,
            cacheProvider: inner,
            defaultValue: 'defaultValue',
        });

        await cache.delete('key');

        expect(inner.delete).toHaveBeenCalledWith('key');
    });
});
