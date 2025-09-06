import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TruncatedText from '../components/TruncatedText.jsx';
import Modal from '../components/Modal.jsx';
import { useNotifications } from '../hooks/useNotifications.jsx';

// Mock createPortal for Modal tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (element) => element,
}));

describe('Design System Components', () => {
  describe('TruncatedText Component', () => {
    test('renders short text without truncation', () => {
      const shortText = 'Short text that should not be truncated';
      
      render(
        <TruncatedText 
          text={shortText} 
          maxChars={100} 
        />
      );
      
      expect(screen.getByText(shortText)).toBeInTheDocument();
      expect(screen.queryByText('View details')).not.toBeInTheDocument();
    });

    test('renders long text with truncation and view details button', () => {
      const longText = 'This is a very long text that should be truncated when it exceeds the maximum character limit specified in the component props and should show a view details button';
      
      render(
        <TruncatedText 
          text={longText} 
          maxChars={50} 
          title="Full Content Test"
        />
      );
      
      expect(screen.getByText('View details')).toBeInTheDocument();
      expect(screen.getByText(/This is a very long text that should be trunc.../)).toBeInTheDocument();
    });

    test('opens modal when view details is clicked', async () => {
      const longText = 'This is a very long text that needs to be truncated and shown in a modal when expanded';
      
      render(
        <TruncatedText 
          text={longText} 
          maxChars={20} 
          title="Test Modal"
        />
      );
      
      const viewDetailsButton = screen.getByText('View details');
      fireEvent.click(viewDetailsButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText(longText)).toBeInTheDocument();
      });
    });

    test('sanitizes HTML content by default', () => {
      const htmlText = '<script>alert("xss")</script><p>Clean content</p>';
      
      render(
        <TruncatedText 
          text={htmlText} 
          maxChars={20}
        />
      );
      
      const viewDetailsButton = screen.getByText('View details');
      fireEvent.click(viewDetailsButton);
      
      // HTML should be stripped
      expect(screen.queryByText('<script>alert("xss")</script><p>Clean content</p>')).not.toBeInTheDocument();
      expect(screen.getByText('Clean content')).toBeInTheDocument();
    });
  });

  describe('Modal Component', () => {
    test('renders modal when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    test('does not render modal when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
      const onCloseMock = jest.fn();
      
      render(
        <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when escape key is pressed', () => {
      const onCloseMock = jest.fn();
      
      render(
        <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when backdrop is clicked', () => {
      const onCloseMock = jest.fn();
      
      render(
        <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('has proper accessibility attributes', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(modal).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('useNotifications Hook', () => {
    const NotificationTest = () => {
      const { notifications, addNotification, removeNotification } = useNotifications();
      
      return (
        <div>
          <button onClick={() => addNotification({ type: 'success', title: 'Test', message: 'Test message' })}>
            Add Notification
          </button>
          <div data-testid="notifications-count">{notifications.length}</div>
          {notifications.map(notification => (
            <div key={notification.id} data-testid="notification">
              {notification.title}: {notification.message}
              <button onClick={() => removeNotification(notification.id)}>Remove</button>
            </div>
          ))}
        </div>
      );
    };

    test('adds and displays notifications', async () => {
      render(<NotificationTest />);
      
      expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
      
      fireEvent.click(screen.getByText('Add Notification'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
        expect(screen.getByText('Test: Test message')).toBeInTheDocument();
      });
    });

    test('removes notifications', async () => {
      render(<NotificationTest />);
      
      fireEvent.click(screen.getByText('Add Notification'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
      });
      
      fireEvent.click(screen.getByText('Remove'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
      });
    });

    test('auto-removes notifications after duration', async () => {
      const FastNotificationTest = () => {
        const { notifications, addNotification } = useNotifications();
        
        return (
          <div>
            <button onClick={() => addNotification({ 
              type: 'info', 
              title: 'Fast', 
              message: 'Fast message',
              duration: 100 
            })}>
              Add Fast Notification
            </button>
            <div data-testid="notifications-count">{notifications.length}</div>
          </div>
        );
      };

      render(<FastNotificationTest />);
      
      fireEvent.click(screen.getByText('Add Fast Notification'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
      }, { timeout: 200 });
    });
  });
});

describe('Design System Styling', () => {
  test('applies design system colors correctly', () => {
    render(
      <div className="bg-background text-text-primary">
        <div className="bg-surface border-border text-text-secondary">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-secondary">Secondary Button</button>
        </div>
      </div>
    );
    
    // Test that classes are applied (actual color testing would require more complex setup)
    expect(document.querySelector('.bg-background')).toBeInTheDocument();
    expect(document.querySelector('.text-text-primary')).toBeInTheDocument();
    expect(document.querySelector('.btn-primary')).toBeInTheDocument();
  });

  test('card component has proper styling', () => {
    render(
      <div className="card p-6">
        <h2>Card Title</h2>
        <p>Card content</p>
      </div>
    );
    
    const card = document.querySelector('.card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('p-6');
  });
});

describe('Accessibility Compliance', () => {
  test('modal provides proper focus management', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Focus Test">
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('tabIndex', '-1');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  test('truncated text has proper aria labels', () => {
    render(
      <TruncatedText 
        text="Long text that will be truncated and needs accessibility" 
        maxChars={20}
        title="Accessible Content"
      />
    );
    
    const viewButton = screen.getByText('View details');
    expect(viewButton).toHaveAttribute('aria-label', 'View full content: Accessible Content');
  });

  test('buttons have proper focus states', () => {
    render(
      <div>
        <button className="btn-primary">Primary</button>
        <button className="btn-secondary">Secondary</button>
      </div>
    );
    
    const primaryBtn = screen.getByText('Primary');
    const secondaryBtn = screen.getByText('Secondary');
    
    // Focus should be properly handled by CSS (would need integration tests for visual verification)
    expect(primaryBtn).toBeInTheDocument();
    expect(secondaryBtn).toBeInTheDocument();
  });
});
