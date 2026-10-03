'use client';

// Solution 3 — debounced search input that writes `?q=` to the URL.
// - Local state keeps typing instant (controlled input never waits on the network).
// - A 300ms debounce means one navigation per pause, not per keystroke.
// - router.replace (not push) so typing doesn't spam the history stack.
// - startTransition: the old results stay visible while the server renders new ones,
//   and React/Next discard stale navigations — the latest query always wins (no race).

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      const q = value.trim();
      if (q) params.set('q', q);
      else params.delete('q');
      if (params.toString() === searchParams.toString()) return;
      startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(timeout); // cleanup = the debounce
  }, [value, searchParams, pathname, router]);

  return (
    <label className="input input-bordered flex w-full max-w-md items-center gap-2">
      <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        className="grow"
        placeholder="Search Pokémon, e.g. pika"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search Pokémon"
      />
      {isPending && <span className="loading loading-spinner loading-xs" />}
    </label>
  );
}
