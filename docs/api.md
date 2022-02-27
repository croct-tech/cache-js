## Getting cached data

### Fresh data

The `get` method returns a Promise that will either resolve to a values that was cached and has not expired or to `null`
if no data was saved or has already expired.

```typescript
async function process(cache: DataCache<string, string>): Promise<void> {
    const data = await cache.get('key');
    if (data === null) {
        // No data was cached, or it has expired
    } else {
        // Data was cached and has not expired
    }
}
```

### Stale data

Sometimes it is useful to get the data even if it has expired. This allows 
The `getStale` method returns a Promise that will either resolve to:

- `null` if the data is not available on the cache
- a value with no `expirationTime` that was cached and has not expired
- a value with an `expirationTime` that was cached and has expired, but has not been removed yet

```typescript
async function process(cache: DataCache<string, string>): Promise<void> {
    const data = await cache.getStale('key');
    if (data === null) {
        // No data was cached, or it has expired
        // Retrieve fresh data
    } else if (data.expirationTime === null) {
        // Data was cached and has not expired
        // Use cached data
    } else {
        // Data was cached and has expired
        // Use stale data while revalidating
    }
}
```

## Setting data

The `set` method saves the data into the cache.

```typescript
async function process(cache: DataCache<string, string>): Promise<void> {
    await cache.set('key', 'value'); // Use cache implementation default ttl and stale window
    
    // Or
    
    await cache.set('key', 'value', {
        ttl: 1000, // Time to live in seconds
        staleWindow: 1000 // Stale window in seconds
    });
}
```

## Deleting data

The `delete` method deletes the data from the cache. Implementations should not return the deleted data even as stale on `getStale`.

```typescript
async function process(cache: DataCache<string, string>): Promise<void> {
    await cache.delete('key');
}
```
