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

      // ✅ Deduplicate jobs by URL
      const seenUrls = new Set();
      const dedupedJobs = jobs.filter((job) => {
        if (!job.url) return false; // Skip jobs without URL
        if (seenUrls.has(job.url)) return false; // Skip duplicate URL
        seenUrls.add(job.url);
        return true;
      });

      if (dedupedJobs.length === 0) {
        return res.status(400).json({ error: 'All jobs were duplicates or missing URLs', rawOutput: cleanOutput });
      }

      // Upsert deduplicated jobs by their unique `url`
      const { data: upsertedData, error: upsertError } = await supabase
        .from('jobs')
        .upsert(dedupedJobs, { onConflict: 'url' })
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

// GET all jobs (public)
router.get('/', async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, company, location, description, source, url, createdAt')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return res.status(200).json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    return res.status(500).json({ message: 'Failed to retrieve jobs.', error: error.message });
  }
});

// GET single job (public)
router.get('/:id', async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, title, company, location, description, source, url, createdAt')
      .eq('id', req.params.id)
      .single();

    if (error) throw new Error(error.message);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    return res.status(200).json(job);
  } catch (error) {
    console.error('Error retrieving job:', error.message);
    return res.status(500).json({ message: 'Error retrieving job.', error: error.message });
  }
});

module.exports = router;
