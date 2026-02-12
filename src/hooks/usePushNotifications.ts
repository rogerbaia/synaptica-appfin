import { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';

export function usePushNotifications() {
    const { isPlatinum } = useSubscription();
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!isPlatinum) {
            alert("Las notificaciones móviles requieren el plan Platinum.");
            return false;
        }

        if (!('Notification' in window)) {
            alert("Este navegador no soporta notificaciones.");
            return false;
        }

        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            // Setup service worker or simple notification demo
            sendWelcomeNotification();
        }
        return result === 'granted';
    };

    const sendWelcomeNotification = () => {
        if (permission === 'granted' || Notification.permission === 'granted') {
            try {
                // Check if Service Worker is ready (for potential mobile push)
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification('Synaptica Platinum', {
                            body: '¡Notificaciones activadas! Te avisaremos de tus pagos.',
                            icon: '/icon-192x192.png', // Assuming we have one or defaults
                            // vibrate: [200, 100, 200]
                            data: { dateOfArrival: Date.now(), primaryKey: 1 }
                        });
                    });
                } else {
                    // Fallback to simple Notification API
                    new Notification("Synaptica Platinum", {
                        body: "¡Notificaciones activadas! Te avisaremos de tus pagos."
                    });
                }
            } catch (e) {
                console.error("Error sending notification", e);
            }
        }
    };

    return {
        permission,
        requestPermission,
        isEnabled: permission === 'granted'
    };
}
