import {
    CacheLoader,
    ErasableCacheProvider,
    HoldWhileRevalidateCache,
    InMemoryCache,
} from '../../../src';

type Foo = {
    value: string,
    accessTime: number,
};

interface FooRepository {
    get(id: string): Promise<Foo>;

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

    public delete(id: string): Promise<void> {
        console.log(`Deleting ${id} from random repository`);

        return Promise.resolve();
    }
}

class CachedRepository implements FooRepository {
    private readonly repository: FooRepository;

    private readonly cache: ErasableCacheProvider<string, Foo>;

    public constructor(
        repository: FooRepository,
        cache: ErasableCacheProvider<string, Foo>,
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

    public async delete(id: string): Promise<void> {
        console.log(`Deleting ${id} from cached repository`);

        await Promise.all([
            this.repository.delete(id),
            this.cache.delete(id),
        ]);
    }
}

async function main(): Promise<void> {
    const randomRepository = new RandomRepository();

    const cache = new HoldWhileRevalidateCache<string, Foo>({
        cacheProvider: new InMemoryCache(),
        maxAge: 100,
    });

    const cachedRepository = new CachedRepository(randomRepository, cache);

    const foo = await cachedRepository.get('foo');

    console.log(foo);

    const foo2 = await cachedRepository.get('foo');

    console.log(foo2);

    await cachedRepository.delete('foo');

    const foo3 = await cachedRepository.get('foo');

    console.log(foo3);
}

main().catch(console.error);
