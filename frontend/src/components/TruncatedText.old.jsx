import React, { useState, useMemo } from 'react';
import Modal from './Modal.jsx';

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
      <span className={className}>
        {displayText}
      </span>
    );
  }

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Sanitize content for modal display
  const modalContent = sanitize ? text.replace(/<[^>]*>/g, '') : text;

  return (
    <>
      <div className={`${className} space-y-2`}>
        <p 
          className={`text-text-primary ${maxLines === 1 ? 'truncate-1' : maxLines === 2 ? 'truncate-2' : 'truncate-3'}`}
          title={text}
        >
          {displayText}
        </p>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1 text-sm text-accent hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 py-1"
          aria-label={`View full content: ${title}`}
        >
          <span>View details</span>
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={title}
        maxWidth="4xl"
      >
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-text-primary leading-relaxed">
            {modalContent}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default TruncatedText;
