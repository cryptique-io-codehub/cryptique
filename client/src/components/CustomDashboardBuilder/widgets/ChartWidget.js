import React from 'react';
import { Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const ChartWidget = ({ data, config }) => {
  const {
    title,
    xAxis,
    yAxis,
    series = [],
    type = 'line',
    colors = ['#8884d8', '#82ca9d', '#ffc658']
  } = config;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {series.map((s, index) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={colors[index % colors.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      // Add more chart types here (bar, pie, etc.)
      default:
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            Unsupported chart type: {type}
          </Box>
        );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {title}
        </Box>
      )}
      <Box sx={{ flex: 1, p: 2 }}>
        {renderChart()}
      </Box>
    </Box>
  );
};

export default ChartWidget; 