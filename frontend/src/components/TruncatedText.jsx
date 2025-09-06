import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { KeyboardArrowRight, Close } from '@mui/icons-material';

/**
 * Reusable text truncation component with modal expansion
 * @param {Object} props
 * @param {string} props.text - The text content to display
 * @param {number} props.maxChars - Maximum characters before truncation (default: 100)
 * @param {number} props.maxLines - Maximum lines for visual truncation (default: 2)
 * @param {string} props.title - Optional title for the modal
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.sanitize - Whether to sanitize HTML content (default: true)
 */
function TruncatedText({ 
  text, 
  maxChars = 100, 
  maxLines = 2, 
  title = "Full Content", 
  className = "",
  sanitize = true 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Memoize truncation logic
  const { isLong, displayText, shouldTruncate } = useMemo(() => {
    if (!text) return { isLong: false, displayText: '', shouldTruncate: false };

    const cleanText = sanitize ? text.replace(/<[^>]*>/g, '') : text;
    const isLong = cleanText.length > maxChars;
    const displayText = isLong ? cleanText.substring(0, maxChars) + '...' : cleanText;
    
    return {
      isLong,
      displayText,
      shouldTruncate: isLong
    };
  }, [text, maxChars, sanitize]);

  // If text is short, render directly
  if (!shouldTruncate) {
    return (
      <Typography className={className} component="span">
        {displayText}
      </Typography>
    );
  }

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Sanitize content for modal display
  const modalContent = sanitize ? text.replace(/<[^>]*>/g, '') : text;

  return (
    <>
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography 
          title={text}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {displayText}
        </Typography>
        
        <Button
          size="small"
          startIcon={<KeyboardArrowRight />}
          onClick={handleOpenModal}
          sx={{ 
            alignSelf: 'flex-start',
            textTransform: 'none',
            fontSize: '0.875rem'
          }}
        >
          View details
        </Button>
      </Box>

      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title}
          <IconButton
            onClick={handleCloseModal}
            size="small"
            sx={{ ml: 1 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography 
            component="div" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6 
            }}
          >
            {modalContent}
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseModal}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TruncatedText;
