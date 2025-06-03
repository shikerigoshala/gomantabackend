const fs = require('fs');
const path = require('path');

// Define source and destination paths
const rootEnvPath = path.join(__dirname, '..', '.env');
const serverEnvPath = path.join(__dirname, '.env');

try {
  // Check if root .env exists
  if (!fs.existsSync(rootEnvPath)) {
    console.error('Error: Root .env file not found at', rootEnvPath);
    process.exit(1);
  }

  // Read root .env
  const envContent = fs.readFileSync(rootEnvPath, 'utf8');
  
  // Write to server/.env
  fs.writeFileSync(serverEnvPath, envContent, 'utf8');
  
  console.log('Successfully copied .env file to server directory');
  console.log(`Server .env location: ${serverEnvPath}`);
  
} catch (error) {
  console.error('Error copying .env file:', error.message);
  process.exit(1);
}
