// Extracted styles for EventsPage to prevent recreation on every render

export const cardStyles = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
};

export const cardContentStyles = {
  flexGrow: 1
};

export const cardActionsStyles = {
  justifyContent: 'space-between',
  px: 2,
  py: 1.5
};

export const colorBoxStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: 1
};

export const secondaryActionBoxStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: 1
};

export const emptyStateContainerStyles = {
  mt: 8
};

export const emptyStatePaperStyles = {
  p: 4,
  textAlign: 'center'
};

export const emptyStateIconBoxStyles = {
  mb: 3
};

export const emptyStateIconStyles = {
  fontSize: 64,
  color: 'primary.main',
  opacity: 0.5
};

export const filtersPaperStyles = {
  p: 3,
  mb: 3
};

export const formControlStyles = {
  minWidth: 120
};

export const tabStyles = {
  textTransform: 'none',
  fontWeight: 'normal'
};

export const tabsStyles = {
  borderBottom: 1,
  borderColor: 'divider',
  mb: 2
};
