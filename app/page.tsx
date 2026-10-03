const sections = [
  { id: 1, title: 'Server-side data fetching' },
  { id: 2, title: 'Streaming & error handling' },
  { id: 3, title: 'Debounced search' },
  { id: 4, title: 'Pagination & filters' },
  { id: 5, title: 'Interactive list item' },
];

export default function Page() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Next.js Interview</h1>
        <p className="text-base-content/70">Data from PokéAPI — pokeapi.co</p>
      </header>

      {sections.map((s) => (
        <section key={s.id} id={`solution-${s.id}`} className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">
              <span className="badge badge-primary">Solution {s.id}</span>
              {s.title}
            </h2>
            <p className="text-base-content/60">Coming soon.</p>
          </div>
        </section>
      ))}
    </>
  );
}
