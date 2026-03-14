import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import VendorCreateModal from './VendorCreateModal';

vi.mock('../../../api', () => ({
  vendorsApi: {
    createVendor: vi.fn(),
  },
}));

import { vendorsApi } from '../../../api';

const mockedCreateVendor = vi.mocked(vendorsApi.createVendor);

function renderModal(props: Partial<Parameters<typeof VendorCreateModal>[0]> = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    initialName: '',
  };
  return render(
    <ThemeProvider theme={theme}>
      <VendorCreateModal {...defaultProps} {...props} />
    </ThemeProvider>
  );
}

describe('VendorCreateModal', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dialog with form fields', () => {
    renderModal();
    expect(screen.getByText('Create New Vendor')).toBeInTheDocument();
    expect(screen.getByLabelText(/vendor name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/logo url/i)).toBeInTheDocument();
  });

  it('should show error when name is empty and create is clicked', async () => {
    renderModal();
    const createBtn = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(mockedCreateVendor).not.toHaveBeenCalled();
  });

  it('should call createVendor and onCreated on success', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    mockedCreateVendor.mockResolvedValue({
      success: true,
      data: { id: 'v-new', name: 'New Vendor' },
    });

    renderModal({ onCreated, onClose, initialName: 'New Vendor' });

    const createBtn = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockedCreateVendor).toHaveBeenCalledWith({
        name: 'New Vendor',
        url: undefined,
        logoUrl: undefined,
      });
      expect(onCreated).toHaveBeenCalledWith({ id: 'v-new', name: 'New Vendor' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should show error message on API failure', async () => {
    mockedCreateVendor.mockResolvedValue({
      success: false,
      error: 'Vendor already exists',
    });

    renderModal({ initialName: 'Duplicate' });

    const createBtn = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Vendor already exists')).toBeInTheDocument();
    });
  });
});
