# Basic usage 

The most common use case of this library is to decorate an implementation with a cache like so:

```typescript
import {CacheProvider} from './cacheProvider';

type Parameter = { /* ... */ };
type Result = { /* ... */ };

class Cached {
    private cache: CacheProvider<Parameter, Result>;
    
    private doSomethingInner(parameter: Parameter): Promise<Result> {
      // Some expensive and/or slow operation
    }
    
    public async doSomething(parameter: Parameter): Promise<Result> {
      return this.cache.get(parameter, this.doSomethingInner.bind(this));
    }
}
```

See an example of a cached repository [here](examples/src/1_simpleCaching.ts).

# Methods

The cache API provided by this library defined as the interface `CacheProvider<K, V>`, where `K` is the
type of the key used to identify the cached value, and `V` is the type of the value to be cached.

The interface provides the following methods:

## GET

```typescript
type CacheLoader<K, V> = (key: K) => Promise<V>;

interface CacheProvider<K, V> {
  get(key: K, loader: CacheLoader<K, V>): Promise<V>;
}
```

The `get` method accepts a key and a loader function that can be called to retrieve a new, fresh, value.
When and how the function is called is up to the cache implementation. It is also up to the implementation
to automatically cache the loaded value or not, see [Implementations](#implementations) to know which ones
do and do not auto-cache.

See an example of a cached read-only repository [here](examples/src/1_simpleCaching.ts) using this method.

## DELETE

```typescript
interface CacheProvider<K, V> extends CacheProvider<K, V> {
  delete(key: K): Promise<void>;
}
```

The `delete` method accepts a key and removes the corresponding value from the cache.

See an example of a cached repository [here](examples/src/2_erasableCaching.ts) using this method.

## SET

```typescript
interface CacheProvider<K, V> extends CacheProvider<K, V> {
  set(key: K, value: V): Promise<void>;
}
```

The `set` method accepts a key and a value and sets the corresponding value in the cache,
overriding any previous entry present in the cache regardless of whether it was set manually or automatically.

Normally you won't need to use this method to cache a value on a read operation. You can count on the cache itself
to save the value automatically when it uses the loader. This way you can define the strategy for caching in the
wiring of the application. You can also not wire an auto-save strategy and have the cache only return values cached manually.

See an example of a manually cached repository [here](examples/src/3_manualCaching.ts) using this method.

# Implementations

This library provides implementations of:
- Final cache providers backed by some data structure or service
- Data and key manipulation wrappers
- Auto-caching strategy implementations

## Final cache providers

- `NoopCache`: A no-op implementation that does nothing, it supports any data type for both keys and values.
- `InMemoryCache`: A simple in-memory cache implementation, support string keys and any data type for values.
- `RedisDataCache`: A cache implementation using Redis, support only string keys and values.  
  Using this implementation requires the `ioredis` package to be installed.

## Data and key manipulation

- `PrefixedCache`: A cache wrapper that prefixes all keys with a string.
- `AdaptedCache`: A cache wrapper that can adapt a typed `CacheProvider<K, V>` into a `CacheProvider<IK, IV>` by
  transforming keys and values.
  
  Transformers provided:
  - `createHashSerializer`: Serializes any object into a hash, the hash may use an irreversible algorithm.
  - `jsonSerializer`: Serializes any object to a JSON string. This is a typed wrapper around `JSON.stringify`.
  - `jsonDeserializer`: Deserializes a JSON string into a `JsonValue`. This is a typed wrapper around `JSON.parse`.
  
## Auto-caching strategy

- `HoldWhileRevalidateCache`: A cache wrapper that automatically caches the result of a loader function for a set
  expiration time. Once the cache expires, the next `get` call will wait until the result of the loader function is 
  resolved.
- `StaleWhileRevalidateCache`: A cache wrapper that automatically caches the result of a loader function for a set
  expiration time. Once the cache expires, the next `get` call will still return the cached value and add a separate
  background task in the event-loop calling the loader function and caching its result.
