import {Instant} from '@croct/time';
import {JsonCompatible, JsonValue} from '@croct/json';

/**
 * A cache entry associated with a timestamp.
 */
export type TimestampedCacheEntry<T> = Readonly<{
    /**
     * The cached value.
     */
    value: T,

    /**
     * The cache timestamp.
     *
     * Semantics and usage are implementation-specific.
     */
    timestamp: Instant,
}>;

export namespace TimestampedCacheEntry {
    export function toJSON<T extends JsonCompatible>(entry: TimestampedCacheEntry<T>): string {
        return JSON.stringify({
            value: entry.value,
            timestamp: entry.timestamp.toEpochMillis(),
        });
    }

    export function fromJSON<T extends JsonValue>(json: string): TimestampedCacheEntry<T> {
        const jsonEntry: JsonValue = JSON.parse(json);

        if (
            jsonEntry === null
            || typeof jsonEntry !== 'object'
            || Array.isArray(jsonEntry)
            || jsonEntry.value === undefined
            || typeof jsonEntry.timestamp !== 'number'
            || !Number.isSafeInteger(jsonEntry.timestamp)
        ) {
            throw new Error('Invalid JSON representation of TimestampedCacheEntry.');
        }

        return {
            value: jsonEntry.value as T,
            timestamp: Instant.ofEpochMilli(jsonEntry.timestamp),
        };
    }
}
