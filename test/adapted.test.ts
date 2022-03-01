import {AdaptedCache, OverridableCacheProvider} from '../src';

describe('A cache adapter that can transform keys and values', () => {
    const mockCache: jest.MockedObject<OverridableCacheProvider<string, string>> = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
    };

    it('should apply the key transformer when getting a value', async () => {
        mockCache.get.mockImplementation((key, fallback) => fallback(key));

        const transformer = jest.fn().mockReturnValueOnce('transformed');

        const fallback = jest.fn().mockResolvedValue('value');

        const cache = AdaptedCache.transformKeys(mockCache, transformer);

        const result = await cache.get('key', fallback);

        expect(transformer).toHaveBeenCalledWith('key');
        expect(mockCache.get).toHaveBeenCalledWith('transformed', expect.any(Function));
        expect(fallback).toHaveBeenCalledWith('key');
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

        const fallback = jest.fn();

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key', fallback);

        expect(inputTransformer).not.toHaveBeenCalled();
        expect(outputTransformer).toHaveBeenCalledWith('value');
        expect(result).toBe('transformed');

        expect(fallback).not.toHaveBeenCalled();
    });

    it('should apply the value input transformer on fallback value', async () => {
        mockCache.get.mockImplementation((key, fallback) => fallback(key));

        const inputTransformer = jest.fn().mockReturnValueOnce('transformedInput');
        const outputTransformer = jest.fn().mockReturnValueOnce('transformedOutput');

        const fallback = jest.fn().mockResolvedValue('fallbackValue');

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key', fallback);

        expect(inputTransformer).toHaveBeenCalledWith('fallbackValue');
        expect(outputTransformer).toHaveBeenCalledWith('transformedInput');
        expect(fallback).toHaveBeenCalledWith('key');
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

        expect(result).toBe('DB8pVafUNdepTqZc8eE5qw==');
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
});
