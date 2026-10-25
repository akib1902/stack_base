import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LIBRARY_CATEGORIES, type LibrarySummaryResponse } from '@stackbase/contracts';
import { CategoryBento } from '@/components/dashboard/CategoryBento';

function buildSummary(
  overrides: Partial<Record<string, { files: number; bytes: number }>> = {},
): LibrarySummaryResponse {
  const categories = LIBRARY_CATEGORIES.map((category) => ({
    category,
    ...(overrides[category] ?? { files: 0, bytes: 0 }),
  }));

  return {
    totals: categories.reduce(
      (sum, entry) => ({ files: sum.files + entry.files, bytes: sum.bytes + entry.bytes }),
      { files: 0, bytes: 0 },
    ),
    categories,
  };
}

describe('CategoryBento', () => {
  it('renders every category with honest empty copy when the library is empty', () => {
    const { container } = render(<CategoryBento summary={buildSummary()} />);

    expect(screen.getByRole('heading', { name: 'Browse' })).toBeInTheDocument();
    expect(container.querySelectorAll('article')).toHaveLength(LIBRARY_CATEGORIES.length);

    for (const label of [
      'Photos',
      'Videos',
      'Audio',
      'Documents',
      'APKs',
      'Archives',
      'Apps',
      'Downloads',
      'Other files',
    ]) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }

    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(screen.getByText('0 files across 9 categories')).toBeInTheDocument();
  });

  it('shows real counts, sizes and storage share for populated categories', () => {
    const { container } = render(
      <CategoryBento
        summary={buildSummary({
          images: { files: 2, bytes: 1000 },
          documents: { files: 1, bytes: 300 },
        })}
      />,
    );

    expect(screen.getByText('2 files')).toBeInTheDocument();
    expect(screen.getByText('1000 B')).toBeInTheDocument();
    expect(screen.getByText('300 B')).toBeInTheDocument();
    expect(screen.getByText('3 files across 9 categories')).toBeInTheDocument();

    const widths = Array.from(container.querySelectorAll<HTMLElement>('article div[style]')).map(
      (element) => element.style.width,
    );
    expect(widths).toContain('77%');
    expect(widths).toContain('23%');
  });

  it('never renders an inert control — tiles are informational articles', () => {
    render(<CategoryBento summary={buildSummary({ videos: { files: 1, bytes: 2048 } })} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
