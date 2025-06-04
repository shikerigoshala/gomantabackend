const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build process...');

// Create build directory if it doesn't exist
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

try {
  // Install frontend dependencies
  console.log('Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Build the React app
  console.log('Building React app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Move build files to the correct location for Render
  const renderBuildDir = '/opt/render/project/frontend/build';
  if (!fs.existsSync(renderBuildDir)) {
    fs.mkdirSync(renderBuildDir, { recursive: true });
  }
  
  console.log('Copying build files to Render directory...');
  fs.cpSync('build', renderBuildDir, { recursive: true });
  
  console.log('Build process completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
