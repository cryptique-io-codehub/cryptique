import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';

const TableWidget = ({ data, config }) => {
  const {
    title,
    columns = [],
    pagination = false,
    pageSize = 10
  } = config;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">No data available</Typography>
      </Box>
    );
  }

  // Get column definitions from data if not provided
  const tableColumns = columns.length > 0
    ? columns
    : Object.keys(data[0]).map(key => ({
        field: key,
        headerName: key.charAt(0).toUpperCase() + key.slice(1)
      }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}
      <TableContainer component={Paper} sx={{ flex: 1 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {tableColumns.map((column) => (
                <TableCell key={column.field}>
                  {column.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {tableColumns.map((column) => (
                  <TableCell key={column.field}>
                    {row[column.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TableWidget; 