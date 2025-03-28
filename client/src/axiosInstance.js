import axios from 'axios';
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3001';
const axiosInstance = axios.create({
  baseURL: baseURL+'/api', // Replace with your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;