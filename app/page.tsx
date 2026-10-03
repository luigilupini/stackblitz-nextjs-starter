/**
 * ============================================================================
 *  NEXT.JS INTERVIEW — SOLUTIONS (interviewer only)
 * ============================================================================
 *  One Server Component page, five sections. Each `Solution N` matches
 *  `Exercise N` in the candidate repo. Comments contain:
 *    - What we expect
 *    - Signals (junior / mid / senior)
 *    - Follow-up questions
 *
 *  Client files created by the solutions:
 *    app/error-boundary.tsx   (Solution 2)
 *    app/search-box.tsx       (Solution 3)
 *    app/pokemon-picker.tsx   (Solution 5)
 *  Shared presentational UI (given to the candidate): app/pokemon-card.tsx
 * ============================================================================
 */

import { Suspense } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { PokemonCard, PokemonGrid, PokemonGridSkeleton } from './pokemon-card';
import { SectionErrorBoundary } from './error-boundary';
import { SearchBox } from './search-box';
import { PokemonPicker, type PokemonDetails } from './pokemon-picker';

// ----------------------------------------------------------------------------
//  PokéAPI — server-side fetch functions
//  Types are intentionally hand-written and minimal (future type-safety exercise:
//  generate from the OpenAPI spec or validate at runtime with Zod).
// ----------------------------------------------------------------------------

const API = 'https://pokeapi.co/api/v2';
const DAY = 60 * 60 * 24;

type NamedResource = { name: string; url: string };
type PagedList = { count: number; next: string | null; previous: string | null; results: NamedResource[] };
type PokemonResponse = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  stats: { base_stat: number; stat: NamedResource }[];
};
type TypeResponse = { pokemon: { pokemon: NamedResource }[] };
type ListItem = { id: number; name: string };

async function pokeApi<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`;
  // PokéAPI data is effectively static -> cache it in Next's Data Cache for a day.
  const res = await fetch(url, { next: { revalidate: DAY }, ...init });
  if (!res.ok) throw new Error(`PokéAPI ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** The list endpoint only returns {name, url}; the id is the last URL segment.
 *  That lets us build the artwork URL without an extra request per Pokémon (no N+1). */
function toListItem({ name, url }: NamedResource): ListItem {
  return { id: Number(url.split('/').filter(Boolean).pop()), name };
}

async function getPokemonPage(limit: number, offset = 0) {
  const data = await pokeApi<PagedList>(`/pokemon?limit=${limit}&offset=${offset}`);
  return { count: data.count, items: data.results.map(toListItem) };
}

async function getPokemon(name: string): Promise<PokemonDetails> {
  const p = await pokeApi<PokemonResponse>(`/pokemon/${name}`);
  // Map to only the fields the UI needs -> smaller RSC payload / props.
  return {
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types.map((t) => t.type.name),
    stats: p.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
  };
}

/** "Walking" the API: follow `next` links until done, with a safety cap. */
async function getAllPokemon(pageSize = 500, maxPages = 10): Promise<ListItem[]> {
  const all: ListItem[] = [];
  let url: string | null = `${API}/pokemon?limit=${pageSize}`;
  for (let page = 0; url && page < maxPages; page++) {
    const data: PagedList = await pokeApi<PagedList>(url);
    all.push(...data.results.map(toListItem));
    url = data.next;
  }
  return all;
}

async function getTypes(): Promise<string[]> {
  const data = await pokeApi<PagedList>('/type?limit=50');
  return data.results.map((t) => t.name).filter((t) => !['unknown', 'shadow', 'stellar'].includes(t));
}

async function getPokemonByType(type: string): Promise<ListItem[]> {
  const data = await pokeApi<TypeResponse>(`/type/${type}`);
  // Filter out alternate forms (ids >= 10000) – they often lack artwork.
  return data.pokemon.map((p) => toListItem(p.pokemon)).filter((p) => p.id < 10000);
}

// Simulates a slow / unreliable backend for Solution 2.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function flaky<T>(fn: () => Promise<T>, { delay = 1500, failRate = 0.25 } = {}) {
  await sleep(delay + Math.random() * 1000);
  if (Math.random() < failRate) throw new Error('Simulated upstream failure (503)');
  return fn();
}

// ----------------------------------------------------------------------------
//  Small helpers
// ----------------------------------------------------------------------------

