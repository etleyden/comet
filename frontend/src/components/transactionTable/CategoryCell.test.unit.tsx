import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { NotificationProvider } from '../../context/NotificationContext';
import CategoryCell from '../transactionTable/CategoryCell';
import type { TransactionWithAccount } from 'shared';

vi.mock('../../../api', () => ({
  categoriesApi: {
    getCategories: vi.fn(),
    assignCategoryToTransaction: vi.fn(),
  },
  parseApiError: vi.fn((err: unknown, fallback?: string) =>
    err instanceof Error ? err.message : (fallback ?? 'Something went wrong')
  ),
}));

import { categoriesApi } from '../../../api';

const mockedGetCategories = vi.mocked(categoriesApi.getCategories);
const mockedAssignCategory = vi.mocked(categoriesApi.assignCategoryToTransaction);

const baseTx: TransactionWithAccount = {
  id: 'tx-1',
  amount: 50,
  date: '2025-01-01',
  status: 'completed',
  accountId: 'acc-1',
  accountName: 'Checking',
};

function renderCategoryCell(tx: TransactionWithAccount, onCategoryAssigned = vi.fn()) {
  return render(
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <CategoryCell transaction={tx} onCategoryAssigned={onCategoryAssigned} />
      </NotificationProvider>
    </ThemeProvider>
  );
}

describe('CategoryCell', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a dash when no category label or entity', () => {
    renderCategoryCell(baseTx);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows italicized text for raw categoryLabel (no entity)', () => {
    renderCategoryCell({ ...baseTx, categoryLabel: 'Food & Dining' });
    const text = screen.getByText('Food & Dining');
    expect(text).toBeInTheDocument();
    expect(text).toHaveStyle({ fontStyle: 'italic' });
  });

  it('shows category name for a canonical category entity', () => {
    renderCategoryCell({
      ...baseTx,
      categoryId: 'cat-1',
      categoryName: 'Groceries',
      categoryLabel: 'food',
    });
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('opens category search dropdown on edit button click', async () => {
    mockedGetCategories.mockResolvedValue({
      success: true,
      data: {
        categories: [
          { id: 'cat-1', name: 'Groceries', isDeprecated: false, createdAt: '', updatedAt: '', children: [] },
          { id: 'cat-2', name: 'Transport', isDeprecated: false, createdAt: '', updatedAt: '', children: [] },
        ],
      },
    });

    renderCategoryCell({ ...baseTx, categoryLabel: 'food' });

    const editButton = screen.getByLabelText('Edit category');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search categories…')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
    });
  });

  it('assigns category on selection and calls onCategoryAssigned', async () => {
    const onAssigned = vi.fn();
    mockedGetCategories.mockResolvedValue({
      success: true,
      data: {
        categories: [
          { id: 'cat-1', name: 'Groceries', isDeprecated: false, createdAt: '', updatedAt: '', children: [] },
        ],
      },
    });
    mockedAssignCategory.mockResolvedValue({ success: true, data: { updated: true } });

    renderCategoryCell({ ...baseTx, categoryLabel: 'food' }, onAssigned);

    fireEvent.click(screen.getByLabelText('Edit category'));

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Groceries'));

    await waitFor(() => {
      expect(mockedAssignCategory).toHaveBeenCalledWith('tx-1', { categoryId: 'cat-1' });
      expect(onAssigned).toHaveBeenCalledTimes(1);
    });
  });

  it('unassigns category when "Unassign category" is clicked', async () => {
    const onAssigned = vi.fn();
    mockedGetCategories.mockResolvedValue({
      success: true,
      data: { categories: [] },
    });
    mockedAssignCategory.mockResolvedValue({ success: true, data: { updated: true } });

    renderCategoryCell({ ...baseTx, categoryId: 'cat-1', categoryName: 'Groceries' }, onAssigned);

    fireEvent.click(screen.getByLabelText('Edit category'));

    await waitFor(() => {
      expect(screen.getByText('Unassign category')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unassign category'));

    await waitFor(() => {
      expect(mockedAssignCategory).toHaveBeenCalledWith('tx-1', { categoryId: null });
      expect(onAssigned).toHaveBeenCalledTimes(1);
    });
  });
});
