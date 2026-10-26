import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HealthResponse, SetupStatusResponse } from '@stackbase/contracts';
import { ServiceStatusCard } from '@/components/dashboard/ServiceStatusCard';
import { StorageSummaryCard } from '@/components/dashboard/StorageSummaryCard';
import { SetupProgressCard } from '@/components/dashboard/SetupProgressCard';

const storage = (overrides: Partial<SetupStatusResponse['storage']> = {}) => ({
  provider: 'telegram' as const,
  status: 'not_configured' as const,
  accountIdentifier: null,
  lastValidatedAt: null,
  lastErrorCode: null,
  ...overrides,
});

describe('StorageSummaryCard', () => {
  it('renders live counts and the logical-vs-physical caveat', () => {
    render(<StorageSummaryCard bytes={4096} files={3} folders={2} />);

    expect(screen.getByRole('heading', { name: 'Logical storage' })).toBeInTheDocument();
    expect(screen.getByText('4.00 KB')).toBeInTheDocument();
    expect(screen.getByText('3 files · 2 folders')).toBeInTheDocument();
    expect(screen.getByText(/may differ from the physical storage/i)).toBeInTheDocument();
  });
});

describe('SetupProgressCard', () => {
  it('states that storage is not connected when nothing is configured', () => {
    render(<SetupProgressCard storage={storage()} />);

    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText(/ships with encrypted uploads/i)).toBeInTheDocument();
    // The vault is presented as planned, never as a working control.
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('surfaces a connected account and its last validation time', () => {
    render(
      <SetupProgressCard
        storage={storage({
          status: 'connected',
          accountIdentifier: '+15550000000',
          lastValidatedAt: '2026-10-25T12:00:00.000Z',
        })}
      />,
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/Linked as \+15550000000/)).toBeInTheDocument();
    expect(screen.getByText(/Last validated/)).toBeInTheDocument();
  });
});

describe('ServiceStatusCard', () => {
  it('reports healthy services from the health payload', () => {
    const health: HealthResponse = {
      status: 'ok',
      version: '0.1.0',
      uptimeSeconds: 90,
      database: 'ok',
    };
    render(<ServiceStatusCard health={health} />);

    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Reachable')).toBeInTheDocument();
    expect(screen.getByText(/API v0\.1\.0/)).toBeInTheDocument();
  });

  it('reports unreachable rather than pretending everything is fine', () => {
    render(<ServiceStatusCard health={null} />);

    expect(screen.getByText('Unreachable')).toBeInTheDocument();
    expect(screen.getByText(/pnpm dev:api/)).toBeInTheDocument();
  });
});
