const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process...');

// Set environment to production
process.env.NODE_ENV = 'production';

// Create necessary directories
const buildDir = path.join(__dirname, 'build');
const serverDir = path.join(__dirname, 'server');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

try {
  // Install root dependencies
  console.log('📦 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Install server dependencies
  console.log('📦 Installing server dependencies...');
  execSync('npm install --production', { cwd: serverDir, stdio: 'inherit' });
  
  // Build the React app
  console.log('🔨 Building React app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Move build output to the correct location if needed
  const clientBuildDir = path.join(__dirname, 'build');
  if (fs.existsSync(clientBuildDir)) {
    console.log('📂 Moving build output...');
    // Copy files from build directory to the root
    const files = fs.readdirSync(clientBuildDir);
    files.forEach(file => {
      const srcPath = path.join(clientBuildDir, file);
      const destPath = path.join(__dirname, file);
      
      // Skip if source and destination are the same
      if (srcPath !== destPath) {
        fs.renameSync(srcPath, destPath);
      }
    });
    
    // Remove the build directory
    fs.rmdirSync(clientBuildDir);
  }
  
  console.log('✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}