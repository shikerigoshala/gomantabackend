const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Starting build process...');

// Define paths
const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');

// Ensure server directory exists
if (!fs.existsSync(serverDir)) {
  console.error('❌ Server directory not found!');
  process.exit(1);
}

// Read server's package.json
const serverPackagePath = path.join(serverDir, 'package.json');
if (!fs.existsSync(serverPackagePath)) {
  console.error('❌ Server package.json not found!');
  process.exit(1);
}

console.log('✅ Server files verified');
console.log('🚀 Build completed successfully!');

process.exit(0);