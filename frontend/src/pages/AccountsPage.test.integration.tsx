import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { NotificationProvider } from '../context/NotificationContext';
import { http, HttpResponse } from 'msw';
import { server } from '../__tests__/mocks/server';
import { theme } from '../theme';
import AccountsPage from './AccountsPage';
import type { ApiResponse, Account } from 'shared';
import { testAccount, testAccount2 } from '../__tests__/fixtures/entities';

const BASE_URL = 'https://localhost:86';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage(path = '/accounts') {
    return render(
        <ThemeProvider theme={theme}>
            <NotificationProvider>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/accounts" element={<AccountsPage />} />
                    </Routes>
                </MemoryRouter>
            </NotificationProvider>
        </ThemeProvider>,
    );
}

describe('AccountsPage (Integration)', () => {
    // ── Initial render ─────────────────────────────────────────────────

    it('should render the Accounts heading', async () => {
        renderPage();
        expect(screen.getByRole('heading', { name: /accounts/i })).toBeInTheDocument();
    });

    it('should show a loading spinner while fetching', () => {
        renderPage();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display all accounts after loading', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument();
            expect(screen.getByTestId(`account-name-heading-${testAccount2.id}`)).toBeInTheDocument();

        });
    });

    it('should show empty state when no accounts exist', async () => {
        server.use(
            http.get(`${BASE_URL}/api/accounts`, () => {
                const response: ApiResponse<Account[]> = { success: true, data: [] };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument();
        });
    });

    it('should show an error alert when the API fails', async () => {
        server.use(
            http.get(`${BASE_URL}/api/accounts`, () => {
                const response: ApiResponse<Account[]> = { success: false, error: 'Server error' };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/server error/i);
        });
    });

    // ── Create account ─────────────────────────────────────────────────

    it('should show create form when "Add Account" is clicked', async () => {
        renderPage();

        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: /add account/i }));

        expect(screen.getByRole('heading', { name: /new account/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    });

    it('should hide create form when "Cancel" is clicked', async () => {
        renderPage();

        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: /add account/i }));
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

        expect(screen.queryByRole('heading', { name: /new account/i })).not.toBeInTheDocument();
    });

    it('should create an account and refresh the list', async () => {
        const newAccount: Account = {
            id: '770e8400-e29b-41d4-a716-446655440000',
            name: 'Business Checking',
            account: '555666777',
            routing: '021000021',
        };

        // After creation, the list endpoint returns the new account too
        let created = false;
        server.use(
            http.get(`${BASE_URL}/api/accounts`, () => {
                const data = created ? [testAccount, testAccount2, newAccount] : [testAccount, testAccount2];
                return HttpResponse.json({ success: true, data } satisfies ApiResponse<Account[]>);
            }),
            http.post(`${BASE_URL}/api/accounts`, async () => {
                created = true;
                return HttpResponse.json({ success: true, data: newAccount } satisfies ApiResponse<Account>);
            }),
        );

        renderPage();

        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        // Open form
        await userEvent.click(screen.getByRole('button', { name: /add account/i }));

        // Fill out fields
        await userEvent.type(screen.getByLabelText(/account name/i), 'Business Checking');
        await userEvent.type(screen.getByLabelText(/institution/i), 'Biz Bank');
        await userEvent.type(screen.getByLabelText(/account number/i), '555666777');
        await userEvent.type(screen.getByLabelText(/routing number/i), '021000021');

        await userEvent.click(screen.getByRole('button', { name: /^create$/i }));

        await waitFor(() => {
            expect(screen.getByTestId(`account-name-heading-${newAccount.id}`)).toBeInTheDocument();
        });

        // Create form should be dismissed
        expect(screen.queryByRole('heading', { name: /new account/i })).not.toBeInTheDocument();
    });

    it('should show an error when account creation fails', async () => {
        server.use(
            http.post(`${BASE_URL}/api/accounts`, () => {
                const response: ApiResponse<Account> = { success: false, error: 'Account number already exists' };
                return HttpResponse.json(response);
            }),
        );

        renderPage();

        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: /add account/i }));
        await userEvent.type(screen.getByLabelText(/account name/i), 'Dup');
        await userEvent.type(screen.getByLabelText(/account number/i), '12345678');
        await userEvent.type(screen.getByLabelText(/routing number/i), '021000021');
        await userEvent.click(screen.getByRole('button', { name: /^create$/i }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/account number already exists/i);
        });
    });

    // ── Edit account ───────────────────────────────────────────────────

    it('should switch to edit mode on Edit button click', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);

        // await userEvent.click(within(card).getByTitle('Edit'));
        await userEvent.click(within(card).getByLabelText('Edit'));

        // Save / Cancel icon buttons should appear
        expect(screen.getByLabelText('Save')).toBeInTheDocument();
        expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
    });

    it('should cancel edit and restore original values', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Edit'));

        // Clear and type a new name
        const nameInput = screen.getByDisplayValue(testAccount.name);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Temporary Name');

        await userEvent.click(screen.getByLabelText('Cancel'));

        // Original name should be back and edit mode gone
        expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument();
        expect(screen.queryByLabelText('Save')).not.toBeInTheDocument();
    });

    it('should save edits and exit edit mode', async () => {
        const updatedAccount: Account = { ...testAccount, name: 'Updated Checking' };
        let saved = false;

        server.use(
            http.put(`${BASE_URL}/api/accounts/:id`, () => {
                saved = true;
                return HttpResponse.json({ success: true, data: updatedAccount } satisfies ApiResponse<Account>);
            }),
            http.get(`${BASE_URL}/api/accounts`, () =>
                HttpResponse.json({
                    success: true,
                    data: saved ? [updatedAccount, testAccount2] : [testAccount, testAccount2],
                } satisfies ApiResponse<Account[]>),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Edit'));

        const nameInput = screen.getByDisplayValue(testAccount.name);
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Updated Checking');

        await userEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(screen.queryByLabelText('Save')).not.toBeInTheDocument();
            expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toHaveTextContent('Updated Checking');
        });
    });

    it('should show an error when saving fails', async () => {
        server.use(
            http.put(`${BASE_URL}/api/accounts/:id`, () =>
                HttpResponse.json({ success: false, error: 'Update failed' } satisfies ApiResponse<Account>),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Edit'));
        await userEvent.click(screen.getByLabelText('Save'));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/update failed/i);
        });
    });

    // ── Delete account ─────────────────────────────────────────────────

    it('should open a confirmation dialog on Delete button click', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Delete'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it('should dismiss the confirmation dialog when cancelled', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Delete'));

        await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should delete an account and refresh the list', async () => {
        let deleted = false;

        server.use(
            http.delete(`${BASE_URL}/api/accounts/:id`, () => {
                deleted = true;
                return HttpResponse.json({ success: true, data: { deleted: true } });
            }),
            http.get(`${BASE_URL}/api/accounts`, () => {
                const data = deleted ? [testAccount2] : [testAccount, testAccount2];
                return HttpResponse.json({ success: true, data } satisfies ApiResponse<Account[]>);
            }),
        );

        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Delete'));

        // Click the "Delete" button inside the dialog
        const dialog = screen.getByRole('dialog');
        await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

        await waitFor(() => {
            expect(screen.queryByTestId(`account-name-heading-${testAccount.id}`)).not.toBeInTheDocument();
            expect(screen.getByTestId(`account-name-heading-${testAccount2.id}`)).toBeInTheDocument();
        });

        // Dialog should close
        await waitFor(() => expect(dialog).not.toBeInTheDocument());
    });

    it('should show an error when delete fails', async () => {
        server.use(
            http.delete(`${BASE_URL}/api/accounts/:id`, () =>
                HttpResponse.json({ success: false, error: 'Cannot delete account with existing transactions' }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByTestId(`account-name-heading-${testAccount.id}`)).toBeInTheDocument());

        const card = screen.getByTestId(`account-card-${testAccount.id}`);
        await userEvent.hover(card);
        await userEvent.click(within(card).getByLabelText('Delete'));
        await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/cannot delete account with existing transactions/i);
        });
    });

});
