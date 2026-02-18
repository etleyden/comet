import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import AccountSelection from './AccountSelection';

// Mock the accountsApi module for unit tests — isolate from network entirely
vi.mock('../../../api', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}));

import { accountsApi } from '../../../api';

const mockedGetAccounts = vi.mocked(accountsApi.getAccounts);

function renderAccountSelection(props: Partial<Parameters<typeof AccountSelection>[0]> = {}) {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };
  return render(
    <ThemeProvider theme={theme}>
      <AccountSelection {...defaultProps} {...props} />
    </ThemeProvider>
  );
}

describe('AccountSelection', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show a disabled select while accounts are being fetched', () => {
    // Never resolve the promise so it stays in loading state
    mockedGetAccounts.mockReturnValue(new Promise(() => {}));

    renderAccountSelection();

    // MUI renders a disabled combobox during loading state
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-disabled', 'true');
  });

  it('should display an error alert when the API returns an error', async () => {
    mockedGetAccounts.mockResolvedValue({
      success: false,
      error: 'Failed to load',
    });

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
    });
  });

  it('should display an error alert when the API call throws', async () => {
    mockedGetAccounts.mockRejectedValue(new Error('Network error'));

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('should render a select dropdown with accounts after loading', async () => {
    mockedGetAccounts.mockResolvedValue({
      success: true,
      data: [
        { id: '1', name: 'Checking', institution: 'Test Bank', account: '1234', routing: '5678' },
        { id: '2', name: 'Savings', account: '9876', routing: '5432' },
      ],
    });

    renderAccountSelection();

    await waitFor(() => {
      // After loading, the select should be enabled (no aria-disabled)
      const select = screen.getByRole('combobox');
      expect(select).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('should use custom label when provided', async () => {
    mockedGetAccounts.mockResolvedValue({ success: true, data: [] });

    renderAccountSelection({ label: 'Source Account' });

    await waitFor(() => {
      expect(screen.getAllByText('Source Account').length).toBeGreaterThan(0);
    });
  });
});
