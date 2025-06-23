const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const supabase = require('../utils/supabase');

// DELETE - Remove job
router.delete(
  '/jobs/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Delete image from Supabase if it exists
      if (job.jobImage) {
        try {
          const imagePath = job.jobImage.replace(/^.*\/job-images\//, '');
          await supabase.storage.from('job-images').remove([imagePath]);
          console.log('🗑️ Deleted image:', imagePath);
        } catch (storageError) {
          console.error('❌ Error deleting job image:', storageError.message);
        }
      }

      await job.destroy();
      return res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting job:', error.message);
      return res.status(500).json({ message: 'Error deleting job.' });
    }
  }
);

module.exports = router;
