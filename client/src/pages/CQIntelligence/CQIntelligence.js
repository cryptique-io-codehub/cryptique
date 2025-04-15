import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Tooltip,
  Fade
} from '@mui/material';
import { 
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  DataObject as DataIcon,
  Code as CodeIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import CQIntelligenceService, { WEBSITE_DATA_SOURCES } from '../../services/cqIntelligenceService';

const CQIntelligence = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: 'Welcome to CQ Intelligence! I\'m your AI-powered analytics assistant. Please select a data source to begin.',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const handleDataSourceChange = async (event) => {
    const dataSource = WEBSITE_DATA_SOURCES.find(ds => ds.id === event.target.value);
    setSelectedDataSource(event.target.value);
    setLoading(true);
    
    try {
      await CQIntelligenceService.setSelectedWebsiteData(dataSource);
      const insights = await CQIntelligenceService.getAnalyticsInsights();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I've connected to ${dataSource.name} data. Here are some initial insights:\n\n${insights.insights.join('\n')}`,
        timestamp: new Date().toISOString(),
        dataSource: dataSource.name
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedDataSource) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await CQIntelligenceService.sendMessage(input);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      p: 3, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <PsychologyIcon sx={{ fontSize: 40, color: '#00ff9d' }} />
        <Box>
          <Typography variant="h4" sx={{ color: '#00ff9d' }}>
            CQ Intelligence
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Your AI-powered analytics assistant
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          mb: 2,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Select Data Source</InputLabel>
            <Select
              value={selectedDataSource}
              onChange={handleDataSourceChange}
              label="Select Data Source"
              sx={{ 
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              {WEBSITE_DATA_SOURCES.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DataIcon />
                    {source.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {messages.map((message, index) => (
            <Fade in={true} timeout={500} key={index}>
              <Box
                sx={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%'
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Avatar sx={{ 
                    bgcolor: message.role === 'user' ? 'primary.main' : '#00ff9d',
                    width: 32,
                    height: 32
                  }}>
                    {message.role === 'user' ? <UserIcon /> : <BotIcon />}
                  </Avatar>
                  {message.dataSource && (
                    <Chip
                      icon={<DataIcon />}
                      label={message.dataSource}
                      size="small"
                      sx={{ bgcolor: 'rgba(0, 255, 157, 0.1)', color: '#00ff9d' }}
                    />
                  )}
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? 'primary.main' : 'rgba(255, 255, 255, 0.05)',
                    color: message.role === 'user' ? 'primary.contrastText' : 'white',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {message.content}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </Fade>
          ))}
          {loading && (
            <Box sx={{ alignSelf: 'center' }}>
              <CircularProgress sx={{ color: '#00ff9d' }} />
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask CQ Intelligence anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading || !selectedDataSource}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              },
            }}
          />
          <Tooltip title={!selectedDataSource ? "Select a data source first" : "Send message"}>
            <span>
              <IconButton 
                color="primary" 
                onClick={handleSend}
                disabled={loading || !input.trim() || !selectedDataSource}
                sx={{ 
                  bgcolor: '#00ff9d',
                  '&:hover': { bgcolor: '#00cc7d' },
                  '&.Mui-disabled': { bgcolor: 'rgba(0, 255, 157, 0.2)' }
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ 
          p: 2,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <CodeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Powered by Gemini AI • Connected to {selectedDataSource ? WEBSITE_DATA_SOURCES.find(ds => ds.id === selectedDataSource)?.name : 'No Data Source'}
        </Typography>
      </Paper>
    </Box>
  );
};

export default CQIntelligence; 