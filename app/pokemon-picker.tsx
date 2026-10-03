'use client';

import { useRef, useState } from 'react';
import { PokemonCard } from './pokemon-card';

export type PokemonDetails = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  stats: { name: string; value: number }[];
};

type Props = {
  items: { id: number; name: string }[];
  getDetails: (name: string) => Promise<PokemonDetails>;
};

export function PokemonPicker({ items, getDetails }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [details, setDetails] = useState<PokemonDetails | null>(null);

  async function open(name: string) {
    setDetails(null);
    dialogRef.current?.showModal();
    setDetails(await getDetails(name));
  }

  return (
    <>
      <PokemonGridButtons items={items} onSelect={open} />

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          {!details ? (
            <span className="loading loading-spinner" />
          ) : (
            <div className="space-y-3">
              <PokemonCard id={details.id} name={details.name} types={details.types} />
              <p>
                Height: {details.height / 10} m · Weight: {details.weight / 10} kg
              </p>
              {details.stats.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="w-32 capitalize">{s.name}</span>
                  <progress className="progress progress-primary" value={s.value} max={255} />
                </div>
              ))}
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}

function PokemonGridButtons({ items, onSelect }: { items: Props['items']; onSelect: (name: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((p) => (
        <button key={p.id} type="button" className="cursor-pointer text-left" onClick={() => onSelect(p.name)}>
          <PokemonCard id={p.id} name={p.name} />
        </button>
      ))}
    </div>
  );
}
