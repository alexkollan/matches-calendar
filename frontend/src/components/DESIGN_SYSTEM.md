# Design System Documentation

## Overview

This is the unified dark-mode design system for the Sports Calendar app, built with React 19, Tailwind CSS 4, and accessibility best practices (WCAG AA compliance).

## Design Tokens

### Colors

```css
--background: #0B0F12;     /* Main app background */
--surface: #0F1720;        /* Cards, containers, navigation */
--text-primary: #EAEAEA;   /* Primary text color */
--text-secondary: #A1A1A1; /* Secondary text color */
--accent: #FF5252;         /* Primary accent color */
--border: #1F2937;         /* Border color */
--success: #22C55E;        /* Success state color */
```

### Typography

- **Font Family**: Inter (Google Fonts)
- **Font Features**: OpenType features enabled (`cv11`, `ss01`)
- **Weights**: 300, 400, 500, 600, 700

### Spacing & Layout

- **Border Radius**: 12px default
- **Shadow**: `0 6px 18px rgba(0,0,0,0.6)`
- **Focus Ring**: 2px solid accent color with 2px offset

## Core Components

### TruncatedText

A reusable component for handling long text content with modal expansion.

**Props:**
- `text` (string): The content to display
- `maxChars` (number): Maximum characters before truncation (default: 100)
- `maxLines` (number): Maximum lines for visual truncation (default: 2)
- `title` (string): Modal title when expanded
- `className` (string): Additional CSS classes
- `sanitize` (boolean): Whether to strip HTML tags (default: true)

**Example:**
```jsx
<TruncatedText 
  text="Long event description..."
  maxChars={120}
  maxLines={2}
  title="Event Details"
  className="text-text-secondary"
/>
```

### Modal

An accessible modal overlay component with focus trap and keyboard navigation.

**Props:**
- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal should close
- `title` (string): Modal title (required for accessibility)
- `children` (ReactNode): Modal content
- `maxWidth` (string): Tailwind max-width class (default: '2xl')
- `closeOnBackdrop` (boolean): Allow backdrop click to close (default: true)
- `closeOnEscape` (boolean): Allow ESC key to close (default: true)

**Accessibility Features:**
- Focus trap with proper tab navigation
- ARIA attributes (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Keyboard navigation (ESC to close)
- Focus restoration when closed
- Screen reader announcements

**Example:**
```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Event Details"
  maxWidth="4xl"
>
  <div>Modal content here</div>
</Modal>
```

### useNotifications Hook

A notification system for displaying toast messages.

**Returns:**
- `notifications` (array): Current notifications
- `addNotification` (function): Add a new notification
- `removeNotification` (function): Remove a notification by ID

**Notification Object:**
```javascript
{
  id: number,           // Auto-generated
  type: 'info' | 'success' | 'error' | 'warning',
  title: string,        // Optional
  message: string,      // Required
  duration: number      // Default: 5000ms
}
```

**Example:**
```jsx
const { notifications, addNotification, removeNotification } = useNotifications();

// Add notification
addNotification({
  type: 'success',
  title: 'Success!',
  message: 'Calendar event created'
});

// Render notifications
<NotificationContainer 
  notifications={notifications} 
  onRemove={removeNotification} 
/>
```

## CSS Classes

### Button Classes

```css
.btn-primary {
  background-color: var(--accent);
  color: white;
  border-radius: var(--radius);
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 1.5rem;
}
```

### Card Classes

```css
.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
```

### Text Truncation Utilities

```css
.truncate-1 { -webkit-line-clamp: 1; line-clamp: 1; }
.truncate-2 { -webkit-line-clamp: 2; line-clamp: 2; }
.truncate-3 { -webkit-line-clamp: 3; line-clamp: 3; }
```

## Tailwind Configuration

### Custom Colors

```javascript
colors: {
  background: '#0B0F12',
  surface: '#0F1720',
  'text-primary': '#EAEAEA',
  'text-secondary': '#A1A1A1',
  accent: '#FF5252',
  border: '#1F2937',
  success: '#22C55E',
}
```

### Custom Utilities

```javascript
borderRadius: {
  'default': '12px',
},
boxShadow: {
  'app': '0 6px 18px rgba(0,0,0,0.6)',
},
```

## Layout Structure

### Sidebar Navigation

- Fixed position with responsive width (64px collapsed, 256px expanded)
- Smooth transitions and hover states
- Context-aware active states
- Quick stats and sync status display

### Header

- Sticky positioning with backdrop blur
- Page-specific icons and descriptions
- Status indicators and quick actions
- Error and loading state displays

### Main Content

- Responsive container with proper spacing
- Card-based layout for content sections
- Grid and list view toggles for data display

## Accessibility Compliance

### WCAG AA Standards

- **Color Contrast**: All text meets 4.5:1 ratio against backgrounds
- **Focus Management**: Visible focus indicators on all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Motion**: Respects `prefers-reduced-motion` settings

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Screen Reader Support

All interactive elements have appropriate ARIA labels:
- Buttons include descriptive labels
- Modals have proper dialog roles
- Form inputs have associated labels
- Status messages are announced

## Animation System

### CSS Animations

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

### Usage

- Loading spinners: `.loading-spinner`
- Toast notifications: `.animate-slide-in-right`
- Smooth transitions on hover and focus states

## Implementation Guidelines

### Component Development

1. **Use semantic HTML** - Start with proper HTML elements
2. **Add ARIA attributes** - Enhance accessibility with ARIA
3. **Include focus management** - Handle keyboard navigation
4. **Test with screen readers** - Verify announcements work
5. **Respect motion preferences** - Consider reduced motion settings

### Styling Approach

1. **Use design tokens** - Leverage CSS custom properties
2. **Apply Tailwind utilities** - Prefer utility classes over custom CSS
3. **Maintain consistency** - Follow established patterns
4. **Test color contrast** - Verify accessibility standards
5. **Responsive design** - Mobile-first approach

### Testing Requirements

1. **Unit tests** - Test component logic and props
2. **Accessibility tests** - Verify ARIA attributes and keyboard navigation
3. **Visual regression** - Ensure consistent appearance
4. **Cross-browser** - Test in modern browsers
5. **Mobile testing** - Verify responsive behavior

## Migration Notes

### From Legacy Components

1. Replace old color classes with design system tokens
2. Update button styles to use new `.btn-*` classes
3. Wrap long text with `TruncatedText` component
4. Replace old modals with new `Modal` component
5. Update loading states to use `.loading-spinner`

### Breaking Changes

- Removed emoji icons in favor of SVG icons
- Updated color palette to dark theme
- Changed button styling approach
- Implemented new truncation pattern
- Modified modal implementation

## Performance Considerations

### Optimizations

- **Tree shaking** - Only import used components
- **Lazy loading** - Modal content loaded on demand
- **Memoization** - TruncatedText uses useMemo for truncation logic
- **Portal rendering** - Modals rendered outside component tree
- **CSS-in-JS minimization** - Prefer CSS classes over inline styles

### Bundle Size

- Core design system adds minimal overhead
- Reusable components reduce code duplication
- Tailwind purges unused styles in production
- Inter font loaded via Google Fonts CDN

## Browser Support

- **Modern browsers** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers** - iOS Safari 14+, Chrome Mobile 90+
- **CSS Grid** - Full support for layout
- **CSS Custom Properties** - Full support for theming
- **ES6+ Features** - Requires transpilation for older browsers
