import React, { useState, useEffect } from 'react';
import { Alert, Snackbar, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

const Toast = ({ message, type, duration = 3000, onClose }) => {
  const [open, setOpen] = useState(true);
  
  useEffect(() => {
    // Auto-hide after duration
    const timer = setTimeout(() => {
      setOpen(false);
      setTimeout(onClose, 300); // Allow for close animation
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setTimeout(onClose, 300);
  };

  // Map toast types to Alert severities
  const getSeverity = () => {
    switch (type) {
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        severity={getSeverity()}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
