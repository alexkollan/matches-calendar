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
  
  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'border-accent text-accent bg-accent/10';
      case 'success':
        return 'border-success text-success bg-success/10';
      case 'warning':
        return 'border-yellow-500 text-yellow-500 bg-yellow-500/10';
      default:
        return 'border-border text-text-primary bg-surface';
    }
  };
  
  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 p-4 rounded-default border shadow-app max-w-sm
        transition-all duration-300 transform
        ${getTypeStyles()}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 text-current hover:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
