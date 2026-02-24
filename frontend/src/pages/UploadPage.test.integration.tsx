import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { NotificationProvider } from '../context/NotificationContext';
import { http, HttpResponse } from 'msw';
import { server } from '../__tests__/mocks/server';
import { theme } from '../theme';
import UploadPage from './UploadPage';
import type { ApiResponse, UploadTransactionsResponse } from 'shared';

// Start MSW server for network-level interception
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * For integration tests we mock only the CSV import component
 * (since it requires real File objects and PapaParse), but let
 * AccountSelection and TransactionMappingTable render fully and
 * the API calls go through MSW.
 */
vi.mock('../components/upload/ImportCSVButton', () => ({
    default: ({ onFileUpload }: { onFileUpload: (data: any[]) => void }) => (
        <button
            data-testid="import-csv-btn"
            onClick={() =>
                onFileUpload([
                    { Amount: '100.50', Date: '2025-06-01', Description: 'Grocery' },
                    { Amount: '50.00', Date: '2025-06-02', Description: 'Gas' },
                ])
            }
        >
            Import CSV
        </button>
    ),
}));

function renderUploadPage() {
    return render(
        <ThemeProvider theme={theme}>
            <NotificationProvider>
                <UploadPage />
            </NotificationProvider>
        </ThemeProvider>
    );
}

/**
 * The AccountSelection is the first combobox on the page.
 * The TransactionMappingTable also renders multiple comboboxes for column mapping.
 * We identify the account select by finding the first combobox.
 */
function getAccountSelect() {
    return screen.getAllByRole('combobox')[0];
}

describe('UploadPage (Integration)', () => {
    it('should show the import button initially', () => {
        renderUploadPage();
        expect(screen.getByTestId('import-csv-btn')).toBeInTheDocument();
    });

    it('should show account selection and upload button after CSV import', async () => {
        renderUploadPage();

        await userEvent.click(screen.getByTestId('import-csv-btn'));

        // Wait for AccountSelection to finish loading (MSW serves accounts)
        await waitFor(() => {
            const accountSelect = getAccountSelect();
            expect(accountSelect).not.toHaveAttribute('aria-disabled', 'true');
        });

        // Upload button should be present but disabled (no account selected)
        const uploadBtn = screen.getByRole('button', { name: /upload/i });
        expect(uploadBtn).toBeDisabled();
    });

    it('should complete the full upload flow successfully', async () => {
        renderUploadPage();

        // Step 1: Import CSV
        await userEvent.click(screen.getByTestId('import-csv-btn'));

        // Step 2: Wait for accounts to load from MSW
        await waitFor(() => {
            const accountSelect = getAccountSelect();
            expect(accountSelect).not.toHaveAttribute('aria-disabled', 'true');
        });

        // Step 3: Select an account (open the MUI Select and pick one)
        await userEvent.click(getAccountSelect());

        // Wait for account options to appear in MUI dropdown
        const option = await screen.findByText(/Primary Checking/i);
        await userEvent.click(option);

        // Step 4: Upload button should now be enabled
        const uploadBtn = screen.getByRole('button', { name: /upload/i });
        expect(uploadBtn).toBeEnabled();

        // Step 5: Click upload
        await userEvent.click(uploadBtn);

        // Step 6: Should transition to success (MSW handler returns success)
        await waitFor(() => {
            expect(screen.getByText(/successfully uploaded 2 transactions/i)).toBeInTheDocument();
        });
    });

    it('should show error when upload API returns failure', async () => {
        // Override the upload handler to return an error
        server.use(
            http.post('https://localhost:86/api/transactions/upload', () => {
                const response: ApiResponse<UploadTransactionsResponse> = {
                    success: false,
                    error: 'Account not found or does not belong to the current user',
                };
                return HttpResponse.json(response);
            })
        );

        renderUploadPage();

        await userEvent.click(screen.getByTestId('import-csv-btn'));

        await waitFor(() => {
            const accountSelect = getAccountSelect();
            expect(accountSelect).not.toHaveAttribute('aria-disabled', 'true');
        });

        // Select account
        await userEvent.click(getAccountSelect());
        const option = await screen.findByText(/Primary Checking/i);
        await userEvent.click(option);

        // Upload
        await userEvent.click(screen.getByRole('button', { name: /upload/i }));

        await waitFor(() => {
            expect(screen.getByText(/account not found/i)).toBeInTheDocument();
        });
    });

    it('should show error when network request fails', async () => {
        server.use(
            http.post('https://localhost:86/api/transactions/upload', () => {
                return HttpResponse.error();
            })
        );

        renderUploadPage();

        await userEvent.click(screen.getByTestId('import-csv-btn'));

        await waitFor(() => {
            const accountSelect = getAccountSelect();
            expect(accountSelect).not.toHaveAttribute('aria-disabled', 'true');
        });

        await userEvent.click(getAccountSelect());
        const option = await screen.findByText(/Primary Checking/i);
        await userEvent.click(option);

        await userEvent.click(screen.getByRole('button', { name: /upload/i }));

        await waitFor(() => {
            // The page renders an inline error alert; a notification toast is also
            // shown, so getAllByRole is used to handle multiple alert elements.
            expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
        });
    });
});
