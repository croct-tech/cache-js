import {Instant} from '@croct-tech/time';
import {CacheSetOptions, DataCache, TransformerCache} from '../src';

describe('A cache wrapper that can transform keys and values', () => {
    const mockCache: jest.MockedObject<DataCache<string, string>> = {
        get: jest.fn(),
        getStale: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should apply the key transformer when getting a value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.get.mockResolvedValueOnce('value');

        const cache = TransformerCache.transformKey(mockCache, transformer);

        const result = await cache.get('key');

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.get).toHaveBeenCalledWith('transformed');
        expect(result).toBe('value');
    });

    it('should apply the key transformer when getting a possibly stale value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.getStale.mockResolvedValueOnce({
            value: 'value',
            expirationTime: null,
        });

        const cache = TransformerCache.transformKey(mockCache, transformer);

        const result = await cache.getStale('key');

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.getStale).toHaveBeenCalledWith('transformed');
        expect(result).toStrictEqual({
            value: 'value',
            expirationTime: null,
        });
    });

    it('should apply the key transformer when setting a value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.set.mockResolvedValueOnce();

        const cache = TransformerCache.transformKey(mockCache, transformer);

        const options: CacheSetOptions = {
            ttl: 1000,
            staleWindow: 2000,
        };

        await cache.set('key', 'value', options);

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.set).toHaveBeenCalledWith('transformed', 'value', options);
    });

    it('should apply the key transformer when deleting a value', async () => {
        const transformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.delete.mockResolvedValueOnce();

        const cache = TransformerCache.transformKey(mockCache, transformer);

        await cache.delete('key');

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.delete).toHaveBeenCalledWith('transformed');
    });

    it('should apply the value output transformer when getting a value', async () => {
        const inputTransformer = jest.fn();
        const outputTransformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.get.mockResolvedValueOnce('value');

        const cache = TransformerCache.transformValue(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key');

        expect(inputTransformer).not.toHaveBeenCalled();
        expect(outputTransformer).toHaveBeenCalledWith('value');
        expect(mockCache.get).toHaveBeenCalledWith('key');
        expect(result).toBe('transformed');
    });

    it('should apply the value output transformer when getting a possibly stale value', async () => {
        const inputTransformer = jest.fn();
        const outputTransformer = jest.fn().mockReturnValueOnce('transformed');

        mockCache.getStale.mockResolvedValueOnce({
            value: 'value',
            expirationTime: Instant.fromEpochMillis(1234),
        });

        const cache = TransformerCache.transformValue(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.getStale('key');

        expect(inputTransformer).not.toHaveBeenCalled();
        expect(outputTransformer).toHaveBeenCalledWith('value');
        expect(mockCache.getStale).toHaveBeenCalledWith('key');
        expect(result).toStrictEqual({
            value: 'transformed',
            expirationTime: Instant.fromEpochMillis(1234),
        });
    });

    it('should apply the value input transformer when setting a value', async () => {
        const inputTransformer = jest.fn().mockReturnValueOnce('transformed');
        const outputTransformer = jest.fn();

        mockCache.set.mockResolvedValueOnce();

        const cache = TransformerCache.transformValue(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const options: CacheSetOptions = {
            ttl: 1000,
            staleWindow: 2000,
        };

        await cache.set('key', 'value', options);

        expect(inputTransformer).toHaveBeenCalledWith('value');
        expect(outputTransformer).not.toHaveBeenCalled();
        expect(mockCache.set).toHaveBeenCalledWith('key', 'transformed', options);
    });

    it('should transform a value into a hash', () => {
        const transformer = TransformerCache.createHashSerializer('md5');

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

        expect(result).toBe('DB8pVafUNdepTqZc8eE5qw==');
    });

    it('should transform a value into its JSON representation', () => {
        const transformer = TransformerCache.jsonSerializer();

        const value = {
            foo: 'bar',
            bar: 'baz',
        };

        const result = transformer(value);

        expect(result).toBe('{"foo":"bar","bar":"baz"}');
    });

    it('should transform a JSON representation back into its original form', () => {
        const transformer = TransformerCache.jsonDeserializer();

        const value = {
            foo: 'bar',
            bar: 'baz',
        };

        const input = JSON.stringify(value);

        const result = transformer(input);

        expect(result).toStrictEqual(value);
    });
});
