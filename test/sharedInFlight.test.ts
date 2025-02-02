import {NoopCache} from '../src';
import {SharedInFlightCache} from '../src/sharedInFlight';

describe('A cache that shares in-flight requests', () => {
    it('should share in-flight get requests to the inner cache', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const cache = new SharedInFlightCache(inner);

        let resolveInner: (value: any) => void = jest.fn();
        const loaderOne = jest.fn().mockReturnValueOnce(new Promise(resolve => {
            resolveInner = resolve;
        }));

        const loaderTwo = jest.fn();

        const promiseOne = cache.get('key', loaderOne);
        const promiseTwo = cache.get('key', loaderTwo);

        resolveInner('some-value');

        await expect(promiseOne).resolves.toStrictEqual('some-value');
        await expect(promiseTwo).resolves.toStrictEqual('some-value');

        expect(inner.get).toHaveBeenCalledWith('key', loaderOne);
        expect(inner.get).toHaveBeenCalledTimes(1);

        expect(loaderOne).toHaveBeenCalledWith('key');
        expect(loaderOne).toHaveBeenCalledTimes(1);

        expect(loaderTwo).not.toHaveBeenCalled();
    });

    it('should not share in-flight get requests between different keys', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const cache = new SharedInFlightCache(inner);

        let resolveInnerOne: (value: any) => void = jest.fn();
        const loaderOne = jest.fn().mockReturnValueOnce(new Promise(resolve => {
            resolveInnerOne = resolve;
        }));

        let resolveInnerTwo: (value: any) => void = jest.fn();
        const loaderTwo = jest.fn().mockReturnValueOnce(new Promise(resolve => {
            resolveInnerTwo = resolve;
        }));

        const promiseOne = cache.get('key-one', loaderOne);
        const promiseTwo = cache.get('key-two', loaderTwo);

        resolveInnerOne('value-one');
        resolveInnerTwo('value-two');

        await expect(promiseOne).resolves.toStrictEqual('value-one');
        await expect(promiseTwo).resolves.toStrictEqual('value-two');

        expect(inner.get).toHaveBeenCalledWith('key-one', loaderOne);
        expect(inner.get).toHaveBeenCalledWith('key-two', loaderTwo);
        expect(inner.get).toHaveBeenCalledTimes(2);

        expect(loaderOne).toHaveBeenCalledWith('key-one');
        expect(loaderOne).toHaveBeenCalledTimes(1);

        expect(loaderTwo).toHaveBeenCalledWith('key-two');
        expect(loaderTwo).toHaveBeenCalledTimes(1);
    });

    it('should not share get requests after completion', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'get');

        const cache = new SharedInFlightCache(inner);

        const loaderOne = jest.fn().mockResolvedValueOnce('value-one');

        const loaderTwo = jest.fn().mockResolvedValueOnce('value-two');

        const promiseOne = cache.get('key', loaderOne);

        // Await the first promise to complete before calling the get method again
        await expect(promiseOne).resolves.toStrictEqual('value-one');

        const promiseTwo = cache.get('key', loaderTwo);

        await expect(promiseTwo).resolves.toStrictEqual('value-two');

        expect(inner.get).toHaveBeenCalledWith('key', loaderOne);
        expect(inner.get).toHaveBeenCalledWith('key', loaderTwo);
        expect(inner.get).toHaveBeenCalledTimes(2);

        expect(loaderOne).toHaveBeenCalledWith('key');
        expect(loaderOne).toHaveBeenCalledTimes(1);

        expect(loaderTwo).toHaveBeenCalledWith('key');
        expect(loaderTwo).toHaveBeenCalledTimes(1);
    });

    it('should forward set calls to the inner cache', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'set').mockResolvedValueOnce();

        const cache = new SharedInFlightCache(inner);

        await cache.set('some-key', 'some-value');

        expect(inner.set).toHaveBeenCalledWith('some-key', 'some-value');
    });

    it('should forward delete calls to the inner cache', async () => {
        const inner = new NoopCache();

        jest.spyOn(inner, 'delete').mockResolvedValueOnce();

        const cache = new SharedInFlightCache(inner);

        await cache.delete('some-key');

        expect(inner.delete).toHaveBeenCalledWith('some-key');
    });
});
