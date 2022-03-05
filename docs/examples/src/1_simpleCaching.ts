import {CacheLoader, CacheProvider, HoldWhileRevalidateCache, InMemoryCache} from '../../../src';

type Foo = {
    value: string,
    accessTime: number,
};

interface FooRepository {
    get(id: string): Promise<Foo>;
}

class RandomRepository implements FooRepository {
    public get(id: string): Promise<Foo> {
        console.log(`Getting ${id} from random repository`);

        return Promise.resolve({
            value: id,
            accessTime: Date.now(),
        });
    }
}

class CachedRepository implements FooRepository {
    private readonly repository: FooRepository;

    private readonly cache: CacheProvider<string, Foo>;

    public constructor(
        repository: FooRepository,
        cache: CacheProvider<string, Foo>,
    ) {
        this.repository = repository;
        this.cache = cache;
    }

    private get cacheLoader(): CacheLoader<string, Foo> {
        return key => this.repository.get(key);
    }

    public get(id: string): Promise<Foo> {
        console.log(`Getting ${id} from cached repository`);

        return this.cache.get(id, this.cacheLoader);
    }
}

async function main(): Promise<void> {
    const randomRepository = new RandomRepository();

    const cache = new HoldWhileRevalidateCache<string, Foo>({
        cacheProvider: new InMemoryCache(),
        maxAge: 1,
    });

    const cachedRepository = new CachedRepository(randomRepository, cache);

    const foo = await cachedRepository.get('foo');

    console.log(foo);

    await new Promise(resolve => { setTimeout(resolve, 500); });

    const foo2 = await cachedRepository.get('foo');

    console.log(foo2);

    await new Promise(resolve => { setTimeout(resolve, 500); });

    const foo3 = await cachedRepository.get('foo');

    console.log(foo3);
}

main().catch(console.error);
