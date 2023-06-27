import {AdaptedCache, CacheProvider} from '../src';

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

    it('should apply the value input transformer on loader value', async () => {
        mockCache.get.mockImplementation((key, loader) => loader(key));

        const inputTransformer = jest.fn().mockReturnValueOnce('transformedInput');
        const outputTransformer = jest.fn().mockReturnValueOnce('transformedOutput');

        const loader = jest.fn().mockResolvedValue('loaderValue');

        const cache = AdaptedCache.transformValues(
            mockCache,
            inputTransformer,
            outputTransformer,
        );

        const result = await cache.get('key', loader);

        expect(inputTransformer).toHaveBeenCalledWith('loaderValue');
        expect(outputTransformer).toHaveBeenCalledWith('transformedInput');
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
