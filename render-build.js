const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build process for Render deployment...');

// 1. Install frontend dependencies
console.log('Installing frontend dependencies...');
execSync('npm install', { stdio: 'inherit' });

// 2. Install backend dependencies first
console.log('Installing backend dependencies...');
process.chdir('server');
try {
  execSync('npm install --production', { stdio: 'inherit' });
} catch (error) {
  console.error('Error installing backend dependencies:', error);
  process.exit(1);
}
process.chdir('..');

// 3. Build the React app
console.log('Building React app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building React app:', error);
  process.exit(1);
}

// 4. Create necessary directories
const buildDir = path.join(__dirname, 'build');
const publicDir = path.join(__dirname, 'public');

// 5. Move build files to the correct location
console.log('Moving build files...');

// Ensure the build directory exists
if (!fs.existsSync(buildDir)) {
  console.log('Creating build directory...');
  fs.mkdirSync(buildDir, { recursive: true });
}

// Copy server files to the build directory
console.log('Copying server files...');
const serverFiles = fs.readdirSync('server');
serverFiles.forEach(file => {
  if (file !== 'node_modules' && file !== '.git') {
    const srcPath = path.join('server', file);
    const destPath = path.join(buildDir, file);
    
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
});

// Copy the built React app to the public directory
if (fs.existsSync('build')) {
  console.log('Copying React build files...');
  const reactBuildPath = path.join(buildDir, 'public');
  
  if (fs.existsSync(reactBuildPath)) {
    fs.rmSync(reactBuildPath, { recursive: true, force: true });
  }
  
  copyFolderRecursiveSync('build', reactBuildPath);
}

console.log('Build process completed successfully!');

// Helper function to copy directories recursively
function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}
