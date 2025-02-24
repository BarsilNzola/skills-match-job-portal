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
            window.location.href = '/login';  // Redirect to login page
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
        const token = response.data.token;  // Assuming token is returned in the response
        localStorage.setItem('authToken', token);  // Store token in localStorage
        return response;  // Return the entire response for further use
    } catch (error) {
        return Promise.reject(handleApiError(error));  // Ensure consistent error handling
    }
};

export const fetchUserProfile = () => api.get('/users/profile').catch(handleApiError);
export const updateUserSkills = (skillsData) => api.put('/users/skills', skillsData).catch(handleApiError);

export const updateUserProfile = (profileData) =>
    api.put('/users/profile', profileData).catch(handleApiError);

export const fetchRecommendedJobs = async () => {
    try {
        console.log("Calling /users/recommendations...");
        const response = await api.get('/users/recommendations', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
        });
        console.log("Recommended Jobs:", response.data);
        return response.data;
    } catch (error) {
        console.error("Fetch Recommended Jobs Error:", error.response?.data || error.message);
        throw error;
    }
};


// Job-related API functions
export const fetchJobs = () => api.get('/jobs').catch(handleApiError);
export const fetchJobDetail = (id) => api.get(`/jobs/${id}`).catch(handleApiError);



// Posting job from image
export const postJobFromImage = async (formData) => {
    return api.post('api/admin/post-job', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    .then(response => response.data)
    .catch(handleApiError);
};

// Delete a job by ID (Only accessible to admins)
export const deleteJob = (id) => api.delete(`/jobs/${id}`).catch(handleApiError);

// Edit job
export const updateJob = (id, jobData) => api.put(`/jobs/${id}`, jobData).catch(handleApiError);

// Application-related API functions
export const applyForJob = (applicationData) => api.post('/applications', applicationData).catch(handleApiError);

export default api;
