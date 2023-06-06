import {InMemoryLogger, Log, LogLevel} from '@croct/logging';
import {CacheProvider, ErrorResilientCache, InMemoryCache, NoopCache} from '../src';

class FailingCache implements CacheProvider<any, any> {
    public delete(): Promise<void> {
        return Promise.reject(new Error('Failing cache implementation.'));
    }

    public get(): Promise<any> {
        return Promise.reject(new Error('Failing cache implementation.'));
    }

    public set(): Promise<void> {
        return Promise.reject(new Error('Failing cache implementation.'));
    }
}

describe('An error-resilient cache wrapper', () => {
    it('should forward get calls', async () => {
        const innerCache = new InMemoryCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await innerCache.set('foo', 'bar');

        await expect(cache.get('foo', () => Promise.resolve(null))).resolves.toBe('bar');
        await expect(cache.get('baz', () => Promise.resolve(null))).resolves.toBeNull();

        expect(logger.getLogs()).toStrictEqual([]);
    });

    it('should forward set calls', async () => {
        const innerCache = new InMemoryCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await cache.set('foo', 'bar');

        await expect(cache.get('foo', () => Promise.resolve(null))).resolves.toBe('bar');
        await expect(innerCache.get('foo', () => Promise.resolve(null))).resolves.toBe('bar');

        expect(logger.getLogs()).toStrictEqual([]);
    });

    it('should forward delete calls', async () => {
        const innerCache = new InMemoryCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await innerCache.set('foo', 'bar');
        await cache.delete('foo');

        await expect(cache.get('foo', () => Promise.resolve(null))).resolves.toBeNull();
        await expect(innerCache.get('foo', () => Promise.resolve(null))).resolves.toBeNull();

        expect(logger.getLogs()).toStrictEqual([]);
    });

    it('should forward loader errors unchanged', async () => {
        const innerCache = new NoopCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        const loaderError = new Error('Some error message from loader.');
        const loader = jest.fn()
            .mockRejectedValueOnce(loaderError)
            .mockRejectedValue(new Error('Incorrect error.'));

        await expect(cache.get('foo', loader)).rejects.toBe(loaderError);

        // The loader should only be called once
        expect(loader).toHaveBeenCalledTimes(1);

        expect(logger.getLogs()).toStrictEqual<Log[]>([
            {
                level: LogLevel.ERROR,
                message: 'Error detected on cache loader error.',
                details: {
                    errorMessage: loaderError.message,
                    errorStack: loaderError.stack,
                },
            },
        ]);
    });

    it('should handle errors on get calls as a cache miss', async () => {
        const innerCache = new FailingCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await expect(cache.get('foo', () => Promise.resolve(null))).resolves.toBeNull();

        expect(logger.getLogs()).toStrictEqual<Log[]>([{
            level: LogLevel.ERROR,
            message: 'Suppressed error on cache operation',
            details: {
                errorMessage: 'Failing cache implementation.',
                errorStack: expect.stringContaining('at FailingCache.get'),
            },
        }]);
    });

    it('should suppress errors on set calls', async () => {
        const innerCache = new FailingCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await cache.set('foo', 'bar');

        expect(logger.getLogs()).toStrictEqual<Log[]>([{
            level: LogLevel.ERROR,
            message: 'Suppressed error on cache operation',
            details: {
                errorMessage: 'Failing cache implementation.',
                errorStack: expect.stringContaining('at FailingCache.set'),
            },
        }]);
    });

    it('should suppress errors on delete calls', async () => {
        const innerCache = new FailingCache();
        const logger = new InMemoryLogger();
        const cache = new ErrorResilientCache(innerCache, logger);

        await cache.delete('foo');

        expect(logger.getLogs()).toStrictEqual<Log[]>([{
            level: LogLevel.ERROR,
            message: 'Suppressed error on cache operation',
            details: {
                errorMessage: 'Failing cache implementation.',
                errorStack: expect.stringContaining('at FailingCache.delete'),
            },
        }]);
    });
});
