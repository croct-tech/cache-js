import {Instant, TimeZone} from '@croct/time';
import {FixedClock} from '@croct/time/clock/fixedClock';
import type {CacheProvider, TimestampedCacheEntry} from '../src';
import {AdaptedCache, AutoSaveCache, InMemoryCache, SharedInFlightCache, StaleWhileRevalidateCache} from '../src';

describe('A cache adapter that can transform keys and values', () => {
    const mockCache: jest.MockedObject<CacheProvider<string, string>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should apply the key transformer when getting a value', async () => {
        mockCache.get.mockImplementation((key, loader) => loader(key));

        const transformer = jest.fn().mockReturnValueOnce('transformed');

        const loader = jest.fn().mockResolvedValue('value');

        const cache = AdaptedCache.transformKeys(mockCache, transformer);

        const result = await cache.get('key', loader);

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.get).toHaveBeenCalledWith('transformed', expect.any(Function));
        expect(loader).toHaveBeenCalledWith('key');
        expect(result).toBe('value');
    });

    it('should apply the key transformer when setting a value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.set.mockResolvedValueOnce();

        const cache = AdaptedCache.transformKeys(mockCache, transformer);

        await cache.set('key', 'value');

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.set).toHaveBeenCalledWith('transformed', 'value');
    });

    it('should apply the key transformer when deleting a value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.delete.mockResolvedValueOnce();

        const cache = AdaptedCache.transformKeys(mockCache, transformer);

        await cache.delete('key');

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.delete).toHaveBeenCalledWith('transformed');
    });

    it('should apply the value output transformer when getting a value', async () => {
        mockCache.get.mockResolvedValueOnce('value');

        const inputTransformer = jest.fn();
        const outputTransformer = jest.fn().mockReturnValueOnce('transformed');

        const loader = jest.fn();

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key', loader);

        expect(inputTransformer).not.toHaveBeenCalled();
        expect(outputTransformer).toHaveBeenCalledWith('value');
        expect(result).toBe('transformed');

        expect(loader).not.toHaveBeenCalled();
    });

    it('should delete a malformed cached value and reload it through the cache', async () => {
        const deserializationError = new Error('Failed to deserialize cached value');
        const keyTransformer = jest.fn().mockReturnValue('transformed-key');
        const inputTransformer = jest.fn((value: string) => value);
        const outputTransformer = jest.fn((value: string) => {
            if (value === 'malformed') {
                throw deserializationError;
            }

            return value;
        });
        const loader = jest.fn().mockResolvedValue('fresh');
        const cache = new AdaptedCache({
            cache: mockCache,
            keyTransformer: keyTransformer,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });

        mockCache.get
            .mockResolvedValueOnce('malformed')
            .mockImplementationOnce((_key, cacheLoader) => cacheLoader('transformed-key'));

        await expect(cache.get('key', loader)).resolves.toBe('fresh');

        expect(mockCache.delete).toHaveBeenCalledWith('transformed-key');
    });

    it('should propagate deserialization errors from freshly loaded values without retrying', async () => {
        const deserializationError = new Error('Failed to deserialize loaded value');
        const keyTransformer = jest.fn().mockReturnValue('transformed-key');
        const inputTransformer = jest.fn((value: string) => value);
        const outputTransformer = jest.fn(() => {
            throw deserializationError;
        });
        const loader = jest.fn().mockResolvedValue('malformed');
        const cache = new AdaptedCache({
            cache: mockCache,
            keyTransformer: keyTransformer,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });

        mockCache.get.mockImplementation((_key, cacheLoader) => cacheLoader('transformed-key'));

        await expect(cache.get('key', loader)).rejects.toThrow(deserializationError);

        expect(mockCache.delete).not.toHaveBeenCalled();
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should reuse a loaded value when output transformation fails after a cache miss', async () => {
        mockCache.get.mockImplementation((key, cacheLoader) => cacheLoader(key));

        const error = new Error('Failed to transform loaded value');
        const outputTransformer = jest.fn()
            .mockReturnValueOnce('fresh')
            .mockRejectedValueOnce(error)
            .mockReturnValueOnce('fresh');
        const loader = jest.fn().mockResolvedValueOnce('fresh');
        const cache = AdaptedCache.transformValues(mockCache, (value: string) => value, outputTransformer);

        await expect(cache.get('key', loader)).resolves.toBe('fresh');

        expect(mockCache.delete).toHaveBeenCalledWith('key');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should reuse rejected transformations only within the current invocation', async () => {
        mockCache.get.mockImplementation(async (key, cacheLoader) => {
            try {
                return await cacheLoader(key);
            } catch {
                return 'malformed';
            }
        });

        const error = new Error('Failed to transform loaded value');
        const outputTransformer = jest.fn(() => {
            throw error;
        });
        const loader = jest.fn().mockResolvedValue('fresh');
        const cache = AdaptedCache.transformValues(mockCache, (value: string) => value, outputTransformer);

        await expect(cache.get('key', loader)).rejects.toBe(error);
        expect(loader).toHaveBeenCalledTimes(1);

        await expect(cache.get('key', loader)).rejects.toBe(error);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should propagate shared freshly loaded deserialization errors without retrying', async () => {
        const deserializationError = new Error('Failed to deserialize shared loaded value');
        const inputTransformer = jest.fn((value: string) => value);
        const outputTransformer = jest.fn(() => {
            throw deserializationError;
        });
        const sharedCache = new SharedInFlightCache(mockCache);
        const cache = AdaptedCache.transformValues(sharedCache, inputTransformer, outputTransformer);

        let resolveLoader!: (value: string) => void;
        let markLoaderStarted!: () => void;
        const loaderStarted = new Promise<void>(resolve => {
            markLoaderStarted = resolve;
        });
        const firstLoader = jest.fn(
            () => new Promise<string>(resolve => {
                resolveLoader = resolve;
                markLoaderStarted();
            }),
        );
        const secondLoader = jest.fn();

        mockCache.get.mockImplementation((_key, cacheLoader) => cacheLoader('key'));

        const firstRequest = cache.get('key', firstLoader);

        await loaderStarted;

        const secondRequest = cache.get('key', secondLoader);

        resolveLoader('malformed');

        await expect(Promise.allSettled([firstRequest, secondRequest])).resolves.toStrictEqual([
            {status: 'rejected', reason: deserializationError},
            {status: 'rejected', reason: deserializationError},
        ]);

        expect(mockCache.delete).not.toHaveBeenCalled();
        expect(firstLoader).toHaveBeenCalledTimes(1);
        expect(secondLoader).not.toHaveBeenCalled();
    });

    it('should recover a malformed cached value while background revalidation is pending', async () => {
        const now = Instant.ofEpochMilli(12345);
        const inner = new InMemoryCache<TimestampedCacheEntry<string>>();
        const staleCache = new StaleWhileRevalidateCache({
            cacheProvider: inner,
            freshPeriod: 10,
            clock: FixedClock.of(now, TimeZone.UTC),
        });

        const outputTransformer = (value: string): string => {
            if (value === 'malformed') {
                throw new Error('Failed to deserialize cached value');
            }

            return value;
        };
        const cache = AdaptedCache.transformValues(staleCache, (value: string) => value, outputTransformer);

        await inner.set('key', {
            value: 'malformed',
            timestamp: now.plusSeconds(-11),
        });

        let resolveLoader!: (value: string) => void;
        let markLoaderStarted!: () => void;
        const loaderStarted = new Promise<void>(resolve => {
            markLoaderStarted = resolve;
        });
        const loader = jest.fn(
            () => new Promise<string>(resolve => {
                resolveLoader = resolve;
                markLoaderStarted();
            }),
        );

        let markRecoveryStarted!: () => void;
        const recoveryStarted = new Promise<void>(resolve => {
            markRecoveryStarted = resolve;
        });
        const deleteEntry = inner.delete.bind(inner);

        jest.spyOn(inner, 'delete').mockImplementation(async key => {
            await deleteEntry(key);
            markRecoveryStarted();
        });

        const request = cache.get('key', loader);

        await Promise.all([loaderStarted, recoveryStarted]);
        resolveLoader('fresh');

        await expect(request).resolves.toBe('fresh');
        await expect(cache.get('key', jest.fn())).resolves.toBe('fresh');

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should recover concurrent calls independently without a coordinating wrapper', async () => {
        mockCache.get
            .mockResolvedValueOnce('malformed')
            .mockResolvedValueOnce('malformed')
            .mockImplementation((key, loader) => loader(key));

        const cache = AdaptedCache.transformValues(
            mockCache,
            AdaptedCache.jsonSerializer<string>(),
            AdaptedCache.jsonDeserializer<string>(),
        );
        const firstLoader = jest.fn().mockResolvedValue('first');
        const secondLoader = jest.fn().mockResolvedValue('second');

        const results = await Promise.all([
            cache.get('key', firstLoader),
            cache.get('key', secondLoader),
        ]);

        expect(results).toStrictEqual(['first', 'second']);
        expect(firstLoader).toHaveBeenCalledTimes(1);
        expect(secondLoader).toHaveBeenCalledTimes(1);
    });

    it('should share malformed entry recovery when wrapped in a shared in-flight cache', async () => {
        const inner = new InMemoryCache<string>();
        const adaptedCache = AdaptedCache.transformValues(
            new AutoSaveCache(inner),
            AdaptedCache.jsonSerializer<string>(),
            AdaptedCache.jsonDeserializer<string>(),
        );
        const cache = new SharedInFlightCache(adaptedCache);

        await inner.set('key', 'malformed');

        let resolveLoader!: (value: string) => void;
        let markLoaderStarted!: () => void;
        const loaderStarted = new Promise<void>(resolve => {
            markLoaderStarted = resolve;
        });
        const loader = jest.fn()
            .mockImplementationOnce(
                () => new Promise<string>(resolve => {
                    resolveLoader = resolve;
                    markLoaderStarted();
                }),
            )
            .mockResolvedValue('fresh');

        const firstRequest = cache.get('key', loader);
        const secondRequest = cache.get('key', loader);

        await loaderStarted;
        resolveLoader('fresh');

        await expect(firstRequest).resolves.toBe('fresh');

        await expect(secondRequest).resolves.toBe('fresh');
        await expect(cache.get('key', jest.fn())).resolves.toBe('fresh');

        expect(loader).toHaveBeenCalledTimes(1);

        await inner.set('key', 'malformed');

        await expect(cache.get('key', loader)).resolves.toBe('fresh');

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should apply the value input transformer on loader value', async () => {
        mockCache.get.mockImplementation((key, loader) => loader(key));

        const inputTransformer = jest.fn().mockReturnValueOnce('transformedInput');
        const outputTransformer = jest.fn().mockReturnValue('transformedOutput');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key', loader);

        expect(inputTransformer).toHaveBeenCalledWith('loaderValue');
        expect(outputTransformer).toHaveBeenCalledTimes(2);
        expect(outputTransformer).toHaveBeenNthCalledWith(1, 'transformedInput');
        expect(outputTransformer).toHaveBeenNthCalledWith(2, 'transformedInput');
        expect(loader).toHaveBeenCalledWith('key');
        expect(result).toBe('transformedOutput');
    });

    it('should apply the value input transformer when setting a value', async () => {
        const inputTransformer = jest.fn().mockReturnValueOnce('transformed');
        const outputTransformer = jest.fn();

        mockCache.set.mockResolvedValueOnce();

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        await cache.set('key', 'value');

        expect(inputTransformer).toHaveBeenCalledWith('value');
        expect(outputTransformer).not.toHaveBeenCalled();
        expect(mockCache.set).toHaveBeenCalledWith('key', 'transformed');
    });

    it('should transform a value into a hash-able string', () => {
        const transformer = AdaptedCache.createHashSerializer('passthrough');

        const value = {
            some: {
                deeply: {
                    nested: [
                        'value',
                    ],
                },
            },
            with: 1,
            multiple: true,
            keys: null,
            andTypes: [
                'string',
                1,
                true,
                null,
            ],
        };

        const result = transformer(value);

        expect(result).toBe('{andTypes:[string,1,1,],keys:,multiple:1,some:{deeply:{nested:[value]}},with:1}');
    });

    it('should transform a value into a hash', () => {
        const transformer = AdaptedCache.createHashSerializer('md5');

        const value = {
            some: {
                deeply: {
                    nested: [
                        'value',
                    ],
                },
            },
            with: 1,
            multiple: true,
            keys: null,
            andTypes: [
                'string',
                1,
                true,
                null,
            ],
        };

        const result = transformer(value);

        expect(result).toBe('oDA+C/1fqcOT90c6vwhaWg==');
    });

    it('should transform a value into its JSON representation', () => {
        const transformer = AdaptedCache.jsonSerializer();

        const value = {
            foo: 'bar',
            bar: 'baz',
        };

        const result = transformer(value);

        expect(result).toBe('{"foo":"bar","bar":"baz"}');
    });

    it('should transform a JSON representation back into its original form', () => {
        const transformer = AdaptedCache.jsonDeserializer();

        const value = {
            foo: 'bar',
            bar: 'baz',
        };

        const input = JSON.stringify(value);

        const result = transformer(input);

        expect(result).toStrictEqual(value);
    });

    it('should support async transformation', async () => {
        const keyTransformer = jest.fn().mockResolvedValue('transformed');
        const inputTransformer = jest.fn().mockResolvedValue('inputTransformed');
        const outputTransformer = jest.fn().mockResolvedValue('outputTransformed');
        const adaptedCache = new AdaptedCache({
            cache: mockCache,
            keyTransformer: keyTransformer,
            valueInputTransformer: inputTransformer,
            valueOutputTransformer: outputTransformer,
        });

        await adaptedCache.set('key', 'value');

        expect(keyTransformer).toHaveBeenCalledWith('key');
        expect(inputTransformer).toHaveBeenCalledWith('value');
        expect(mockCache.set).toHaveBeenCalledWith('transformed', 'inputTransformed');

        const loader = jest.fn();

        mockCache.get.mockResolvedValue('output');

        const result = await adaptedCache.get('key', loader);

        expect(outputTransformer).toHaveBeenCalledWith('output');
        expect(result).toBe('outputTransformed');
    });
});
