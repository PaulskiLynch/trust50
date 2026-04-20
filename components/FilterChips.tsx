"use client";

type ActiveFilter = {
  key: string;
  value: string;
};

type FilterChipsProps = {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClear: () => void;
};

export function FilterChips({ filters, onRemove, onClear }: FilterChipsProps) {
  if (!filters.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-foreground transition hover:border-foreground"
        >
          {filter.value} x
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-transparent px-2 py-1.5 text-sm text-muted transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
