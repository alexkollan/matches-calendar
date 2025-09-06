import React, { useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

// Create a globally accessible toast management system
let addToast;

// ToastContext for components to access the toast functionality
export const ToastContext = React.createContext({
  showToast: () => {},
});

// Hook to access the toast functionality
export const useToast = () => React.useContext(ToastContext);

// Transition component for the snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

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

  // Handle close of the current toast (only the first one is shown)
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    if (toasts.length > 0) {
      removeToast(toasts[0].id);
    }
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {toasts.length > 0 && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={handleClose}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleClose} 
            severity={toasts[0].type === 'error' ? 'error' : toasts[0].type === 'warning' ? 'warning' : 'success'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toasts[0].message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  );
};

// Export a function to show toasts from anywhere
export const showToast = (message, type = 'success') => {
  if (addToast) {
    return addToast(message, type);
  }
  console.warn('ToastContainer not mounted yet');
  return null;
};

export default ToastContainer;
