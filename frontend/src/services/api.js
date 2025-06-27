import axios from 'axios';
import { toast } from 'react-toastify';

// Configure base URL based on environment
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://talentpath-fkal.onrender.com'  // Production URL
  : 'http://localhost:5000';            // Development URL

const api = axios.create({
    baseURL: BASE_URL,
});

// Interceptors for adding Authorization header
api.interceptors.request.use(config => {
    const token = sessionStorage.getItem('authToken'); // More secure than localStorage
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
        sessionStorage.setItem('authToken', response.data.token);
        return response;
    } catch (error) {
        return handleApiError(error);
    }
};

export const fetchUserProfile = () => api.get('/users/profile').catch(handleApiError);
export const updateUserSkills = (skillsData) => api.put('/users/skills', skillsData).catch(handleApiError);

// Updated file upload/download functions
export const uploadAvatar = (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Modified to handle Supabase URLs directly
export const getAvatarUrl = (userId) => {
    return api.get(`/users/avatar/${userId}`)
        .then(response => response.data.url || response.data)
        .catch(() => `${BASE_URL}/default-avatar.jpg`);
};

export const updateUserProfile = (profileData) =>
    api.put('/users/profile', profileData).catch(handleApiError);

export const uploadCV = (file) => {
    const formData = new FormData();
    formData.append('cv', file);
    return api.post('/users/upload-cv', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Updated to handle Supabase signed URLs
export const downloadCV = async () => {
    try {
      // Step 1: Get the signed URL and filename (from your backend)
      const { data: { url, filename } } = await api.get('/users/download-cv');
  
      // Step 2: Fetch the file as a blob (don't use Axios — use native fetch)
      const response = await fetch(url);
      const blob = await response.blob();
  
      // Step 3: Create a temporary <a> link to download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'document'; // e.g., myname_cv.pdf or myname_cv.docx
      a.style.display = 'none';
  
      // Step 4: Trigger the download without redirect
      document.body.appendChild(a);
      a.click();
  
      // Step 5: Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast?.error?.('Failed to download CV. Please try again.');
    }
};
    
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

export const deleteJob = (id) => api.delete(`api/admin/jobs/${id}`).catch(handleApiError);
export const updateJob = (id, jobData) => api.put(`api/admin/jobs/${id}`, jobData).catch(handleApiError);

// Application-related API functions
export const applyForJob = (applicationData) => api.post('/applications', applicationData).catch(handleApiError);

export default api;