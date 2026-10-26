import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FileSummary } from '@stackbase/contracts';
import { FileGrid, FileList, SelectionBar } from '@/components/library/FileViews';

const file = (overrides: Partial<FileSummary> = {}): FileSummary => ({
  id: 'file-1',
  name: 'report.pdf',
  extension: 'pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  category: 'documents',
  favorite: false,
  description: null,
  folderId: 'folder-1',
  folderName: 'Documents',
  contentStatus: 'pending',
  tags: [],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  ...overrides,
});

describe('FileGrid', () => {
  it('renders name, size, folder-independent metadata and tags', () => {
    render(
      <FileGrid
        files={[
          file({
            favorite: true,
            tags: [{ id: 'tag-1', name: 'Taxes', colorToken: 'slate' }],
          }),
        ]}
        selectedIds={new Set()}
        onToggle={() => undefined}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2\.00 KB/)).toBeInTheDocument();
    expect(screen.getByText('Taxes')).toBeInTheDocument();
    expect(screen.getByText('Favorite')).toBeInTheDocument();
  });

  it('reports selection without opening the file', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onOpen = vi.fn();

    render(
      <FileGrid
        files={[file()]}
        selectedIds={new Set()}
        onToggle={onToggle}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select report.pdf' }));
    expect(onToggle).toHaveBeenCalledWith('file-1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens details from the card body', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(
      <FileGrid
        files={[file()]}
        selectedIds={new Set()}
        onToggle={() => undefined}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByText('report.pdf'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-1' }));
  });

  it('marks the selected card visually for assistive tech', () => {
    render(
      <FileGrid
        files={[file()]}
        selectedIds={new Set(['file-1'])}
        onToggle={() => undefined}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Select report.pdf' })).toBeChecked();
  });
});

describe('FileList', () => {
  it('shows the folder column and keeps the row selectable', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <FileList
        files={[file()]}
        selectedIds={new Set()}
        onToggle={onToggle}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getAllByText('Documents').length).toBeGreaterThan(0);
    expect(screen.getByText('Name')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select report.pdf' }));
    expect(onToggle).toHaveBeenCalledWith('file-1');
  });

  it('trims long tag sets to three chips in the row', () => {
    render(
      <FileList
        files={[
          file({
            tags: [
              { id: '1', name: 'One', colorToken: null },
              { id: '2', name: 'Two', colorToken: null },
              { id: '3', name: 'Three', colorToken: null },
              { id: '4', name: 'Four', colorToken: null },
            ],
          }),
        ]}
        selectedIds={new Set()}
        onToggle={() => undefined}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.queryByText('Four')).not.toBeInTheDocument();
  });
});

describe('SelectionBar', () => {
  it('stays out of the way with no selection', () => {
    const { container } = render(
      <SelectionBar
        count={0}
        onClear={() => undefined}
        onFavorite={() => undefined}
        onUnfavorite={() => undefined}
        onMove={() => undefined}
        onTrash={() => undefined}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('exposes every bulk action with an explicit count', async () => {
    const user = userEvent.setup();
    const onFavorite = vi.fn();
    const onMove = vi.fn();
    const onTrash = vi.fn();

    render(
      <SelectionBar
        count={2}
        onClear={() => undefined}
        onFavorite={onFavorite}
        onUnfavorite={() => undefined}
        onMove={onMove}
        onTrash={onTrash}
      />,
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Favorite' }));
    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    await user.click(screen.getByRole('button', { name: 'Move to trash' }));

    expect(onFavorite).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onTrash).toHaveBeenCalledTimes(1);
  });
});
