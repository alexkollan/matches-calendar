import { useState, useCallback } from 'react';

/**
 * Simple notification hook for showing toast messages
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    setTimeout(() => {
      removeNotification(id);
    }, newNotification.duration);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
}

/**
 * Notification component
 */
export function NotificationContainer({ notifications, onRemove }) {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`card p-4 max-w-sm shadow-app animate-slide-in-right ${
            notification.type === 'error' ? 'border-accent' :
            notification.type === 'success' ? 'border-success' :
            notification.type === 'warning' ? 'border-yellow-500' :
            'border-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {notification.title && (
                <h4 className="font-medium text-text-primary mb-1">
                  {notification.title}
                </h4>
              )}
              <p className="text-sm text-text-secondary">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
