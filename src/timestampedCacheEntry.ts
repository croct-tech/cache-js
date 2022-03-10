import {Instant} from '@croct-tech/time';

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
