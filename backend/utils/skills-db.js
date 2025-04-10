const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const SKILLS_DATA_PATH = path.join(__dirname, 'skill_data');
let skillsDatabase = new Set();

// Load ESCO Skills
async function loadESCO() {
  return new Promise((resolve) => {
    fs.createReadStream(path.join(SKILLS_DATA_PATH, 'esco/skills_en.csv'))
      .pipe(csv())
      .on('data', (row) => {
        if (row.preferredLabel) skillsDatabase.add(row.preferredLabel.toLowerCase());
      })
      .on('end', resolve);
  });
}

// Load O*NET Skills
async function loadONET() {
  return new Promise((resolve) => {
    fs.readFile(path.join(SKILLS_DATA_PATH, 'onet/Skills.txt'), 'utf8', (err, data) => {
      if (err) return resolve();
      data.split('\n').forEach(skill => {
        if (skill.trim()) skillsDatabase.add(skill.trim().toLowerCase());
      });
      resolve();
    });
  });
}

// Initialize
async function initSkillDatabase() {
  try {
    await loadESCO();
    await loadONET();
    console.log(`Loaded ${skillsDatabase.size} skills`);
  } catch (err) {
    console.error('Skill database initialization failed:', err);
    throw err;
  }
}

// Extract skills from text
function extractSkills(text) {
  if (!text) return [];
  
  const words = new Set(
      text.toLowerCase()
          .replace(/[^a-z0-9+#\s]/g, ' ')
          .split(/\s+/)
  );
  
  return Array.from(skillsDatabase).filter(skill => {
      const skillKey = skill.toLowerCase().replace(/[^a-z0-9+#]/g, '');
      return words.has(skillKey) || 
             skill.toLowerCase().split(/\W+/).some(part => words.has(part));
  });
}

module.exports = { initSkillDatabase, extractSkills, skillsDatabase };