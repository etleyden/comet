import { createContext, useCallback, useContext, useState } from 'react';
import type { AlertColor } from '@mui/material';
import { Alert, Slide, Snackbar, Stack } from '@mui/material';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Notification {
    id: number;
    message: string;
    severity: AlertColor;
}

interface NotificationContextType {
    notify: (message: string, severity?: AlertColor) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

/**
 * Notification system for displaying transient alerts to the user.
 *
 * ## Setup
 * `NotificationProvider` is already mounted at the application root — no additional
 * setup is required in new components.
 *
 * ## Usage
 * Call `useNotification()` inside any component to obtain the `notify` function:
 *
 * ```tsx
 * import { useNotification } from '../context/NotificationContext';
 *
 * function MyComponent() {
 *   const { notify } = useNotification();
 *
 *   const handleSave = async () => {
 *     await save();
 *     notify('Saved successfully!', 'success');
 *   };
 * }
 * ```
 *
 * ## API
 * `notify(message, severity?)`
 * - `message`  — the text to display
 * - `severity` — `'success' | 'info' | 'warning' | 'error'` (default: `'info'`)
 *
 * Notifications appear in the bottom-right corner, stack vertically when multiple
 * are active, auto-dismiss after 5 seconds, and can be closed manually.
 */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let nextId = 0;

const AUTO_HIDE_MS = 5_000;

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notify = useCallback((message: string, severity: AlertColor = 'info') => {
        const id = nextId++;
        setNotifications((prev) => [...prev, { id, message, severity }]);
    }, []);

    const handleClose = useCallback((id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}

            {/* Notification stack — anchored bottom-right */}
            <Stack
                spacing={1}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: (theme) => theme.zIndex.snackbar,
                    maxWidth: 400,
                }}
            >
                {notifications.map((n) => (
                    <Snackbar
                        key={n.id}
                        open
                        autoHideDuration={AUTO_HIDE_MS}
                        onClose={() => handleClose(n.id)}
                        slots={{
                            transition: Slide,
                        }}
                        // Position props are ignored because we manage layout via the
                        // parent Stack, but Snackbar still requires them for the portal.
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        sx={{
                            // Override Snackbar's default fixed positioning so it flows
                            // inside the Stack instead of overlapping other toasts.
                            position: 'static',
                        }}
                    >
                        <Alert
                            severity={n.severity}
                            variant="outlined"
                            onClose={() => handleClose(n.id)}
                            sx={{ width: '100%' }}
                        >
                            {n.message}
                        </Alert>
                    </Snackbar>
                ))}
            </Stack>
        </NotificationContext.Provider>
    );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