type SearchParams = Record<string, string | string[] | undefined>;
const param = (sp: SearchParams, key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : '');

/** Build an href that keeps the other sections' params intact. */
function hrefWith(sp: SearchParams, updates: Record<string, string | number | null>, hash: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') params.set(k, v);
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === '') params.delete(k);
    else params.set(k, String(v));
  }
  const qs = params.toString();
  return `/${qs ? `?${qs}` : ''}#${hash}`;
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`solution-${n}`} className="card scroll-mt-6 bg-base-100 shadow">
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

// ============================================================================
//  PAGE
//  Next 15: `searchParams` is a Promise. Reading it makes the page dynamic,
//  which is fine — the fetches themselves are still cached in the Data Cache.
// ============================================================================

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Next.js Interview — Solutions</h1>
        <p className="text-base-content/70">
          Data from{' '}
          <a className="link" href="https://pokeapi.co/docs/v2" target="_blank" rel="noreferrer">
            PokéAPI
          </a>
        </p>
      </header>

      <Section n={1} title="Server-side data fetching">
        <Solution1 />
      </Section>

      <Section n={2} title="Streaming & error handling">
        <SectionErrorBoundary>
          <Suspense fallback={<PokemonGridSkeleton />}>
            <Solution2 />
          </Suspense>
        </SectionErrorBoundary>
      </Section>

      <Section n={3} title="Debounced search">
        <Solution3 q={param(sp, 'q')} />
      </Section>

      <Section n={4} title="Pagination & filters">
        <Solution4 sp={sp} />
      </Section>

      <Section n={5} title="Interactive list item">
        <Solution5 />
      </Section>
    </>
  );
}

// ============================================================================
//  Solution 1 — Server-side data fetching
// ----------------------------------------------------------------------------
//  Exercise start: 'use client' page with useEffect + useState + fetch.
//
//  Expected:
//  - Remove 'use client'; make the component `async` and `await` the fetch.
//  - No useState/useEffect, no loading flag, no flash of empty content.
//  - HTML arrives already rendered (SEO, faster LCP); zero JS shipped for this list.
//  - Use a stable `key` (id), not the array index.
//  - Caching: `next: { revalidate }` (or `cache: 'force-cache'`) since Next 15
//    no longer caches fetch by default.
//
//  Signals:
//  - Junior: makes it async and removes the hooks.
//  - Mid: explains server vs client rendering, keys, why the effect ran twice in dev (StrictMode).
//  - Senior: Data Cache vs Request Memoization, revalidate/tag strategy, avoiding N+1
//    by deriving the image from the id, keeping the list item small.
//
//  Follow-ups:
//  - What problems did the useEffect version have? (waterfall after hydration, no
//    error handling, race/unmount issues, double fetch in StrictMode, no SEO)
//  - When WOULD you still fetch on the client? (user-specific, realtime, after interaction
//    -> React Query / SWR / `use()`)
//  - How would you invalidate this cache on demand? (revalidateTag / revalidatePath)
// ============================================================================

async function Solution1() {
  const { items } = await getPokemonPage(12);
  return (
    <PokemonGrid>
      {items.map((p) => (
        <PokemonCard key={p.id} id={p.id} name={p.name} />
      ))}
    </PokemonGrid>
  );
}

// ============================================================================
//  Solution 2 — Streaming & error handling
// ----------------------------------------------------------------------------
//  Exercise start: a slow + flaky fetch awaited in the page -> the WHOLE page is
//  blocked for seconds, and one failure crashes everything.
//
//  Expected:
//  - Move the slow work into its own async component, wrap it in <Suspense> with a
//    skeleton fallback -> the rest of the page streams immediately.
//  - Wrap in an error boundary (client component) with a Retry that calls
//    router.refresh(). (Route-level alternative: loading.tsx + error.tsx with reset().)
//  - Fetch details in parallel (Promise.all*), not sequentially in a for-loop.
//  - Promise.allSettled for partial failure: one broken card ≠ broken section.
//
//  Signals:
//  - Junior: adds a loading state / try-catch.
//  - Mid: Suspense + error boundary, parallel fetching.
//  - Senior: allSettled for partial failures, boundary placement (granularity),
//    knows error messages are redacted in prod (digest), retry vs refresh, timeouts.
//
//  Follow-ups:
//  - Where would you place boundaries and why? (per section vs per card vs route)
//  - Why does error.tsx need to be a client component?
//  - How does streaming work over HTTP? (chunked transfer, RSC payload, out-of-order)
//  - How would you add a timeout? (AbortSignal.timeout)
// ============================================================================

