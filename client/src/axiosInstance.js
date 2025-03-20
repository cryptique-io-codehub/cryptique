import axios from 'axios';
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3002/api';
const axiosInstance = axios.create({
  baseURL: baseURL, // Replace with your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;