const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment to production
process.env.NODE_ENV = 'production';

// Define paths
const buildDir = path.join(__dirname, 'build');
const serverDir = path.join(__dirname, 'server');
const publicDir = path.join(buildDir, 'public');

// Helper function to run commands with error handling
const runCommand = (command, options = {}) => {
  try {
    console.log(`🚀 Running: ${command}`);
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`, error);
    return false;
  }
};

// Ensure directories exist
const ensureDirectories = () => {
  [buildDir, publicDir, serverDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`📂 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Move files from source to target directory
const moveFiles = (sourceDir, targetDir) => {
  if (!fs.existsSync(sourceDir)) return;
  
  const files = fs.readdirSync(sourceDir);
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    // Skip if source and target are the same
    if (sourcePath === targetPath) return;
    
    // If target exists, remove it first
    if (fs.existsSync(targetPath)) {
      const stat = fs.lstatSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
    }
    
    // Move the file/directory
    fs.renameSync(sourcePath, targetPath);
  });
  
  // Remove the source directory if it's empty
  try {
    fs.rmdirSync(sourceDir);
  } catch (e) {
    // Directory not empty, which is fine
  }
};

// Main build function
const buildApp = async () => {
  console.log('🚀 Starting build process...');
  
  try {
    // 1. Ensure directories exist
    ensureDirectories();
    
    // 2. Install root dependencies with --legacy-peer-deps to handle peer dependency issues
    console.log('📦 Installing root dependencies...');
    if (!runCommand('npm install --legacy-peer-deps')) {
      throw new Error('Failed to install root dependencies');
    }
    
    // 3. Build the React app
    console.log('🔨 Building React app...');
    if (!runCommand('npm run build')) {
      throw new Error('Failed to build React app');
    }
    
    // 4. Install server dependencies
    console.log('📦 Installing server dependencies...');
    if (!runCommand('npm install --production', { cwd: serverDir })) {
      throw new Error('Failed to install server dependencies');
    }
    
    // 5. Organize build files
    console.log('📂 Organizing build files...');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Move all files from build to public
    moveFiles(buildDir, publicDir);
    
    // Move public directory back to build directory
    moveFiles(publicDir, buildDir);
    
    console.log('✅ Build completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
};

// Start the build process
buildApp();