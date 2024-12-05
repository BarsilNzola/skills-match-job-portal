// utils/validators.js
const validateJobData = (data) => {
    if (!data.title || data.title.length < 3) {
        return 'Job title must be at least 3 characters long';
    }
    if (!data.company || data.company.length < 3) {
        return 'Company name must be at least 3 characters long';
    }
    if (!data.skillsRequired || !Array.isArray(data.skillsRequired)) {
        return 'Skills required must be an array';
    }
    return null; // No validation errors
};

module.exports = { validateJobData };
