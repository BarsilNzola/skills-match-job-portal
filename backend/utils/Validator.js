const validateJobData = (data) => {
   const errors = [];

   if (!data.title || data.title.length < 3) {
       errors.push('Job title must be at least 3 characters long.');
   }

   if (!data.company || data.company.length < 3) {
       errors.push('Company name must be at least 3 characters long.');
   }

   if (!data.skills || !Array.isArray(data.skills)) {
       errors.push('Skills must be an array.');
   }

   return {
       isValid: errors.length === 0,
       errors
   };
};

module.exports = { validateJobData };

