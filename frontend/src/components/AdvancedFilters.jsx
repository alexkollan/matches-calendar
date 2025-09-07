import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  Grid,
  Menu,
  ListItemIcon,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  FilterList,
  Save,
  Clear,
  Help,
  Visibility,
  VisibilityOff,
  FileUpload,
  FileDownload,
  ArrowDropDown,
  ContentCopy,
  Code
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext.jsx';
import { DatabaseService } from '../services/db.js';
import { FilterService } from '../services/filterService.js';

/**
 * Advanced keyword-based filter system
 * Supports OR and NOT logic with persistent storage
 */
function AdvancedFilters({ open, onClose, onApplyFilters }) {
  const { state, updatePreferences } = useApp();
  
  // Filter state
  const [filters, setFilters] = useState([]);
  const [savedFilterSets, setSavedFilterSets] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [filterName, setFilterName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Export state
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState(''); // 'json' or 'base64'
  const [exportedContent, setExportedContent] = useState('');
  const [contentCopied, setContentCopied] = useState(false);
  
  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFormat, setImportFormat] = useState('paste'); // 'paste' or 'file'
  const [importContent, setImportContent] = useState('');
  const [importError, setImportError] = useState('');

  // Filter types
  const FILTER_TYPES = {
    INCLUDE: 'include', // OR logic - match any
    EXCLUDE: 'exclude'  // NOT logic - exclude if match
  };

  // Load saved filters on component mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  /**
   * Load saved filter sets from IndexedDB
   */
  const loadSavedFilters = async () => {
    try {
      const preferences = await DatabaseService.getPreferences();
      if (preferences?.advancedFilters) {
        setFilters(preferences.advancedFilters.currentFilters || []);
        setSavedFilterSets(preferences.advancedFilters.savedSets || []);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  };

  /**
   * Save current filters to IndexedDB
   */
  const saveFiltersToDb = async (newFilters = filters, newSavedSets = savedFilterSets) => {
    try {
      const preferences = await DatabaseService.getPreferences();
      const updatedPreferences = {
        ...preferences,
        advancedFilters: {
          currentFilters: newFilters,
          savedSets: newSavedSets,
          lastUpdated: new Date().toISOString()
        }
      };
      await DatabaseService.updatePreferences(updatedPreferences);
      await updatePreferences({ advancedFilters: updatedPreferences.advancedFilters });
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  };

  /**
   * Add a new keyword filter
   */
  const addKeywordFilter = () => {
    if (!newKeyword.trim()) return;
    
    const newFilter = {
      id: Date.now(),
      keyword: newKeyword.trim(),
      type: FILTER_TYPES.INCLUDE,
      enabled: true,
      caseSensitive: false,
      exactMatch: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedFilters = [...filters, newFilter];
    setFilters(updatedFilters);
    setNewKeyword('');
    saveFiltersToDb(updatedFilters);
  };

  /**
   * Remove a keyword filter
   */
  const removeFilter = (filterId) => {
    const updatedFilters = filters.filter(filter => filter.id !== filterId);
    setFilters(updatedFilters);
    saveFiltersToDb(updatedFilters);
  };

  /**
   * Update filter properties
   */
  const updateFilter = (filterId, updates) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    setFilters(updatedFilters);
    saveFiltersToDb(updatedFilters);
  };

  /**
   * Toggle filter enabled state
   */
  const toggleFilter = (filterId) => {
    updateFilter(filterId, { enabled: !filters.find(f => f.id === filterId)?.enabled });
  };

  /**
   * Clear all filters
   */
  const clearAllFilters = () => {
    setFilters([]);
    saveFiltersToDb([]);
  };

  /**
   * Save current filter set with a name
   */
  const saveFilterSet = () => {
    if (!filterName.trim()) return;
    
    const newFilterSet = {
      id: Date.now(),
      name: filterName.trim(),
      filters: [...filters],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    const updatedSavedSets = [...savedFilterSets, newFilterSet];
    setSavedFilterSets(updatedSavedSets);
    saveFiltersToDb(filters, updatedSavedSets);
    setFilterName('');
    setSaveDialogOpen(false);
  };

  /**
   * Load a saved filter set
   */
  const loadFilterSet = (filterSet) => {
    setFilters(filterSet.filters);
    
    // Update last used timestamp
    const updatedSavedSets = savedFilterSets.map(set =>
      set.id === filterSet.id 
        ? { ...set, lastUsed: new Date().toISOString() }
        : set
    );
    setSavedFilterSets(updatedSavedSets);
    saveFiltersToDb(filterSet.filters, updatedSavedSets);
  };

  /**
   * Delete a saved filter set
   */
  const deleteFilterSet = (filterSetId) => {
    const updatedSavedSets = savedFilterSets.filter(set => set.id !== filterSetId);
    setSavedFilterSets(updatedSavedSets);
    saveFiltersToDb(filters, updatedSavedSets);
  };

  /**
   * Apply current filters and close dialog
   */
  const handleApplyFilters = () => {
    const enabledFilters = filters.filter(filter => filter.enabled);
    onApplyFilters(enabledFilters);
    onClose();
  };

  /**
   * Handle export menu click
   */
  const handleExportMenuClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  /**
   * Handle export menu close
   */
  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  /**
   * Handle export option selection
   */
  const handleExportOption = (format) => {
    setExportFormat(format);
    setExportMenuAnchor(null);
    
    try {
      let content;
      if (format === 'json') {
        content = FilterService.exportFilters(filters);
      } else if (format === 'base64') {
        content = FilterService.exportFiltersAsString(filters);
      }
      
      setExportedContent(content);
      setExportDialogOpen(true);
      setContentCopied(false);
    } catch (error) {
      console.error('Failed to export filters:', error);
      setImportError('Failed to export filters');
    }
  };

  /**
   * Copy exported content to clipboard
   */
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setContentCopied(true);
      setTimeout(() => setContentCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setImportError('Failed to copy to clipboard');
    }
  };

  /**
   * Download exported content as file
   */
  const handleDownloadFile = () => {
    try {
      const blob = new Blob([exportedContent], { 
        type: exportFormat === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filters-${new Date().toISOString().split('T')[0]}.${exportFormat === 'json' ? 'json' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      setImportError('Failed to download file');
    }
  };

  /**
   * Handle import from pasted content
   */
  const handleImportFromContent = () => {
    try {
      setImportError('');
      let importedFilters;
      
      // Try to determine if it's base64 or JSON
      const trimmedContent = importContent.trim();
      
      if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
        // Looks like JSON
        importedFilters = FilterService.importFilters(trimmedContent);
      } else {
        // Assume it's base64
        importedFilters = FilterService.importFiltersFromString(trimmedContent);
      }
      
      setFilters(importedFilters);
      saveFiltersToDb(importedFilters);
      setImportContent('');
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Failed to import filters:', error);
      setImportError(`Failed to import filters: ${error.message}`);
    }
  };

  /**
   * Handle file upload for import
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setImportContent(e.target.result);
        setImportError('');
      } catch (error) {
        setImportError('Invalid file format');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  /**
   * Get filter summary for display
   */
  const getFilterSummary = () => {
    const enabledFilters = filters.filter(filter => filter.enabled);
    const includeFilters = enabledFilters.filter(filter => filter.type === FILTER_TYPES.INCLUDE);
    const excludeFilters = enabledFilters.filter(filter => filter.type === FILTER_TYPES.EXCLUDE);
    
    return {
      total: enabledFilters.length,
      include: includeFilters.length,
      exclude: excludeFilters.length
    };
  };

  const filterSummary = getFilterSummary();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            <Typography variant="h6">Advanced Filters</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Help">
              <IconButton onClick={() => setHelpDialogOpen(true)} size="small">
                <Help />
              </IconButton>
            </Tooltip>
            <Tooltip title={previewMode ? "Exit Preview" : "Preview Mode"}>
              <IconButton onClick={() => setPreviewMode(!previewMode)} size="small">
                {previewMode ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {filterSummary.total > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {filterSummary.include} include filters, {filterSummary.exclude} exclude filters
            </Typography>
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pb: 0 }}>
        <Stack spacing={3}>
          {/* Add New Filter */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add Keyword Filter
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword to filter..."
                size="small"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && addKeywordFilter()}
              />
              <Button
                variant="contained"
                onClick={addKeywordFilter}
                disabled={!newKeyword.trim()}
                startIcon={<Add />}
              >
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Current Filters */}
          {filters.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Current Filters ({filters.length})
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={clearAllFilters}
                  startIcon={<Clear />}
                >
                  Clear All
                </Button>
              </Box>
              
              <Stack spacing={2}>
                {filters.map((filter) => (
                  <Paper key={filter.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Switch
                            checked={filter.enabled}
                            onChange={() => toggleFilter(filter.id)}
                            size="small"
                          />
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              textDecoration: filter.enabled ? 'none' : 'line-through',
                              opacity: filter.enabled ? 1 : 0.5 
                            }}
                          >
                            "{filter.keyword}"
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={filter.type}
                            onChange={(e) => updateFilter(filter.id, { type: e.target.value })}
                            label="Type"
                          >
                            <MenuItem value={FILTER_TYPES.INCLUDE}>
                              Include (OR)
                            </MenuItem>
                            <MenuItem value={FILTER_TYPES.EXCLUDE}>
                              Exclude (NOT)
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <Stack direction="column" spacing={1}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={filter.caseSensitive}
                                onChange={(e) => updateFilter(filter.id, { caseSensitive: e.target.checked })}
                                size="small"
                              />
                            }
                            label="Case Sensitive"
                            sx={{ margin: 0 }}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={filter.exactMatch}
                                onChange={(e) => updateFilter(filter.id, { exactMatch: e.target.checked })}
                                size="small"
                              />
                            }
                            label="Exact Match"
                            sx={{ margin: 0 }}
                          />
                        </Stack>
                      </Grid>
                      
                      <Grid item xs={12} sm={2}>
                        <IconButton
                          onClick={() => removeFilter(filter.id)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                    
                    <Chip
                      label={filter.type === FILTER_TYPES.INCLUDE ? 'INCLUDE' : 'EXCLUDE'}
                      color={filter.type === FILTER_TYPES.INCLUDE ? 'success' : 'error'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Saved Filter Sets */}
          {savedFilterSets.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">
                  Saved Filter Sets ({savedFilterSets.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {savedFilterSets.map((filterSet) => (
                    <ListItem key={filterSet.id} divider>
                      <ListItemText
                        primary={filterSet.name}
                        secondary={`${filterSet.filters.length} filters • Created ${new Date(filterSet.createdAt).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            onClick={() => loadFilterSet(filterSet)}
                          >
                            Load
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteFilterSet(filterSet.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Preview Mode Alert */}
          {previewMode && (
            <Alert severity="info">
              Preview mode is active. Filters will be applied temporarily for testing.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mr: 'auto' }}>
          <Button
            variant="outlined"
            onClick={handleExportMenuClick}
            disabled={filters.length === 0}
            startIcon={<FileDownload />}
            endIcon={<ArrowDropDown />}
            size="small"
          >
            Export
          </Button>
          <Button
            variant="outlined"
            onClick={() => setImportDialogOpen(true)}
            startIcon={<FileUpload />}
            size="small"
          >
            Import
          </Button>
        </Box>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={() => setSaveDialogOpen(true)}
          disabled={filters.length === 0}
          startIcon={<Save />}
        >
          Save Set
        </Button>
        <Button
          variant="contained"
          onClick={handleApplyFilters}
          disabled={filters.filter(f => f.enabled).length === 0}
        >
          Apply Filters ({filterSummary.total})
        </Button>
      </DialogActions>

      {/* Save Filter Set Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Filter Set</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Filter Set Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Enter a name for this filter set..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={saveFilterSet}
            variant="contained"
            disabled={!filterName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Help</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="h6">Filter Types:</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">
                <strong>Include (OR Logic):</strong> Events matching ANY of these keywords will be shown.
              </Typography>
              <Typography variant="body2">
                <strong>Exclude (NOT Logic):</strong> Events matching these keywords will be hidden.
              </Typography>
            </Box>
            
            <Typography variant="h6">Options:</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">
                <strong>Case Sensitive:</strong> Match exact letter case.
              </Typography>
              <Typography variant="body2">
                <strong>Exact Match:</strong> Match whole words only.
              </Typography>
            </Box>
            
            <Typography variant="h6">How it works:</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">
                1. Include filters are applied first (OR logic between them)
              </Typography>
              <Typography variant="body2">
                2. Exclude filters are applied second (removes matches)
              </Typography>
              <Typography variant="body2">
                3. Keywords match against event title, teams, league, and sport
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={() => handleExportOption('json')}>
          <ListItemIcon>
            <Code fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Export as JSON"
            secondary="Human-readable format"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExportOption('base64')}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Export as Base64"
            secondary="Shareable string format"
          />
        </MenuItem>
      </Menu>

      {/* Export Dialog */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Export Filters ({exportFormat?.toUpperCase()})
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {exportFormat === 'json' 
                ? 'JSON format - human readable, can be edited manually'
                : 'Base64 format - compact string for easy sharing via copy/paste'
              }
            </Typography>
            
            <TextField
              multiline
              rows={12}
              fullWidth
              label={`${exportFormat?.toUpperCase()} Content`}
              value={exportedContent}
              InputProps={{
                readOnly: true,
                style: { fontFamily: 'monospace', fontSize: '0.875rem' },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleCopyContent}
                      edge="end"
                      color={contentCopied ? 'success' : 'default'}
                      title="Copy to clipboard"
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {contentCopied && (
              <Alert severity="success">
                Content copied to clipboard!
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleDownloadFile}
            startIcon={<FileDownload />}
          >
            Download File
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Import Filters</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Import filters from JSON or Base64 format
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Import Method</InputLabel>
              <Select
                value={importFormat}
                label="Import Method"
                onChange={(e) => setImportFormat(e.target.value)}
              >
                <MenuItem value="paste">Paste Content</MenuItem>
                <MenuItem value="file">Upload File</MenuItem>
              </Select>
            </FormControl>

            {importFormat === 'paste' && (
              <TextField
                multiline
                rows={8}
                fullWidth
                label="Paste JSON or Base64 Content"
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="Paste your exported filter data here (JSON or Base64)..."
                helperText="The system will automatically detect the format"
              />
            )}

            {importFormat === 'file' && (
              <Box>
                <input
                  accept=".json,.txt"
                  style={{ display: 'none' }}
                  id="import-file-input"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="import-file-input">
                  <Button 
                    variant="outlined" 
                    component="span" 
                    startIcon={<FileUpload />} 
                    fullWidth
                  >
                    Choose File (JSON or TXT)
                  </Button>
                </label>
                
                {importContent && (
                  <TextField
                    multiline
                    rows={6}
                    fullWidth
                    label="File Content Preview"
                    value={importContent.substring(0, 300) + (importContent.length > 300 ? '...' : '')}
                    InputProps={{ readOnly: true }}
                    sx={{ mt: 2 }}
                  />
                )}
              </Box>
            )}

            {importError && (
              <Alert severity="error">
                {importError}
              </Alert>
            )}

            <Alert severity="warning">
              <Typography variant="body2">
                Importing will replace your current filter list. Consider exporting your current filters first.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportDialogOpen(false);
            setImportContent('');
            setImportError('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImportFromContent}
            disabled={!importContent.trim()}
          >
            Import Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default AdvancedFilters;
