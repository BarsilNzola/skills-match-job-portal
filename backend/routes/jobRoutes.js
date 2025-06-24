const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const supabase = require('../utils/supabase');
const { exec } = require('child_process');

const pythonPath = process.env.PYTHON || '/opt/venv/bin/python';

router.post('/post-jobs', (req, res) => {
  console.log('🤖 Running scheduled job post request...');

  exec(`${pythonPath} ./backend/scripts/job_scraper.py`, async (error, stdout, stderr) => {
    // 📢 Log all output immediately
    if (stdout) {
      console.log(`✅ Stdout:\n${stdout}`);
    }
    if (stderr) {
      console.error(`❌ Stderr:\n${stderr}`);
    }
    if (error) {
      console.error(`❌ Exec Error:\n${error.stack || error.message}`);
      return res.status(500).json({ 
        error: 'Error executing Python script', 
        details: error.stack || error.message, 
        stderr 
      });
    }

    try {
      // Clean output
      const cleanOutput = stdout.trim();

      // Parse as JSON
      let jobs;
      try {
        jobs = JSON.parse(cleanOutput);
      } catch (parseError) {
        console.error(`❌ Parse Error:\n${parseError.stack || parseError.message}`);
        return res.status(500).json({ 
          error: 'Failed to parse scraper output as JSON', 
          details: parseError.message, 
          rawOutput: cleanOutput 
        });
      }

      if (!Array.isArray(jobs) || jobs.length === 0) {
        console.warn(`⚠️ Scraper returned empty or invalid jobs list:`, jobs);
        return res.status(400).json({ error: 'No jobs found in scraper output', rawOutput: cleanOutput });
      }

      // Fetch existing jobs
      let existing, existingError;
      try {
        const result = await supabase.from('jobs').select('title, company, source');
        existing = result.data;
        existingError = result.error;
      } catch (fetchError) {
        existingError = fetchError;
      }

      if (existingError) {
        console.error(`❌ Existing Error:\n${existingError.stack || existingError.message}`);
        return res.status(500).json({ error: existingError.message || 'Error fetching existing jobs' });
      }

      if (!Array.isArray(existing)) {
        return res.status(500).json({ error: 'Supabase returned unexpected data shape', existing });
      }

      const existingSet = new Set(
        existing.map((e) => `${e.title}::${e.company}::${e.source}`)
      );

      // Filter new jobs
      const newJobs = jobs.filter(
        (job) => !existingSet.has(`${job.title}::${job.company}::${job.source}`)
      );

      if (newJobs.length === 0) {
        return res.status(200).json({ inserted: 0, data: [] });
      }

      // Insert new jobs
      let insertedData, insertError;
      try {
        const result = await supabase.from('jobs').insert(newJobs).select();
        insertedData = result.data;
        insertError = result.error;
      } catch (dbError) {
        insertError = dbError;
      }

      if (insertError) {
        console.error(`❌ Insert Error:\n${insertError.stack || insertError.message}`);
        return res.status(500).json({ error: insertError.message || 'Error inserting new jobs' });
      }

      console.log(`✅ Successfully inserted ${insertedData.length} new job(s) into the database.`);
      res.status(201).json({ inserted: insertedData.length, data: insertedData });

    } catch (unexpectedError) {
      console.error(`❌ Unexpected Error:\n${unexpectedError.stack || unexpectedError.message}`);
      res.status(500).json({ error: 'Unexpected server error', details: unexpectedError.message });
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
