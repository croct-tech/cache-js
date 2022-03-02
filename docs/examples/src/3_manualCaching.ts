import {CacheLoader, InMemoryCache, OverridableCacheProvider} from '../../../src';

type Foo = {
    value: string,
    accessTime: number,
};

interface FooRepository {
    get(id: string): Promise<Foo>;

    set(id: string, value: Foo): Promise<void>;

    delete(id: string): Promise<void>;
}

class RandomRepository implements FooRepository {
    public get(id: string): Promise<Foo> {
        console.log(`Getting ${id} from random repository`);

        return Promise.resolve({
            value: id,
            accessTime: Date.now(),
        });
    }

    public set(id: string): Promise<void> {
        console.log(`Setting ${id} on random repository`);

        return Promise.resolve();
    }

    public delete(id: string): Promise<void> {
        console.log(`Deleting ${id} from random repository`);

        return Promise.resolve();
    }
}

class CachedRepository implements FooRepository {
    private readonly repository: FooRepository;

    private readonly cache: OverridableCacheProvider<string, Foo>;

    public constructor(
        repository: FooRepository,
        cache: OverridableCacheProvider<string, Foo>,
    ) {
        this.repository = repository;
        this.cache = cache;
    }

    private get cacheLoader(): CacheLoader<string, Foo> {
        return async key => {
            const value = await this.repository.get(key);

            // Manually cache value on cacheLoader
            await this.cache.set(key, value);

            return value;
        };
    }

    public get(id: string): Promise<Foo> {
        console.log(`Getting ${id} from cached repository`);

        return this.cache.get(id, this.cacheLoader);
    }

    public async set(id: string, value: Foo): Promise<void> {
        console.log(`Setting ${id} on cached repository`);

        await this.repository.set(id, value);

        // Manually cache the new value
        await this.cache.set(id, value);
    }

    public async delete(id: string): Promise<void> {
        console.log(`Deleting ${id} from random repository`);

        await Promise.all([
            this.repository.delete(id),
            this.cache.delete(id),
        ]);
    }
}

async function main(): Promise<void> {
    const randomRepository = new RandomRepository();

    const cache = new InMemoryCache();

    const cachedRepository = new CachedRepository(randomRepository, cache);

    const foo = await cachedRepository.get('foo');

    console.log(foo);

    const foo2 = await cachedRepository.get('foo');

    console.log(foo2);

    await cachedRepository.set('foo', {
        value: 'bar',
        accessTime: Date.now(),
    });

    const foo3 = await cachedRepository.get('foo');

    console.log(foo3);
}

main().catch(console.error);
