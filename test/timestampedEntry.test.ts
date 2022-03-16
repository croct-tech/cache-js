import {Instant} from '@croct-tech/time';
import {JsonValue} from '@croct/json';
import {TimestampedCacheEntry} from '../src';

describe('A cache entry associated with a timestamp', () => {
    it('should be convertible to and from a JSON string', () => {
        const entry: TimestampedCacheEntry<{foo: string, bar: number}> = {
            value: {
                foo: 'some value',
                bar: 123,
            },
            timestamp: Instant.parse('2015-08-31T12:34:56Z'),
        };

        const jsonString = TimestampedCacheEntry.toJSON(entry);

        const parsedEntry = TimestampedCacheEntry.fromJSON(jsonString);

        expect(parsedEntry).toStrictEqual(entry);
    });

    it.each<[string, JsonValue]>(Object.entries<JsonValue>({
        'a null value': null,
        'a string': 'some value',
        'a number': 123,
        'a boolean': true,
        'an array': [1, 2, 3],
        'an object without a value': {timestamp: 123456},
        'an object without a timestamp': {value: 'foo'},
        'an object without an invalid timestamp type': {value: 'foo', timestamp: 'bar'},
        'an object without an invalid timestamp value': {value: 'foo', timestamp: Number.MAX_VALUE},
    }))('should fail to parse %s', (_, data) => {
        const jsonString = JSON.stringify(data);

        expect(() => TimestampedCacheEntry.fromJSON(jsonString))
            .toThrow('Invalid JSON representation of TimestampedCacheEntry.');
    });
});
