import axios from 'axios';

// Base API configuration
const api = axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true,  // Ensure cookies (session) are sent with requests
});

// Interceptors for adding Authorization header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor for handling token expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Helper function for consistent error handling
const handleApiError = (error) => {
    const message = error.response?.data?.message || error.message || 'An unknown error occurred';
    throw new Error(message);
};

// User-related API functions
export const registerUser = (userData) => api.post('/users/register', userData).catch(handleApiError);
export const loginUser = async (userData) => {
    try {
        const response = await api.post('/users/login', userData);
        const token = response.data.token;  // Assuming token is returned in the response
        localStorage.setItem('authToken', token);  // Store token in localStorage
        return response;  // Return the entire response for further use
    } catch (error) {
        handleApiError(error);
    }
};

export const fetchUserProfile = () => api.get('/users/profile').catch(handleApiError);
export const updateUserSkills = (skillsData) => api.put('/users/skills', skillsData).catch(handleApiError);

// Job-related API functions
export const fetchJobs = () => api.get('/jobs').catch(handleApiError);
export const fetchJobDetail = (id) => api.get(`/jobs/${id}`).catch(handleApiError);
export const fetchRecommendedJobs = () => api.get('/jobs/recommend').catch(handleApiError);
export const postJobFromImage = async (formData) => {

    return api.post('api/admin/post-job', formData)  // Don't set Content-Type here
        .then(response => response.data)
        .catch(handleApiError);
};


// Application-related API functions
export const applyForJob = (applicationData) => api.post('/applications', applicationData).catch(handleApiError);

export default api;
