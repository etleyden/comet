import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText, Box,
    Divider,
    Typography,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ScienceIcon from '@mui/icons-material/Science';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { healthApi } from '../../../api';

export const DRAWER_WIDTH = 260;
export const DRAWER_MARGIN = 12;

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

const authenticatedNavItems: NavItem[] = [
    { label: 'Home', path: '/home', icon: <HomeIcon /> },
    { label: 'Upload', path: '/upload', icon: <UploadFileIcon /> },
    { label: 'Experiments', path: '/experiments', icon: <ScienceIcon /> },
];

const publicNavItems: NavItem[] = [
    { label: 'Login', path: '/login', icon: <LoginIcon /> },
];

export default function SiteDrawer() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'loading'>('loading');

    const checkHealth = useCallback(async () => {
        setApiStatus('loading');
        try {
            await healthApi.check();
            setApiStatus('ok');
        } catch {
            setApiStatus('error');
        }
    }, []);

    // Re-check on every page navigation
    useEffect(() => {
        checkHealth();
    }, [location.pathname, checkHealth]);

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

    return (
        <>
            <Drawer
                anchor="left"
                variant="permanent"
                slotProps={{
                    paper: {
                        elevation: 2
                    }
                }}
                sx={{
                    width: DRAWER_WIDTH + DRAWER_MARGIN * 2,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        margin: `${DRAWER_MARGIN}px`,
                        height: `calc(100% - ${DRAWER_MARGIN * 2}px)`,
                        borderRadius: 2,
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" noWrap>
                        Comet
                    </Typography>
                    {isAuthenticated && user && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {user.name}
                        </Typography>
                    )}
                </Box>

                <Divider />

                <List>
                    {navItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                selected={location.pathname === item.path}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                <Box sx={{ flexGrow: 1 }} />

                <Divider />
                <List>
                    {isAuthenticated && (
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleLogout}>
                                <ListItemIcon><LogoutIcon /></ListItemIcon>
                                <ListItemText primary="Logout" />
                            </ListItemButton>
                        </ListItem>
                    )}
                    <ListItem disablePadding>
                        <Tooltip title="Click to refresh" placement="right">
                            <ListItemButton onClick={checkHealth} disabled={apiStatus === 'loading'}>
                                <ListItemIcon>
                                    {apiStatus === 'loading' ? (
                                        <CircularProgress size={16} sx={{ mx: '4px' }} />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                mx: '6px',
                                                bgcolor: apiStatus === 'ok' ? 'success.main' : 'error.main',
                                                boxShadow: apiStatus === 'ok'
                                                    ? '0 0 6px 2px rgba(76,175,80,0.5)'
                                                    : '0 0 6px 2px rgba(244,67,54,0.5)',
                                            }}
                                        />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={apiStatus === 'ok' ? 'API OK' : apiStatus === 'error' ? 'API Error' : 'Checking…'}
                                    slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                                />
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>
                </List>
            </Drawer>
        </>
    );
}
