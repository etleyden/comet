import { Box, Typography, Avatar } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

export interface VendorDisplayProps {
  name: string;
  logoUrl?: string;
  /** Size of the avatar in pixels */
  size?: number;
}

/**
 * Displays a vendor with its logo (or placeholder icon) and canonical name.
 * Reused in the transaction table and vendor search dropdown.
 */
export default function VendorDisplay({ name, logoUrl, size = 24 }: VendorDisplayProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Avatar
        src={logoUrl}
        alt={name}
        sx={{ width: size, height: size, bgcolor: 'action.selected', fontSize: size * 0.5 }}
      >
        {!logoUrl && <StorefrontIcon sx={{ fontSize: size * 0.65 }} />}
      </Avatar>
      <Typography variant="body2" noWrap>
        {name}
      </Typography>
    </Box>
  );
}
