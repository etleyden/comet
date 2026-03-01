import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import Register from './Register';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRegister = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ register: mockRegister }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderRegister(props: { onCancel?: () => void } = {}) {
    return render(
        <ThemeProvider theme={theme}>
            <Register {...props} />
        </ThemeProvider>,
    );
}

/** Types into name/email/password fields using a userEvent instance (no delay). */
async function fillForm(
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    email: string,
    password: string,
) {
    await user.type(screen.getByRole('textbox', { name: /name/i }), name);
    await user.type(screen.getByRole('textbox', { name: /email/i }), email);
    // type="password" inputs have no "textbox" role; match the label exactly to
    // avoid also matching the "toggle password visibility" IconButton aria-label.
    await user.type(screen.getByLabelText('Password', { exact: true }), password);
}

async function clickRegister(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /register/i }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Register', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders name, email, and password fields', () => {
        renderRegister();

        expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument();
    });

    it('renders the Register and Cancel buttons when onCancel is provided', () => {
        renderRegister({ onCancel: vi.fn() });

        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('does not render a Cancel button when onCancel is omitted', () => {
        renderRegister();

        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    // ─── Password validation ────────────────────────────────────────────────────

    describe('password validation', () => {
        it('shows an error and does not call register when the password is too short', async () => {
            const user = userEvent.setup();
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Ab1!');
            await clickRegister(user);

            expect(screen.getByText(/password does not meet requirements/i)).toBeInTheDocument();
            expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('shows an error and does not call register when the password has no letter', async () => {
            const user = userEvent.setup();
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', '12345678!');
            await clickRegister(user);

            expect(screen.getByText(/at least 1 letter/i)).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('shows an error and does not call register when the password has no number', async () => {
            const user = userEvent.setup();
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Password!');
            await clickRegister(user);

            expect(screen.getByText(/at least 1 number/i)).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('shows an error and does not call register when the password has no special character', async () => {
            const user = userEvent.setup();
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Password1');
            await clickRegister(user);

            expect(screen.getByText(/at least 1 special character/i)).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('lists all failing rules in the error when multiple requirements are not met', async () => {
            const user = userEvent.setup();
            renderRegister();

            // Only letters — missing number, special char, and is short enough to fail minLength
            await fillForm(user, 'Alice', 'alice@example.com', 'abc');
            await clickRegister(user);

            const errorText = screen.getByText(/password does not meet requirements/i).textContent ?? '';
            expect(errorText).toMatch(/at least 8 characters/i);
            expect(errorText).toMatch(/at least 1 number/i);
            expect(errorText).toMatch(/at least 1 special character/i);
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('calls register with valid credentials when all password rules pass', async () => {
            const user = userEvent.setup();
            mockRegister.mockResolvedValue(undefined);
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Secure1!');
            await clickRegister(user);

            expect(mockRegister).toHaveBeenCalledWith('Alice', 'alice@example.com', 'Secure1!');
            expect(screen.queryByText(/password does not meet requirements/i)).not.toBeInTheDocument();
        });

        it('clears the form fields after a successful registration', async () => {
            const user = userEvent.setup();
            mockRegister.mockResolvedValue(undefined);
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Secure1!');
            await clickRegister(user);

            expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('');
            expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('');
            expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
        });

        it('calls onCancel after a successful registration', async () => {
            const user = userEvent.setup();
            mockRegister.mockResolvedValue(undefined);
            const onCancel = vi.fn();
            renderRegister({ onCancel });

            await fillForm(user, 'Alice', 'alice@example.com', 'Secure1!');
            await clickRegister(user);

            expect(onCancel).toHaveBeenCalledOnce();
        });
    });

    // ─── API error handling ─────────────────────────────────────────────────────

    describe('API error handling', () => {
        it('shows the error message when register throws', async () => {
            const user = userEvent.setup();
            mockRegister.mockRejectedValue(new Error('Email already in use'));
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Secure1!');
            await clickRegister(user);

            expect(await screen.findByText(/email already in use/i)).toBeInTheDocument();
        });

        it('shows a fallback message when register throws a non-Error', async () => {
            const user = userEvent.setup();
            mockRegister.mockRejectedValue('unexpected');
            renderRegister();

            await fillForm(user, 'Alice', 'alice@example.com', 'Secure1!');
            await clickRegister(user);

            expect(await screen.findByText(/registration failed/i)).toBeInTheDocument();
        });
    });
});
