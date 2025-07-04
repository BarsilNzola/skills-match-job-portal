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
    const token = localStorage.getItem('authToken'); // ✅ use localStorage
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
        localStorage.removeItem('authToken'); // ✅ clear from localStorage
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

// ==================== AUTH & VERIFICATION ====================
export const registerUser = async (userData) => {
    try {
        const response = await api.post('/users/register', userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Registration failed. Please try again.' };
    }
};

export const verifyEmail = async (token) => {
    try {
        const response = await api.get(`/users/verify-email?token=${token}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Verification failed. Please try again.' };
    }
};

export const resendVerificationEmail = async (email) => {
    try {
        const response = await api.post('/users/resend-verification', { email });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: 'Failed to resend verification email.' };
    }
};

export const loginUser = async (userData) => {
    try {
      const response = await api.post('/users/login', userData);
      localStorage.setItem('authToken', response.data.token); // ✅ use localStorage
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Login failed. Please try again.' };
    }
};

// ==================== USER PROFILE ====================
export const fetchUserProfile = () => 
    api.get('/users/profile')
       .then(res => res.data)
       .catch(handleApiError);

export const updateUserSkills = (skillsData) => 
    api.put('/users/skills', skillsData)
       .then(res => res.data)
       .catch(handleApiError);

export const updateUserProfile = (profileData) =>
    api.put('/users/profile', profileData)
       .then(res => res.data)
       .catch(handleApiError);

// ==================== FILE UPLOADS ====================
export const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data; // { profileImage: "url" }
};

export const getAvatarUrl = (userId) => {
    return api.get(`/users/avatar/${userId}`)
        .then(response => response.data.url || response.data)
        .catch(() => `${BASE_URL}/default-avatar.jpg`);
};

export const uploadCV = (file, onProgress) => {
    const formData = new FormData();
    formData.append('cv', file, file.name);
    
    return api.post('/users/upload-cv', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress
    });
  };

export const downloadCV = async () => {
    try {
        const { data: { url, filename } } = await api.get('/users/download-cv');
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'document';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        toast?.error?.('Failed to download CV. Please try again.');
    }
};
    
export const convertCV = async (targetFormat) => {
    const response = await api.post('/users/convert-cv', { format: targetFormat });
    return response.data; // { filename: "file.pdf", fileType: "pdf" }
};

// ==================== JOBS ====================
export const fetchRecommendedJobs = async () => {
    try {
        const response = await api.get('/users/recommendations');
        return response.data;
    } catch (error) {
        console.error("Fetch Recommended Jobs Error:", error.response?.data || error.message);
        throw error;
    }
};

export const fetchJobs = () => 
    api.get('/jobs')
       .then(res => res.data)
       .catch(handleApiError);

export const fetchJobDetail = (id) => 
    api.get(`/jobs/${id}`)
       .then(res => res.data)
       .catch(handleApiError);

export const deleteJob = (id) => 
    api.delete(`/api/admin/jobs/${id}`)
       .then(res => res.data)
       .catch(handleApiError);

export const updateJob = (id, jobData) => 
    api.put(`/api/admin/jobs/${id}`, jobData)
       .then(res => res.data)
       .catch(handleApiError);

// ==================== APPLICATIONS ====================
export const applyForJob = (applicationData) => 
    api.post('/applications', applicationData)
       .then(res => res.data)
       .catch(handleApiError);

export default api;