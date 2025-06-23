const express = require('express');
const router = express.Router();
const Job = require('../models/Job');


router.post('/post-jobs', (req, res) => {
    // Run the Python scraper
    exec('python3 ./scripts/job_scraper.py', async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`)
        return res.status(500).json({ error: error.message })
      }
  
      if (stderr) {
        console.error(`Stderr: ${stderr}`)
      }
  
      try {
        // Parse the output as JSON
        const jobs = JSON.parse(stdout)
  
        // Insert into supabase
        const { data, error: insertError } = await supabase
          .from('jobs')
          .insert(jobs)
  
        if (insertError) {
          return res.status(500).json({ error: insertError.message })
        }
  
        res.status(201).json({ inserted: data.length, data })
      } catch (parseError) {
        res.status(500).json({ error: 'Failed to parse scraper output' })
      }
    })
  })

// GET all jobs (public) with optional pagination
router.get('/', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const jobs = await Job.findAll({
            attributes: ['id', 'title', 'company', 'location', 'description'],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        return res.status(500).json({ message: 'Failed to retrieve jobs.' });
    }
});

// GET single job (public)
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findByPk(req.params.id, {
            attributes: ['id', 'title', 'company', 'location', 'description'],
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        return res.status(200).json(job);
    } catch (error) {
        console.error('Error retrieving job:', error.message);
        return res.status(500).json({ message: 'Error retrieving job.' });
    }
});

module.exports = router;
