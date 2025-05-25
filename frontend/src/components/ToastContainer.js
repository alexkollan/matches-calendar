import React, { useState, useCallback } from 'react';
import Toast from './Toast';

// Create a globally accessible toast management system
let addToast;

// ToastContext for components to access the toast functionality
export const ToastContext = React.createContext({
  showToast: () => {},
});

// Hook to access the toast functionality
export const useToast = () => React.useContext(ToastContext);

// ToastContainer component that manages the toasts
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  
  // Function to add a new toast
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    return id;
  }, []);
  
  // Expose the showToast function globally
  addToast = showToast;
  
  // Function to remove a toast by ID
  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Export a function to show toasts from anywhere
export const showToast = (message, type) => {
  if (addToast) {
    return addToast(message, type);
  }
  return null;
};

export default ToastContainer;
