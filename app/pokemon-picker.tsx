'use client';

// Solution 5 — clicking a list item opens a detail modal.
// - Only this leaf is a Client Component; the list data comes from the server as props.
// - Details are loaded through a Server Action passed in as a prop (`getDetails`).
// - Real <button>s: keyboard + screen reader accessible for free.
// - Native <dialog>: focus trap, Esc to close, backdrop click via DaisyUI's modal-backdrop form.
// - Latest-click-wins guard + a small client cache so re-opening is instant.

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { PokemonCard, artworkUrl } from './pokemon-card';

export type PokemonDetails = {
  id: number;
  name: string;
  height: number; // decimetres
  weight: number; // hectograms
  types: string[];
  stats: { name: string; value: number }[];
};

type Props = {
  items: { id: number; name: string }[];
  getDetails: (name: string) => Promise<PokemonDetails>;
};

export function PokemonPicker({ items, getDetails }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cache = useRef(new Map<string, PokemonDetails>());
  const latest = useRef<string | null>(null);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [details, setDetails] = useState<PokemonDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(item: { id: number; name: string }) {
    setSelected(item);
    setError(null);
    latest.current = item.name;
    dialogRef.current?.showModal();

    const cached = cache.current.get(item.name);
    setDetails(cached ?? null);
    if (cached) return;

    startTransition(async () => {
      try {
        const result = await getDetails(item.name);
        cache.current.set(item.name, result);
        if (latest.current === item.name) setDetails(result); // ignore stale responses
      } catch {
        if (latest.current === item.name) setError('Could not load details.');
      }
    });
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="h-full w-full cursor-pointer text-left" onClick={() => open(item)}>
              <PokemonCard id={item.id} name={item.name} />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} className="modal" onClose={() => (latest.current = null)}>
        <div className="modal-box">
          {selected && (
            <div className="flex flex-col items-center gap-3">
              <Image src={artworkUrl(selected.id)} alt={selected.name} width={180} height={180} />
              <h3 className="text-2xl font-bold capitalize">{selected.name}</h3>

              {error && <div className="alert alert-error w-full">{error}</div>}

              {!details && !error && isPending && (
                <div className="w-full space-y-2">
                  <div className="skeleton h-6 w-1/2" />
                  <div className="skeleton h-24 w-full" />
                </div>
              )}

              {details && (
                <>
                  <div className="flex gap-1">
                    {details.types.map((t) => (
                      <span key={t} className="badge badge-primary capitalize">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="stats stats-horizontal bg-base-200">
                    <div className="stat py-2">
                      <div className="stat-title">Height</div>
                      <div className="stat-value text-lg">{details.height / 10} m</div>
                    </div>
                    <div className="stat py-2">
                      <div className="stat-title">Weight</div>
                      <div className="stat-value text-lg">{details.weight / 10} kg</div>
                    </div>
                  </div>
                  <div className="w-full space-y-1">
                    {details.stats.map((s) => (
                      <div key={s.name} className="grid grid-cols-[8rem_3rem_1fr] items-center gap-2 text-sm">
                        <span className="capitalize">{s.name.replace('-', ' ')}</span>
                        <span className="text-right font-mono">{s.value}</span>
                        <progress className="progress progress-primary" value={s.value} max={255} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Close">close</button>
        </form>
      </dialog>
    </>
  );
}
