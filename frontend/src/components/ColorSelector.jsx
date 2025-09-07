import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  Chip,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { Circle } from '@mui/icons-material';
import { CALENDAR_COLORS, getCalendarColorById } from '../constants/calendarColors.js';

// Static style objects to prevent recreation on every render
const menuProps = {
  disablePortal: false,
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'left'
  },
  transformOrigin: {
    vertical: 'top',
    horizontal: 'left'
  }
};

const renderValueBoxStyles = {
  display: 'flex', 
  alignItems: 'center', 
  gap: 1,
  height: '100%',
  minHeight: 20
};

const circleStyles = {
  fontSize: 16,
  filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))',
  display: 'flex',
  alignItems: 'center'
};

const typographyStyles = {
  fontSize: '0.875rem',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center'
};

const menuItemStyles = {
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  }
};

const listItemIconStyles = { 
  minWidth: 36, 
  display: 'flex', 
  alignItems: 'center' 
};

const menuItemCircleStyles = {
  fontSize: 18,
  filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))'
};

const listItemTextProps = { 
  fontSize: '0.875rem',
  sx: { display: 'flex', alignItems: 'center' }
};

/**
 * ColorSelector component for selecting Google Calendar event colors
 */
const ColorSelector = memo(({ 
  value, 
  onChange, 
  size = 'small', 
  disabled = false,
  showLabel = true,
  variant = 'outlined'
}) => {
  const [open, setOpen] = useState(false);
  const selectedColor = getCalendarColorById(value);

  const handleChange = useCallback((event) => {
    onChange(event.target.value);
    setOpen(false);
  }, [onChange]);

  const handleOpen = useCallback((event) => {
    event.stopPropagation(); // Prevent card/parent click events
    setOpen(true);
  }, []);

  const handleClose = useCallback((event) => {
    if (event) {
      event.stopPropagation(); // Prevent card/parent click events
    }
    setOpen(false);
  }, []);

  const handleMenuClick = useCallback((e) => e.stopPropagation(), []);
  const handleFormControlClick = useCallback((e) => e.stopPropagation(), []);

  // Memoize renderValue function
  const renderValue = useCallback((selected) => {
    const color = getCalendarColorById(selected);
    return (
      <Box sx={renderValueBoxStyles}>
        <Circle 
          sx={{ 
            ...circleStyles,
            color: color.background
          }} 
        />
        {showLabel && (
          <Typography 
            variant="body2" 
            sx={typographyStyles}
          >
            {color.name}
          </Typography>
        )}
      </Box>
    );
  }, [showLabel]);

  // Memoize form control styles
  const formControlStyles = useMemo(() => ({
    minWidth: showLabel ? 140 : 60
  }), [showLabel]);

  // Memoize select styles
  const selectStyles = useMemo(() => ({
    '& .MuiSelect-select': {
      paddingY: showLabel ? 1 : 0.75,
      paddingX: 1.5,
      display: 'flex',
      alignItems: 'center',
      minHeight: 'auto'
    },
    '& .MuiSelect-icon': {
      right: 4
    }
  }), [showLabel]);

  // Memoize enhanced menu props with handlers
  const enhancedMenuProps = useMemo(() => ({
    ...menuProps,
    onClick: handleMenuClick
  }), [handleMenuClick]);

  return (
    <FormControl 
      size={size} 
      disabled={disabled} 
      sx={formControlStyles}
      onClick={handleFormControlClick}
    >
      <Select
        value={value}
        onChange={handleChange}
        onOpen={handleOpen}
        onClose={handleClose}
        open={open}
        variant={variant}
        displayEmpty
        MenuProps={enhancedMenuProps}
        renderValue={renderValue}
        sx={selectStyles}
      >
        {CALENDAR_COLORS.map((color) => (
          <MenuItem 
            key={color.id} 
            value={color.id}
            onClick={handleMenuClick}
            sx={menuItemStyles}
          >
            <ListItemIcon sx={listItemIconStyles}>
              <Circle 
                sx={{ 
                  ...menuItemCircleStyles,
                  color: color.background
                }} 
              />
            </ListItemIcon>
            <ListItemText 
              primary={color.name}
              primaryTypographyProps={listItemTextProps}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

export default ColorSelector;
