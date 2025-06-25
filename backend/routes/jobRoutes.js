const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const supabase = require('../utils/supabase');
const { exec } = require('child_process');

const pythonPath = process.env.PYTHON || '/opt/venv/bin/python';

router.post('/post-jobs', (req, res) => {
  console.log('🤖 Running scheduled job post request...');

  exec(`${pythonPath} ./backend/scripts/job_scraper.py`, async (error, stdout, stderr) => {
    if (stdout) {
      console.log(`✅ Stdout:\n${stdout}`);
    }
    if (stderr) {
      console.error(`❌ Stderr:\n${stderr}`);
    }
    if (error) {
      return res.status(500).json({ error: error.message, stderr });
    }

    let jobs;
    try {
      jobs = JSON.parse(stdout.trim());
    } catch (e) {
      return res.status(500).json({ error: 'JSON parse failed', details: e.message, rawOutput: stdout.trim() });
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'No jobs found in output', rawOutput: stdout.trim() });
    }

    // 🆕 Upsert into supabase using unique 'url' constraint
    try {
      const { data, error: insertError } = await supabase
        .from('jobs')
        .upsert(jobs) // upserts all, updating existing if 'url' matches
        .select();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(201).json({ upserted: data.length, data });
    } catch (dbError) {
      return res.status(500).json({ error: dbError.message || 'Error upserting jobs' });
    }
  });
});


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
