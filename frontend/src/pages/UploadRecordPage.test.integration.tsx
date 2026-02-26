import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { NotificationProvider } from '../context/NotificationContext';
import { http, HttpResponse } from 'msw';
import { server } from '../__tests__/mocks/server';
import { theme } from '../theme';
import UploadRecordPage from './UploadRecordPage';
import type { ApiResponse, GetUploadRecordResponse } from 'shared';

// Start MSW server for network-level interception
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE_URL = 'https://localhost:86';

const mockRecord: GetUploadRecordResponse = {
    id: '990e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    mapping: { amount: 'Amount', date: 'Date', vendor: 'Vendor' },
    availableColumns: ['Amount', 'Date', 'Vendor', 'Category', 'Description', 'Status'],
    createdAt: '2025-06-01T00:00:00.000Z',
    transactionCount: 5,
    accountName: 'Primary Checking',
};

function renderPage(recordId = '990e8400-e29b-41d4-a716-446655440000') {
    return render(
        <ThemeProvider theme={theme}>
            <NotificationProvider>
                <MemoryRouter initialEntries={[`/upload-record/${recordId}`]}>
                    <Routes>
                        <Route path="/upload-record/:id" element={<UploadRecordPage />} />
                        <Route path="/home" element={<div>Home Page</div>} />
                    </Routes>
                </MemoryRouter>
            </NotificationProvider>
        </ThemeProvider>,
    );
}

describe('UploadRecordPage (Integration)', () => {
    // Default handler — returns a successful upload record response
    beforeEach(() => {
        server.use(
            http.get(`${BASE_URL}/api/upload-record/:id`, () => {
                const response: ApiResponse<GetUploadRecordResponse> = {
                    success: true,
                    data: mockRecord,
                };
                return HttpResponse.json(response);
            }),
        );
    });

    it('should render the upload record details', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Upload Record')).toBeInTheDocument();
        });

        expect(screen.getByText(/Primary Checking/)).toBeInTheDocument();
        expect(screen.getByText(/5 transactions/)).toBeInTheDocument();
    });

    it('should display the column mapping in a table', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        // Verify mapped values appear
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Vendor')).toBeInTheDocument();
    });

    it('should show dropdowns in edit mode', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        // Click edit button
        await userEvent.click(screen.getByTitle('Edit mapping'));

        // Should have comboboxes (MUI Select renders as combobox role)
        const comboboxes = screen.getAllByRole('combobox');
        expect(comboboxes.length).toBeGreaterThanOrEqual(6); // One per MAPPING_ATTRIBUTE
    });

    it('should populate dropdown options from availableColumns', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByTitle('Edit mapping'));

        // Open the first dropdown (date)
        const comboboxes = screen.getAllByRole('combobox');
        await userEvent.click(comboboxes[0]);

        // Wait for listbox to appear with available column options
        const listbox = await screen.findByRole('listbox');
        const options = within(listbox).getAllByRole('option');
        // Should have "None" + 6 available columns = 7 options
        expect(options).toHaveLength(7);
        expect(within(listbox).getByText('Amount')).toBeInTheDocument();
        expect(within(listbox).getByText('Description')).toBeInTheDocument();
    });

    it('should save mapping changes via the API', async () => {
        let capturedMapping: Record<string, string> | null = null;

        server.use(
            http.put(`${BASE_URL}/api/upload-record/:id`, async ({ request }) => {
                const body = (await request.json()) as { mapping: Record<string, string> };
                capturedMapping = body.mapping;

                const response: ApiResponse<GetUploadRecordResponse> = {
                    success: true,
                    data: {
                        ...mockRecord,
                        mapping: body.mapping,
                    },
                };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        // Enter edit mode
        await userEvent.click(screen.getByTitle('Edit mapping'));

        // Change the vendor dropdown to 'Description'
        const comboboxes = screen.getAllByRole('combobox');
        // Find the vendor combobox (3rd MAPPING_ATTRIBUTE after date, vendor)
        // MAPPING_ATTRIBUTES = ['date', 'vendor', 'description', 'category', 'amount', 'status']
        const vendorCombobox = comboboxes[1]; // vendor is index 1
        await userEvent.click(vendorCombobox);

        const listbox = await screen.findByRole('listbox');
        await userEvent.click(within(listbox).getByText('Description'));

        // Save the changes
        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(capturedMapping).not.toBeNull();
            expect(capturedMapping!.vendor).toBe('Description');
        });
    });

    it('should cancel editing without saving', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        // Enter edit mode
        await userEvent.click(screen.getByTitle('Edit mapping'));

        // Verify edit mode (comboboxes present)
        expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);

        // Cancel
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

        // Comboboxes should be gone (no longer editing)
        expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    });

    it('should show an error when the API returns a failure on load', async () => {
        server.use(
            http.get(`${BASE_URL}/api/upload-record/:id`, () => {
                const response: ApiResponse<GetUploadRecordResponse> = {
                    success: false,
                    error: 'Upload record not found',
                };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/upload record not found/i)).toBeInTheDocument();
        });
    });

    it('should show an error notification when saving fails', async () => {
        server.use(
            http.put(`${BASE_URL}/api/upload-record/:id`, () => {
                const response: ApiResponse<GetUploadRecordResponse> = {
                    success: false,
                    error: 'Mapping contains columns not found in CSV',
                };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Column Mapping')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByTitle('Edit mapping'));
        await userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(screen.getByText(/mapping contains columns not found in csv/i)).toBeInTheDocument();
        });
    });
});
