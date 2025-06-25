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
      return res.status(500).json({ error: 'Error executing Python script', details: error.message, stderr });
    }

    try {
      const cleanOutput = stdout.trim();
      let jobs;

      try {
        jobs = JSON.parse(cleanOutput);
      } catch (parseError) {
        return res.status(500).json({ error: 'Failed to parse scraper output as JSON', details: parseError.message, rawOutput: cleanOutput });
      }

      if (!Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({ error: 'No jobs found in scraper output', rawOutput: cleanOutput });
      }

      // Upsert all jobs by their unique `url`
      const { data: upsertedData, error: upsertError } = await supabase
        .from('jobs')
        .upsert(jobs, { onConflict: 'url' })
        .select();

      if (upsertError) {
        console.error(`❌ Upsert Error:\n${upsertError.message}`);
        return res.status(500).json({ error: upsertError.message, details: upsertError.details || '' });
      }

      console.log(`✅ Successfully upserted ${upsertedData.length} job(s) into the database.`);
      return res.status(200).json({ upserted: upsertedData.length, data: upsertedData });

    } catch (unexpectedError) {
      console.error(`❌ Unexpected Error:\n${unexpectedError.stack || unexpectedError.message}`);
      return res.status(500).json({ error: 'Unexpected server error', details: unexpectedError.message });
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
