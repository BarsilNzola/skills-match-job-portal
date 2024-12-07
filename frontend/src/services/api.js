import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true,  // Ensure cookies (session) are sent with requests
});

// Add an interceptor to automatically include the Authorization header for all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');  // Get token from localStorage
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`; // Include token in the Authorization header
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const registerUser = (userData) => api.post('/users/register', userData);
export const loginUser = (userData) => api.post('/users/login', userData);
export const fetchJobs = () => api.get('/jobs');
export const fetchJobDetail = (id) => api.get(`/jobs/${id}`);

// Change fetchUserProfile to no longer need 'id' in the URL, since the token will provide the user info
export const fetchUserProfile = () => api.get('/users/profile');  // No need for 'id', token handles it

export const applyForJob = (applicationData) => api.post('/applications', applicationData);

export default api;
