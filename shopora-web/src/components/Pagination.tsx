import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageList(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) out.push('gap'); out.push(p); });
  return out;
}

export default function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination" data-testid="pagination">
      <button type="button" className="pagination__btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === 'gap' ? <span key={`gap-${i}`} className="pagination__gap" aria-hidden="true">...</span> : (
          <button key={p} type="button" className={`pagination__btn${p === page ? ' is-current' : ''}`}
            aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
      <button type="button" className="pagination__btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
