import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import VendorCell from '../transactionTable/VendorCell';
import type { TransactionWithAccount } from 'shared';

vi.mock('../../../api', () => ({
  vendorsApi: {
    searchVendors: vi.fn(),
    assignVendorToTransaction: vi.fn(),
    createVendor: vi.fn(),
  },
}));

import { vendorsApi } from '../../../api';

const mockedSearchVendors = vi.mocked(vendorsApi.searchVendors);
const mockedAssignVendor = vi.mocked(vendorsApi.assignVendorToTransaction);

const baseTx: TransactionWithAccount = {
  id: 'tx-1',
  amount: 50,
  date: '2025-01-01',
  status: 'completed',
  accountId: 'acc-1',
  accountName: 'Checking',
};

function renderVendorCell(tx: TransactionWithAccount, onVendorAssigned = vi.fn()) {
  return render(
    <ThemeProvider theme={theme}>
      <VendorCell transaction={tx} onVendorAssigned={onVendorAssigned} />
    </ThemeProvider>
  );
}

describe('VendorCell', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show a dash when no vendor label or entity', () => {
    renderVendorCell(baseTx);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show italicized text for raw vendorLabel (no entity)', () => {
    renderVendorCell({ ...baseTx, vendorLabel: 'AMZN MKTP US' });
    const text = screen.getByText('AMZN MKTP US');
    expect(text).toBeInTheDocument();
    expect(text).toHaveStyle({ fontStyle: 'italic' });
  });

  it('should show a VendorDisplay for canonical vendor entity', () => {
    renderVendorCell({
      ...baseTx,
      vendorId: 'v-1',
      vendorName: 'Amazon',
      vendorLabel: 'AMZN MKTP US',
    });
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    // Should have an avatar (the placeholder icon)
    expect(document.querySelector('.MuiAvatar-root')).toBeInTheDocument();
  });

  it('should show edit icon on hover and open search dropdown on click', async () => {
    mockedSearchVendors.mockResolvedValue({
      success: true,
      data: [
        { id: 'v-1', name: 'Walmart', transactionCount: 10 },
        { id: 'v-2', name: 'Amazon', transactionCount: 5 },
      ],
    });

    renderVendorCell({ ...baseTx, vendorLabel: 'WAL*MART' });

    // Find and click the edit button
    const editButton = screen.getByRole('button');
    fireEvent.click(editButton);

    // Dropdown should open and show results
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search vendors…')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Walmart')).toBeInTheDocument();
      expect(screen.getByText('Amazon')).toBeInTheDocument();
    });
  });

  it('should assign vendor on selection and call onVendorAssigned', async () => {
    const onAssigned = vi.fn();
    mockedSearchVendors.mockResolvedValue({
      success: true,
      data: [
        { id: 'v-1', name: 'Walmart', transactionCount: 10 },
      ],
    });
    mockedAssignVendor.mockResolvedValue({
      success: true,
      data: { updated: true },
    });

    renderVendorCell({ ...baseTx, vendorLabel: 'WAL*MART' }, onAssigned);

    // Open the dropdown
    const editButton = screen.getByRole('button');
    fireEvent.click(editButton);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Walmart')).toBeInTheDocument();
    });

    // Click on Walmart
    fireEvent.click(screen.getByText('Walmart'));

    await waitFor(() => {
      expect(mockedAssignVendor).toHaveBeenCalledWith('tx-1', { vendorId: 'v-1' });
      expect(onAssigned).toHaveBeenCalled();
    });
  });
});
