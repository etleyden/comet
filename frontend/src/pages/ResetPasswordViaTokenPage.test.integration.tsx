import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { NotificationProvider } from '../context/NotificationContext';
import { http, HttpResponse } from 'msw';
import { server } from '../__tests__/mocks/server';
import { theme } from '../theme';
import ResetPasswordViaTokenPage from './ResetPasswordViaTokenPage';
import { testUser } from '../__tests__/fixtures/entities';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://localhost:86';
const VALID_TOKEN = 'abc123token.secret';
/** Passes validatePassword (≥8 chars, letter, number, special). */
const VALID_PASSWORD = 'Str0ng!Pass';

// ─── Server lifecycle ─────────────────────────────────────────────────────────

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
});
afterAll(() => server.close());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(token: string | null = VALID_TOKEN) {
    const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ refreshUser: mockRefreshUser } as any);

    const path =
        token !== null
            ? `/reset-password/token?token=${encodeURIComponent(token)}`
            : '/reset-password/token';

    render(
        <ThemeProvider theme={theme}>
            <NotificationProvider>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/reset-password/token" element={<ResetPasswordViaTokenPage />} />
                    </Routes>
                </MemoryRouter>
            </NotificationProvider>
        </ThemeProvider>,
    );

    return { mockRefreshUser };
}

/**
 * Sets up a valid-token handler, renders the page, and waits until the
 * password form is visible. Returns the helpers from renderPage.
 */
