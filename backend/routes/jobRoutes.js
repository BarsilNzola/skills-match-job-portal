const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const supabase = require('../utils/supabase');
const { exec } = require('child_process')


router.post('/post-jobs', (req, res) => {
  exec('python3 ./backend/scripts/job_scraper.py', async (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`)
    }

    try {
      const jobs = JSON.parse(stdout)

      if (!Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({ error: 'No jobs found in scraper output' })
      }

      // 1️⃣ Fetch existing (title, company, source) tuples to filter duplicates
      const { data: existing, error: existingError } = await supabase
        .from('jobs')
        .select('title, company, source')
      if (existingError) {
        return res.status(500).json({ error: existingError.message })
      }

      // 2️⃣ Filter new jobs
      const existingSet = new Set(
        existing.map(
          (e) => `${e.title}::${e.company}::${e.source}`
        )
      )
      const newJobs = jobs.filter(
        (job) => !existingSet.has(`${job.title}::${job.company}::${job.source}`)
      )

      if (newJobs.length === 0) {
        return res.status(200).json({ inserted: 0, data: [] })
      }

      // 3️⃣ Insert new jobs
      const { data: insertedData, error: insertError } = await supabase
        .from('jobs')
        .insert(newJobs)
        .select()
      if (insertError) {
        return res.status(500).json({ error: insertError.message })
      }

      res.status(201).json({ inserted: insertedData.length, data: insertedData })
    } catch (parseError) {
      console.error(`Parse Error: ${parseError}`)
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
