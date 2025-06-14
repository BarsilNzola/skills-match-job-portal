import axios from 'axios';

// Configure base URL based on environment
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://skills-match.onrender.com'  // Production URL
  : 'http://localhost:5000';            // Development URL

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
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
    return Promise.reject(message);
};

// User-related API functions
export const registerUser = (userData) => api.post('/users/register', userData).catch(handleApiError);

export const loginUser = async (userData) => {
    try {
        const response = await api.post('/users/login', userData);
        const token = response.data.token;
        localStorage.setItem('authToken', token);
        return response;
    } catch (error) {
        return Promise.reject(handleApiError(error));
    }
};

export const fetchUserProfile = () => api.get('/users/profile').catch(handleApiError);
export const updateUserSkills = (skillsData) => api.put('/users/skills', skillsData).catch(handleApiError);

export const uploadAvatar = (formData) => {
    return api.post('/users/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export const getAvatarUrl = (userId) => `${BASE_URL}/users/avatar/${userId}`;

export const updateUserProfile = (profileData) =>
    api.put('/users/profile', profileData).catch(handleApiError);

export const uploadCV = (formData) => {
    return api.post('/users/upload-cv', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export const downloadCV = () => api.get('/users/download-cv', { 
    responseType: 'blob'
});

export const convertCV = (targetFormat) => 
    api.post('/users/convert-cv', { format: targetFormat });

export const fetchRecommendedJobs = async () => {
    try {
        const response = await api.get('/users/recommendations');
        return response.data;
    } catch (error) {
        console.error("Fetch Recommended Jobs Error:", error.response?.data || error.message);
        throw error;
    }
};

// Job-related API functions
export const fetchJobs = () => api.get('/jobs').catch(handleApiError);
export const fetchJobDetail = (id) => api.get(`/jobs/${id}`).catch(handleApiError);

export const postJobFromImage = async (formData) => {
    return api.post('/api/admin/post-job', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    .then(response => response.data)
    .catch(handleApiError);
};

export const postJobManual = (jobData) => {
    return api.post('/api/admin/post-job', jobData, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.data)
    .catch(handleApiError);
};

export const deleteJob = (id) => api.delete(`/jobs/${id}`).catch(handleApiError);
export const updateJob = (id, jobData) => api.put(`/jobs/${id}`, jobData).catch(handleApiError);

// Application-related API functions
export const applyForJob = (applicationData) => api.post('/applications', applicationData).catch(handleApiError);

export default api;