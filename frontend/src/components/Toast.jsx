import React, { useState, useEffect } from 'react';

const Toast = ({ message, type, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Show the toast
    setVisible(true);
    
    // Set timers to hide and then remove the toast
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, duration - 300);
    
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);
    
    // Clear timers on component unmount
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);
  
  return (
    <div className={`toast-notification ${type} ${visible ? 'show' : 'hide'}`}>
      {message}
    </div>
  );
};

export default Toast;
