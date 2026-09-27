const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../backend/.env')));

const varsToSync = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'CLOUDINARY_URL'];

for (const key of varsToSync) {
  const val = envConfig[key];
  if (!val) continue;

  console.log(`Setting ${key}...`);
  // Remove existing
  try {
    spawnSync('npx', ['-y', 'vercel', 'env', 'rm', key, 'production', '-y'], { stdio: 'inherit', shell: true });
  } catch (e) {}

  // Add clean value via stdin
  const proc = spawnSync('npx', ['-y', 'vercel', 'env', 'add', key, 'production'], {
    input: val.trim(),
    encoding: 'utf-8',
    shell: true
  });
  console.log(proc.stdout || proc.stderr);
}
console.log('Finished syncing env vars to Vercel.');