async function Solution2() {
  // Whole-section failure (list) -> caught by SectionErrorBoundary.
  const { items } = await flaky(() => getPokemonPage(6, 150), { failRate: 0.2 });

  // Per-item failures -> handled inline, the rest still renders.
  const results = await Promise.allSettled(
    items.map((p) => flaky(() => getPokemon(p.name), { delay: 0, failRate: 0.15 })),
  );

  return (
    <PokemonGrid>
      {results.map((r, i) =>
        r.status === 'fulfilled' ? (
          <PokemonCard key={items[i].id} id={r.value.id} name={r.value.name} types={r.value.types} />
        ) : (
          <div key={items[i].id} role="alert" className="alert alert-warning alert-soft flex-col text-center">
            <span className="font-semibold capitalize">{items[i].name}</span>
            <span className="text-xs">Details unavailable</span>
          </div>
        ),
      )}
    </PokemonGrid>
  );
}

// ============================================================================
//  Solution 3 — Debounced search
// ----------------------------------------------------------------------------
//  Exercise start: an input that fetches on every keystroke, with out-of-order
//  responses overwriting newer ones.
//
//  Expected:
//  - Debounce (~300ms) the input; keep the input itself instant (local state).
//  - Put the query in the URL (?q=) -> shareable, back button, server renders results.
//  - Handle races: latest wins (transitions do this for navigations; on the client
//    use AbortController or an "ignore" flag in the effect cleanup).
//  - PokéAPI has no search endpoint: walk the list once (cached), filter on the server.
//
//  Signals:
//  - Junior: setTimeout debounce, maybe forgets cleanup.
//  - Mid: proper cleanup, useDebounce hook, AbortController, URL state.
//  - Senior: useTransition / useDeferredValue, router.replace vs push, Suspense `key`
//    to re-show fallback, caching the name index, min query length.
//
//  Follow-ups:
//  - Debounce vs throttle? useDeferredValue vs debounce?
//  - Why replace instead of push?
//  - What if the dataset were 10M rows? (real search endpoint / index, not walking)
// ============================================================================

async function Solution3({ q }: { q: string }) {
  return (
    <div className="space-y-4">
      <SearchBox defaultValue={q} />
      {/* key={q}: a new query re-suspends and shows the fallback for this block only */}
      <Suspense key={q} fallback={<PokemonGridSkeleton />}>
        <SearchResults q={q} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ q }: { q: string }) {
  if (q.length < 2) return <p className="text-base-content/60">Type at least 2 characters.</p>;

  const all = await getAllPokemon(); // walked + cached, so cheap after the first call
  const matches = all.filter((p) => p.name.includes(q.toLowerCase()));
  if (matches.length === 0) return <p className="text-base-content/60">No Pokémon match “{q}”.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-base-content/60">
        {matches.length} match{matches.length === 1 ? '' : 'es'}
        {matches.length > 12 && ' — showing first 12'}
      </p>
      <PokemonGrid>
        {matches.slice(0, 12).map((p) => (
          <PokemonCard key={p.id} id={p.id} name={p.name} />
        ))}
      </PokemonGrid>
    </div>
  );
}

// ============================================================================
//  Solution 4 — Pagination & filters
// ----------------------------------------------------------------------------
//  Exercise start: fetches all ~1300 Pokémon at once and renders them; the type
//  dropdown and pagination do nothing.
//
//  Expected:
//  - Page + filter live in the URL (?page=&type=), read from `searchParams` on the server.
//  - Only request what you show: limit/offset on the API (no type) …
//  - … the /type/{name} endpoint returns everything, so slice server-side and only send
//    one page to the client.
//  - Pagination via <Link> (prefetch, works without JS); filter via <Form> (GET).
//  - Validate/clamp params (page=abc, page=-1, page=9999, unknown type).
//
//  Signals:
//  - Junior: client-side slicing of the full list.
//  - Mid: URL state + limit/offset on the server, Links.
//  - Senior: param validation, preserving other params, payload size, knows the API
//    walk tradeoffs (`next` links vs computed offsets), cache keys per page.
//
//  Follow-ups:
//  - Offset vs cursor pagination? What happens if data changes between pages?
//  - Infinite scroll instead — what changes? (client component, Server Action / route
//    handler for next page, IntersectionObserver)
//  - How do you combine filters the API doesn't support together?
// ============================================================================

