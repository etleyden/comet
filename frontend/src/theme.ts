import { createTheme } from '@mui/material/styles';
import { blue, green } from '@mui/material/colors';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: blue, // for some reason these shades are better than the default
    success: green,
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
      },
    },
  },
});
