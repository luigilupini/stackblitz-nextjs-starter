'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace(value ? `/?q=${encodeURIComponent(value)}` : '/', { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [value, router]);

  return (
    <input
      type="search"
      className="input w-full max-w-md"
      placeholder="Search Pokémon, e.g. pika"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
