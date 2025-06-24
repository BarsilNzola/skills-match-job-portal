const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const supabase = require('../utils/supabase');
const { exec } = require('child_process');

const pythonCmd = process.env.PYTHON || 'python3'

router.post('/post-jobs', (req, res) => {
  console.log('🤖 Running scheduled job post request...')
  
  exec(`${PYTHON} ./backend/scripts/job_scraper.py`, async (error, stdout, stderr) => {
    // 📢 Log all output immediately
    if (stdout) {
      console.log(`✅ Stdout:\n${stdout}`)
    }
    if (stderr) {
      console.error(`❌ Stderr:\n${stderr}`)
    }
    if (error) {
      console.error(`❌ Exec Error:\n${error.stack || error.message}`)
      return res.status(500).json({ 
        error: 'Error executing Python script', 
        details: error.stack || error.message, 
        stderr 
      })
    }

    try {
      const jobs = JSON.parse(stdout)

      if (!Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({ error: 'No jobs found in scraper output', rawOutput: stdout })
      }

      // Fetch existing jobs for duplicate-checking
      const { data: existing, error: existingError } = await supabase
        .from('jobs')
        .select('title, company, source')
      if (existingError) {
        return res.status(500).json({ error: existingError.message })
      }

      const existingSet = new Set(
        existing.map((e) => `${e.title}::${e.company}::${e.source}`)
      )
      const newJobs = jobs.filter(
        (job) => !existingSet.has(`${job.title}::${job.company}::${job.source}`)
      )

      if (newJobs.length === 0) {
        return res.status(200).json({ inserted: 0, data: [] })
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('jobs')
        .insert(newJobs)
        .select()
      if (insertError) {
        return res.status(500).json({ error: insertError.message })
      }

      res.status(201).json({ inserted: insertedData.length, data: insertedData })
    } catch (parseError) {
      console.error(`❌ Parse Error: ${parseError.stack || parseError.message}`)
      res.status(500).json({ error: 'Failed to parse scraper output', details: parseError.message })
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
