import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { http, HttpResponse } from 'msw';
import { server } from '../../__tests__/mocks/server';
import { theme } from '../../theme';
import AccountSelection from './AccountSelection';
import type { ApiResponse, Account } from 'shared';

// Start MSW server for network-level interception
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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

describe('AccountSelection (Integration)', () => {
  it('should fetch and display accounts from the API', async () => {
    renderAccountSelection();

    // Should start with a disabled select (loading state)
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-disabled', 'true');

    // Wait for accounts to load (MSW default handler returns testAccount and testAccount2)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('should display an error when the API returns a failure response', async () => {
    // Override the default handler to return an error
    server.use(
      http.get('https://localhost:86/api/accounts', () => {
        const response: ApiResponse<Account[]> = {
          success: false,
          error: 'Unauthorized access',
        };
        return HttpResponse.json(response);
      })
    );

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unauthorized access');
    });
  });

  it('should display an error when the network request fails', async () => {
    server.use(
      http.get('https://localhost:86/api/accounts', () => {
        return HttpResponse.error();
      })
    );

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
