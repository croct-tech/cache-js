<p align="center">
    <a href="https://croct.com">
        <img src="https://cdn.croct.io/brand/logo/repo-icon-green.svg" alt="Croct" height="80"/>
    </a>
    <br />
    <strong>Cache</strong>
    <br />
    An abstraction layer for caching strategies.
</p>
<p align="center">
    <img alt="Build" src="https://github.com/croct-tech/cache-js/actions/workflows/validate-branch.yaml/badge.svg" />
    <a href="https://codeclimate.com/repos/621adab1f58476018c0002f1/test_coverage"><img src="https://api.codeclimate.com/v1/badges/44752b2e8f1f990799da/test_coverage" /></a>
    <a href="https://codeclimate.com/repos/621adab1f58476018c0002f1/maintainability"><img src="https://api.codeclimate.com/v1/badges/44752b2e8f1f990799da/maintainability" /></a>
    <br />
    <br />
    <a href="https://github.com/croct-tech/cache-js/releases">📦Releases</a>
    ·
    <a href="https://github.com/croct-tech/cache-js/issues/new?labels=bug&template=bug-report.md">🐞Report Bug</a>
    ·
    <a href="https://github.com/croct-tech/cache-js/issues/new?labels=enhancement&template=feature-request.md">✨Request Feature</a>
</p>

## Installation

We recommend using [NPM](https://www.npmjs.com) to install the package:

```sh
npm install @croct-tech/cache
```

## Basic usage 

The most common use case of this library is to decorate implementations with caching capabilities:

```ts
import {CacheProvider} from '@croct/cache';

class CachedService implements Service {
    private cache: CacheProvider<string, object>;
    
    private service: Service;
    
    public constructor(service: Service) {
        this.service = service;
        this.cache = new CacheProvider();
    }
    
    public load(key: string): Promise<object> {
        return this.cache.get(key, () => this.service.load(key));
    }
}
```

## Methods

The [`CacheProvider<K, V>`](src/cacheProvider.ts) interface is the main interface of this library. 
The generic parameter `K` is the type of the key that identifies the cached value and `V` is the type 
of the value to be cached.

It defines the following methods:

### Get

The `get` method accepts a key and a loader function that's called to retrieve a new, fresh, value.

When and how the function is called is up to the cache implementation. It is also up to the implementation
to automatically cache the loaded value or not, see [Implementations](#implementations) for more information
about to know which implementations do and do not auto-cache.

The following example shows how to use the `get` method:

```ts
const cache = new InMemoryCache<string, number>();

console.assert((await cache.get('key', () => 42)) === 42);
```

### Set

The `set` method accepts a key and a value and sets the corresponding value in the cache, overriding
any previous entry present in the cache regardless of whether it was set manually or automatically.

Normally you won't need to use this method to cache a value on a read operation. Delegating the caching
to the `get` method is the recommended way to achieve this. This way you can define the strategy for
caching in the wiring of the application.

The example below shows how to use the `set` method:

```ts
const cache = new InMemoryCache<string, number|null>();

await cache.set('key', 42);

console.assert((await cache.get('key', () => null)) === 42);

await cache.set('key', 43);

console.assert((await cache.get('key', () => null)) === 43);
```

### Delete

The `delete` method takes a key and removes the corresponding value from the cache.

Here's an example of how to delete a value from the cache:

```ts
const cache = new InMemoryCache<string, number|null>();

await cache.set('key', 42);

console.assert((await cache.get('key', () => null)) === 42);

await cache.delete('key');

console.assert((await cache.get('key', () => null)) === null);
```

## Implementations

This library ships with a few `CacheProvider` implementations, including:

- Standalone providers
- Adapters for key and value transformation
- Auto-caching strategies
- Behavior strategies

### Standalone providers

- [`NoopCache`](src/noop.ts): A no-op implementation that does not cache anything, suitable for testing. 
  Supports any key and value type.
- [`InMemoryCache`](src/inMemory.ts): A simple in-memory cache implementation.
  Supports string keys and any data type for values.
- [`LruCache`](src/lruCache.ts): An in-memory Least Recently Used (LRU) cache implementation.
  Like the simple in-memory cache, supports string keys and any data type for values.

### Data and key manipulation

- [`PrefixedCache`](src/prefixed.ts): A cache wrapper that prefixes all keys with a string.
- [`AdaptedCache`](src/adapted.ts): A cache wrapper that adapts a typed `CacheProvider<K, V>` into a 
`CacheProvider<IK, IV>` by transforming keys and values. Available transformers:
     - `AdaptedCache.createHashSerializer`: Serializes any object into a hash. This is typically used to transform keys into strings.
     - `AdaptedCache.jsonSerializer`: Serializes any object to a JSON string. This is a typed wrapper around `JSON.stringify`.
     - `AdaptedCache.jsonDeserializer`: Deserializes a JSON string into a `JsonValue`. This is a typed wrapper around `JSON.parse`.
  
### Auto-caching strategies

- [`AutoSaveCache`](src/autoSave.ts): A cache wrapper that automatically caches the result of a loader function.
- [`HoldWhileRevalidateCache`](src/holdWhileRevalidate.ts): A cache wrapper that automatically caches the result of a 
loader function for the expiration period that you configure. Once the cache expires, subsequent calls to the `get`
method will wait until the result of the loader function is resolved.
- [`StaleWhileRevalidateCache`](src/staleWhileRevalidate.ts): A cache wrapper that automatically caches the result 
of a loader function for the expiration period that you configure. Once the cache expires, the next `get` call will 
still return the cached value while the loader function is being resolved in the background.
- [`SharedInFlightCache`](src/sharedInFlight.ts): A cache that ensures there is no concurrent get requests for a key to the underlying cache.

### Behavior strategies

- [`ErrorResilientCache`](src/errorResilient.ts): A cache wrapper that suppresses and logs errors from the underlying cache. Consumers can then assume that the cache never fails.

## Contributing

Contributions to the package are always welcome! 

- Report any bugs or issues on the [issue tracker](https://github.com/croct-tech/cache-js/issues).
- For major changes, please [open an issue](https://github.com/croct-tech/cache-js/issues) first to discuss what you would like to change.
- Please make sure to update tests as appropriate.

## Testing

Before running the test suites, the development dependencies must be installed:

```sh
npm install
```

Then, to run all tests:

```sh
npm run test
```

Run the following command to check the code against the style guide:

```sh
npm run lint
```

## Building

Before building the project, the dependencies must be installed:

```sh
npm install
```

The following command builds the library:

```sh
npm run build
```

## License

Copyright © 2015-2021 Croct Limited, All Rights Reserved.

All information contained herein is, and remains the property of Croct Limited. The intellectual, design and technical concepts contained herein are proprietary to Croct Limited s and may be covered by U.S. and Foreign Patents, patents in process, and are protected by trade secret or copyright law. Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained from Croct Limited.
