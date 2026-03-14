import { useState, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import type { Vendor } from 'shared';
import { VendorDisplay, VendorSearch, VendorCreateModal } from '../components/vendor';

const MOCK_VENDORS: Vendor[] = [
  { id: '1', name: 'Walmart', logoUrl: undefined, transactionCount: 1000 },
  { id: '2', name: 'Amazon', logoUrl: undefined, transactionCount: 2450 },
  { id: '3', name: 'Target', url: 'https://target.com', logoUrl: undefined, transactionCount: 350 },
  { id: '4', name: 'Costco', logoUrl: undefined, transactionCount: 87 },
  { id: '5', name: 'Starbucks', logoUrl: undefined, transactionCount: 15432 },
  {
    id: '6',
    name: 'Netflix',
    url: 'https://netflix.com',
    logoUrl: undefined,
    transactionCount: 12,
  },
];

export default function AdminPage() {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);

  const selectedVendor = MOCK_VENDORS.find(v => v.id === selectedVendorId);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Site-wide configuration and analytics will appear here.
      </Typography>

      {/* Vendor Search Demo */}
      <Paper sx={{ p: 3, maxWidth: 500 }}>
        <Typography variant="h6" gutterBottom>
          Vendor Search Demo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This demonstrates the vendor search dropdown with mocked data. The live version in the
          transaction table uses the real API.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2">Selected:</Typography>
          {selectedVendor ? (
            <VendorDisplay name={selectedVendor.name} logoUrl={selectedVendor.logoUrl} />
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              None
            </Typography>
          )}
        </Box>

        <Button ref={anchorRef} variant="outlined" onClick={() => setSearchOpen(true)}>
          Select Vendor
        </Button>

        <VendorSearch
          open={searchOpen}
          anchorEl={anchorRef.current}
          selectedVendorId={selectedVendorId}
          onSelect={vendor => {
            setSelectedVendorId(vendor.id);
            setSearchOpen(false);
          }}
          onCreateNew={text => {
            setCreateInitialName(text);
            setCreateOpen(true);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />

        <VendorCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(vendor: Vendor) => {
            setSelectedVendorId(vendor.id);
          }}
          initialName={createInitialName}
        />
      </Paper>
    </Box>
  );
}
