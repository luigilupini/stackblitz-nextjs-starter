import Image from 'next/image';

export function artworkUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function PokemonCard({ id, name, types }: { id: number; name: string; types?: string[] }) {
  return (
    <div className="card card-sm h-full bg-base-200 transition hover:shadow-md">
      <figure className="bg-base-300/50 pt-4">
        <Image src={artworkUrl(id)} alt={name} width={120} height={120} className="h-28 w-28 object-contain" />
      </figure>
      <div className="card-body items-center text-center">
        <span className="text-xs text-base-content/50">#{String(id).padStart(4, '0')}</span>
        <h3 className="card-title text-base capitalize">{name}</h3>
        {types && (
          <div className="flex flex-wrap justify-center gap-1">
            {types.map((t) => (
              <span key={t} className="badge badge-sm badge-outline capitalize">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PokemonGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{children}</div>;
}

export function PokemonGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <PokemonGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-52 w-full" />
      ))}
    </PokemonGrid>
  );
}
