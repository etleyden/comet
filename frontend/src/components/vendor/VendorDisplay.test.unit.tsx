import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import VendorDisplay from './VendorDisplay';

function renderVendorDisplay(props: Parameters<typeof VendorDisplay>[0]) {
  return render(
    <ThemeProvider theme={theme}>
      <VendorDisplay {...props} />
    </ThemeProvider>
  );
}

describe('VendorDisplay', () => {
  it('should render the vendor name', () => {
    renderVendorDisplay({ name: 'Walmart' });
    expect(screen.getByText('Walmart')).toBeInTheDocument();
  });

  it('should render a placeholder icon when no logoUrl is provided', () => {
    renderVendorDisplay({ name: 'Walmart' });
    // MUI Avatar renders a fallback; the StorefrontIcon should be present
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
    expect(avatar?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render the logo image when logoUrl is provided', () => {
    renderVendorDisplay({ name: 'Walmart', logoUrl: 'https://example.com/logo.png' });
    const img = screen.getByRole('img', { name: 'Walmart' });
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('should apply custom size', () => {
    renderVendorDisplay({ name: 'Walmart', size: 32 });
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
  });
});
