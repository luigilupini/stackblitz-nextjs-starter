import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { PokemonCard, PokemonGrid, PokemonGridSkeleton } from './pokemon-card';
import { ErrorBoundary } from './error-boundary';
import { SearchBox } from './search-box';
import { PokemonPicker, type PokemonDetails } from './pokemon-picker';

const API = 'https://pokeapi.co/api/v2';
const PAGE_SIZE = 12;

type NamedResource = { name: string; url: string };
type PagedList = { count: number; next: string | null; results: NamedResource[] };
type ListItem = { id: number; name: string };
type SearchParams = { q?: string; page?: string; type?: string };

async function pokeApi<T>(url: string): Promise<T> {
  const res = await fetch(url.startsWith('http') ? url : `${API}${url}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`PokéAPI error ${res.status}`);
  return res.json();
}

function toListItem({ name, url }: NamedResource): ListItem {
  return { id: Number(url.split('/').filter(Boolean).pop()), name };
}

async function getPokemonPage(limit: number, offset = 0) {
  const data = await pokeApi<PagedList>(`/pokemon?limit=${limit}&offset=${offset}`);
  return { count: data.count, items: data.results.map(toListItem) };
}

async function getAllPokemon() {
  const all: ListItem[] = [];
  let url: string | null = `/pokemon?limit=500`;
  while (url) {
    const data: PagedList = await pokeApi<PagedList>(url);
    all.push(...data.results.map(toListItem));
    url = data.next;
  }
  return all;
}

async function getTypes() {
  const data = await pokeApi<PagedList>('/type?limit=50');
  return data.results.map((t) => t.name).filter((t) => !['unknown', 'stellar'].includes(t));
}

async function getPokemonByType(type: string) {
  const data = await pokeApi<{ pokemon: { pokemon: NamedResource }[] }>(`/type/${type}`);
  return data.pokemon.map((p) => toListItem(p.pokemon)).filter((p) => p.id < 10000);
}

async function getPokemonDetails(name: string): Promise<PokemonDetails> {
  'use server';
  const p = await pokeApi<{
    id: number;
    name: string;
    height: number;
    weight: number;
    types: { type: NamedResource }[];
    stats: { base_stat: number; stat: NamedResource }[];
  }>(`/pokemon/${encodeURIComponent(name)}`);
  return {
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types.map((t) => t.type.name),
    stats: p.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
  };
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`section-${n}`} className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="card-title">
          <span className="badge badge-primary">Solution {n}</span>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = '', page = '1', type = '' } = await searchParams;

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Next.js Interview</h1>
        <p className="text-base-content/70">Data from PokéAPI</p>
      </header>

      {/* Solution 1 */}
      <Section n={1} title="Server-side data fetching">
        <PokemonList />
      </Section>

      {/* Solution 2 */}
      <Section n={2} title="Streaming & error handling">
        <ErrorBoundary>
          <Suspense fallback={<PokemonGridSkeleton />}>
            <SlowPokemonList />
          </Suspense>
        </ErrorBoundary>
      </Section>

      {/* Solution 3 */}
      <Section n={3} title="Debounced search">
        <SearchBox defaultValue={q} />
        <Suspense key={q} fallback={<PokemonGridSkeleton />}>
          <SearchResults q={q} />
        </Suspense>
      </Section>

      {/* Solution 4 */}
      <Section n={4} title="Pagination & filters">
        <PaginatedList page={Math.max(1, Number(page) || 1)} type={type} />
      </Section>

      {/* Solution 5 */}
      <Section n={5} title="Interactive list item">
        <InteractiveList />
      </Section>
    </>
  );
}

// Solution 1
async function PokemonList() {
  const { items } = await getPokemonPage(PAGE_SIZE);
  return (
    <PokemonGrid>
      {items.map((p) => (
        <PokemonCard key={p.id} id={p.id} name={p.name} />
      ))}
    </PokemonGrid>
  );
}

// Solution 2
async function SlowPokemonList() {
  await new Promise((r) => setTimeout(r, 2000));
  if (Math.random() < 0.3) throw new Error('Failed to load Pokémon');
  const { items } = await getPokemonPage(6, 150);
  return (
    <PokemonGrid>
      {items.map((p) => (
        <PokemonCard key={p.id} id={p.id} name={p.name} />
      ))}
    </PokemonGrid>
  );
}

// Solution 3
async function SearchResults({ q }: { q: string }) {
  if (q.length < 2) return <p className="text-base-content/60">Type at least 2 characters.</p>;
  const matches = (await getAllPokemon()).filter((p) => p.name.includes(q.toLowerCase())).slice(0, PAGE_SIZE);
  if (matches.length === 0) return <p className="text-base-content/60">No results for “{q}”.</p>;
  return (
    <PokemonGrid>
      {matches.map((p) => (
        <PokemonCard key={p.id} id={p.id} name={p.name} />
      ))}
    </PokemonGrid>
  );
}

// Solution 4
async function PaginatedList({ page, type }: { page: number; type: string }) {
  const types = await getTypes();
  let items: ListItem[];
  let total: number;

  if (type) {
    const all = await getPokemonByType(type);
    total = all.length;
    items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const res = await getPokemonPage(PAGE_SIZE, (page - 1) * PAGE_SIZE);
    total = res.count;
    items = res.items;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const href = (p: number) => `/?${new URLSearchParams({ page: String(p), ...(type && { type }) })}`;

  return (
    <>
      <Form action="/" scroll={false} className="flex items-center gap-2">
        <select name="type" defaultValue={type} className="select select-sm capitalize">
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn btn-sm btn-primary">Filter</button>
      </Form>

      <PokemonGrid>
        {items.map((p) => (
          <PokemonCard key={p.id} id={p.id} name={p.name} />
        ))}
      </PokemonGrid>

      <div className="join justify-center">
        <Link scroll={false} href={href(page - 1)} className={`join-item btn btn-sm ${page <= 1 ? 'btn-disabled' : ''}`}>
          «
        </Link>
        <span className="join-item btn btn-sm">
          Page {page} of {totalPages}
        </span>
        <Link
          scroll={false}
          href={href(page + 1)}
          className={`join-item btn btn-sm ${page >= totalPages ? 'btn-disabled' : ''}`}
        >
          »
        </Link>
      </div>
    </>
  );
}

// Solution 5
async function InteractiveList() {
  const { items } = await getPokemonPage(PAGE_SIZE, 24);
  return <PokemonPicker items={items} getDetails={getPokemonDetails} />;
}