async function renderForm(token = VALID_TOKEN) {
    server.use(
        http.post(`${BASE_URL}/api/auth/reset-password/validate`, () =>
            HttpResponse.json({ success: true, data: { valid: true } }),
        ),
    );
    const result = renderPage(token);
    await waitFor(() => screen.getByLabelText('New Password', { exact: true }));
    return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResetPasswordViaTokenPage (Integration)', () => {
    // ── Loading state ──────────────────────────────────────────────────────────

    it('shows a loading spinner while the token is being validated', () => {
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/validate`, () =>
                new Promise(() => {
                    /* intentionally never resolves */
                }),
            ),
        );

        renderPage();

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    // ── Invalid / expired token state ──────────────────────────────────────────

    it('shows an error state when there is no token in the URL', async () => {
        renderPage(null);

        await waitFor(() =>
            expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
        );
    });

    it('shows an error state when the API reports the token is invalid', async () => {
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/validate`, () =>
                HttpResponse.json({ success: true, data: { valid: false } }),
            ),
        );

        renderPage();

        await waitFor(() =>
            expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
        );
    });

    it('shows an error state when token validation fails with a network error', async () => {
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/validate`, () =>
                HttpResponse.error(),
            ),
        );

        renderPage();

        await waitFor(() =>
            expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
        );
    });

    it('offers a link back to the login page when the token is invalid', async () => {
        renderPage(null);

        await waitFor(() =>
            expect(screen.getByRole('link', { name: /return to login/i })).toBeInTheDocument(),
        );
    });

    // ── Form rendering ─────────────────────────────────────────────────────────

    it('shows the password form when the token is valid', async () => {
        await renderForm();

        expect(screen.getByLabelText('New Password', { exact: true })).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm New Password', { exact: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('disables the submit button when both fields are empty', async () => {
        await renderForm();

        expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
    });

    it('disables the submit button when only one field has been filled', async () => {
        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);

        expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
    });

    // ── Client-side validation ─────────────────────────────────────────────────

    it('shows an error when the new password does not meet strength requirements', async () => {
        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), 'weak');
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), 'weak');
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        expect(await screen.findByText(/does not meet requirements/i)).toBeInTheDocument();
    });

    it('shows an error when the new and confirmation passwords do not match', async () => {
        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), 'Different1!');
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    });

    // ── Visibility toggle ──────────────────────────────────────────────────────

    it('toggles the password field between hidden and visible', async () => {
        const user = userEvent.setup();
        await renderForm();

        const passwordInput = screen.getByLabelText('New Password', { exact: true });
        expect(passwordInput).toHaveAttribute('type', 'password');

        // The toggle button is scoped inside the MUI InputBase container
        const inputRoot = passwordInput.closest<HTMLElement>('.MuiInputBase-root')!;
        await user.click(within(inputRoot).getByRole('button'));

        expect(passwordInput).toHaveAttribute('type', 'text');
    });

    // ── Successful reset ───────────────────────────────────────────────────────

    it('redirects to /home and synchronises the auth context after a successful reset', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, () =>
                HttpResponse.json({ success: true, data: testUser }),
            ),
        );

        const { mockRefreshUser } = await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }));
        expect(mockRefreshUser).toHaveBeenCalledOnce();
    });

    it('shows an error message and keeps the form when the confirmation API call fails', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, () =>
                HttpResponse.json({ success: false, error: 'Token already used' }),
            ),
        );

        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        expect(await screen.findByText(/token already used/i)).toBeInTheDocument();
        // Form must still be present so the user can retry with a valid token
        expect(screen.getByLabelText('New Password', { exact: true })).toBeInTheDocument();
    });

    // ── Security ───────────────────────────────────────────────────────────────

    it('[security] disables the submit button during an in-flight request to prevent replay attacks', async () => {
        let resolveRequest!: () => void;
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, async () => {
                await new Promise<void>((res) => {
                    resolveRequest = res;
                });
                return HttpResponse.json({ success: true, data: testUser });
            }),
        );

        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        // While the request is pending the button must be disabled
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled(),
        );

        resolveRequest();
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }));
    });

    it('[security] renders API error messages as plain text, not HTML (prevents XSS)', async () => {
        const xssPayload = '<img src=x onerror="window.__xssTest=true">';
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, () =>
                HttpResponse.json({ success: false, error: xssPayload }),
            ),
        );

        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        // Wait for the error to appear as escaped text — this also asserts it is text and not HTML
        await screen.findByText(xssPayload);

        // The payload must not be parsed as an HTML element or execute any script
        expect(document.querySelector('img[src="x"]')).toBeNull();
        expect((window as any).__xssTest).toBeUndefined();
    });

    it('[security] replaces history on redirect so the reset form cannot be re-accessed via the back button', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, () =>
                HttpResponse.json({ success: true, data: testUser }),
            ),
        );

        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        // navigate must be called with replace:true so the reset URL is removed from history
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }),
        );
        // Calling with a plain push (no replace) would be a different call — assert it wasn't used
        expect(mockNavigate).not.toHaveBeenCalledWith('/home', expect.not.objectContaining({ replace: true }));
    });

    it('[security] does not expose the reset token in any input field', async () => {
        await renderForm();

        // Only the two password inputs should exist; none should carry the token value
        const inputs = Array.from(document.querySelectorAll('input'));
        inputs.forEach((input) => {
            expect(input.value).not.toBe(VALID_TOKEN);
            expect(input.name).not.toMatch(/token/i);
        });
    });

    it('[security] treats an already-used or expired token as invalid and hides the password form', async () => {
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/validate`, () =>
                HttpResponse.json({ success: true, data: { valid: false } }),
            ),
        );

        renderPage();

        await waitFor(() =>
            expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
        );
        expect(screen.queryByLabelText('New Password', { exact: true })).not.toBeInTheDocument();
    });

    it('[security] handles a network failure during confirmation without crashing or leaking internals', async () => {
        server.use(
            http.post(`${BASE_URL}/api/auth/reset-password/confirm`, () =>
                HttpResponse.error(),
            ),
        );

        const user = userEvent.setup();
        await renderForm();

        await user.type(screen.getByLabelText('New Password', { exact: true }), VALID_PASSWORD);
        await user.type(screen.getByLabelText('Confirm New Password', { exact: true }), VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: /reset password/i }));

        const errorAlert = await screen.findByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        // Must not surface raw stack traces
        expect(errorAlert.textContent).not.toMatch(/at\s+\w+\s*\(/);
    });
});
