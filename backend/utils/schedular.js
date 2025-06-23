// scheduler.js
const cron = require('node-cron')
const axios = require('axios')

// Schedule to run every day at 11:00 AM
// Cron format: "0 11 * * *" means: minute 0, hour 11, every day
cron.schedule('0 11 * * *', async () => {
  try {
    console.log('Running scheduled job posting at 11 AM...')
    await axios.post('http://localhost:3000/post-jobs')
    console.log('Jobs successfully posted!')
  } catch (error) {
    console.error('Error posting jobs:', error.message)
  }
})

module.exports = {} // so you can require it elsewhere
