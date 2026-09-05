const fs = require('fs');
const path = require('path');

const apiJsPath = path.join(__dirname, 'js', 'api.js');
let apiJsContent = fs.readFileSync(apiJsPath, 'utf8');

const prodApiUrl = process.env.API_BASE_URL || 'https://your-production-backend.onrender.com/api';

// Replace the fallback production URL with the environment variable if present
apiJsContent = apiJsContent.replace(/https:\/\/your-production-backend\.onrender\.com\/api/g, prodApiUrl);

fs.writeFileSync(apiJsPath, apiJsContent);
console.log('Production build completed. API URL set to:', prodApiUrl);