const PAGE_SIZE = 12;

async function Solution4({ sp }: { sp: SearchParams }) {
  const types = await getTypes();
  const type = types.includes(param(sp, 'type')) ? param(sp, 'type') : '';
  const requestedPage = Math.max(1, Math.floor(Number(param(sp, 'page')) || 1));

  let items: ListItem[];
  let total: number;
  if (type) {
    const all = await getPokemonByType(type);
    total = all.length;
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const res = await getPokemonPage(PAGE_SIZE, (requestedPage - 1) * PAGE_SIZE);
    total = res.count;
    items = res.items;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const hash = 'solution-4';

  return (
    <div className="space-y-4">
      {/* next/form: GET form -> client-side navigation that updates searchParams. */}
      <Form action="/" scroll={false} className="flex flex-wrap items-end gap-2">
        {/* keep other sections' state */}
        {param(sp, 'q') && <input type="hidden" name="q" value={param(sp, 'q')} />}
        <label className="form-control">
          <span className="label-text mb-1 text-sm">Type</span>
          <select name="type" defaultValue={type} className="select select-bordered select-sm capitalize">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm btn-primary">Apply</button>
        <span className="ml-auto text-sm text-base-content/60">{total} Pokémon</span>
      </Form>

      {items.length === 0 ? (
        <p className="text-base-content/60">Nothing here.</p>
      ) : (
        <PokemonGrid>
          {items.map((p) => (
            <PokemonCard key={p.id} id={p.id} name={p.name} />
          ))}
        </PokemonGrid>
      )}

      <div className="join justify-center">
        <Link
          scroll={false}
          aria-disabled={page <= 1}
          className={`join-item btn btn-sm ${page <= 1 ? 'btn-disabled' : ''}`}
          href={hrefWith(sp, { page: page - 1 <= 1 ? null : page - 1 }, hash)}
        >
          «
        </Link>
        <span className="join-item btn btn-sm pointer-events-none">
          Page {page} of {totalPages}
        </span>
        <Link
          scroll={false}
          aria-disabled={page >= totalPages}
          className={`join-item btn btn-sm ${page >= totalPages ? 'btn-disabled' : ''}`}
          href={hrefWith(sp, { page: page + 1 }, hash)}
        >
          »
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
//  Solution 5 — Interactive list item
// ----------------------------------------------------------------------------
//  Exercise start: server-rendered cards with an empty onClick that doesn't even
//  compile (event handlers can't be passed from a Server Component).
//
//  Expected:
//  - Recognise the server/client boundary: create a small 'use client' component for
//    the interactive part only; keep fetching on the server and pass data as props.
//  - Use semantic <button>s (keyboard/a11y), a modal (<dialog>) for details.
//  - Load details on demand: Server Action (below) / route handler / client fetch.
//  - Handle loading, error, and fast repeated clicks (stale responses).
//
//  Signals:
//  - Junior: makes the whole page 'use client'.
//  - Mid: extracts a client leaf component, passes serialisable props.
//  - Senior: validates Server Action input (it's a public endpoint!), discusses
//    modal-as-state vs route (/pokemon/[name] + intercepting/parallel routes for a
//    shareable, refresh-safe modal), caching, a11y focus management.
//
//  Follow-ups:
//  - Why can't a Server Component pass `onClick`? What CAN cross the boundary?
//  - How would you make the modal URL-addressable / survive a refresh?
//  - Server Action vs Route Handler vs fetching PokéAPI directly from the browser?
// ============================================================================

async function getPokemonDetails(name: string): Promise<PokemonDetails> {
  'use server';
  // Server Actions are public POST endpoints -> never trust the input.
  if (typeof name !== 'string' || !/^[a-z0-9-]{1,50}$/.test(name)) throw new Error('Invalid name');
  return getPokemon(name);
}

async function Solution5() {
  const { items } = await getPokemonPage(12, 24);
  return <PokemonPicker items={items} getDetails={getPokemonDetails} />;
}
