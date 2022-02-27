# Basic usage 

The basic use case of this library is for cached implementations of interfaces. For example:

```typescript
import {DataCache} from '@croct-tech/cache';

interface Foo {
    performBar(params: Record<string, string>): Promise<string>;
}

class CachedFoo implements Foo {
    private cache: DataCache<string>;
    
    private readonly foo: Foo;

    constructor(cache: DataCache<Record<string, string>, string>, foo: Foo) {
        this.cache = cache;
        this.foo = foo;
    }

    public async performBar(params: Record<string, string>): Promise<string> {
        const cachedValue = await this.cache.get(params);

        if (cachedValue) {
            return cachedValue;
        }

        const value = await this.foo.performBar(params)

        await this.cache.set(params, value);

        return value;
    }
}
```

For the complete docs of the API see [the reference](./api.md)

# Implementation

This library provides the following implementations of `DataCache`:

- `NoopCache`: A no-op implementation that does nothing, support any data type for both keys and values.
- `InMemoryCache`: A simple in-memory cache implementation, support string keys and any data type for values.
- `PrefixedCache`: A cache wrapper that prefixes all keys with a string.
- `TransformerCache`: A cache wrapper that can transform keys and values before accessing and modifying them.  
  This can be used to implement a cache that uses a different key or value type than the one used by the wrapped cache.
  
  Transformers provided:
  - `createHashSerializer`: Creates a serializer that hashes any object.
  - `jsonSerializer`: Creates a serializer that serializes any object to a JSON string. This is a typed wrapper around `JSON.stringify`.
  - `jsonDeserializer`: Creates a deserializer that deserializes a JSON string into a `JsonValue`. This is a typed wrapper around `JSON.parse`.

- `RedisDataCache`: A cache implementation using Redis, support only string keys and values.  
  Using this implementation requires the `ioredis` package to be installed.
