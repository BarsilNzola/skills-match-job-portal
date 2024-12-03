import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

export const registerUser = (userData) => api.post('/users/register', userData);
export const loginUser = (userData) => api.post('/users/login', userData);
export const fetchJobs = () => api.get('/jobs');
export const fetchJobDetail = (id) => api.get(`/jobs/${id}`);
export const fetchUserProfile = (id) => api.get(`/users/${id}`);
export const applyForJob = (applicationData) => api.post('/applications', applicationData);

export default api;
