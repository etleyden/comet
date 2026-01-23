import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    components: {
        MuiButton: {
            defaultProps: {
                variant: 'contained',
            },
        },
    },
});