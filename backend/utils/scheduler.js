const cron = require('node-cron')
const axios = require('axios')

// Configure the base URL for local or production
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://talentpath-fkal.onrender.com'  // <-- put your deployed site URL here
  : 'http://localhost:10000'

// Schedule a job to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🤖 Running scheduled job post request...')
    const { data } = await axios.post(`${BASE_URL}/jobs/post-jobs`)
    console.log(`✅ Inserted ${data.inserted} new jobs`)
  } catch (error) {
    console.error('❌ Error running scheduled job:', error.message)
  }
})
