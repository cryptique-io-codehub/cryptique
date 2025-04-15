import React from 'react';
import {
  IconButton,
  Tooltip,
  Box
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Edit as EditIcon
} from '@mui/icons-material';

const WidgetToolbar = ({ 
  onConfigure, 
  onDelete, 
  onDuplicate,
  onEdit,
  isEditing
}) => {
  return (
    <Box sx={{ 
      position: 'absolute', 
      top: 8, 
      right: 8, 
      zIndex: 1000,
      display: 'flex',
      gap: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 1,
      padding: 0.5
    }}>
      {isEditing && (
        <>
          <Tooltip title="Configure">
            <IconButton size="small" onClick={onConfigure}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate">
            <IconButton size="small" onClick={onDuplicate}>
              <DuplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
      <Tooltip title="Edit">
        <IconButton size="small" onClick={onEdit}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default WidgetToolbar; 