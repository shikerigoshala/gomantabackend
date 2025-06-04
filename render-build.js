const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment to production
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false'; // Disable source maps to save memory
process.env.INLINE_RUNTIME_CHUNK = 'false'; // Don't inline runtime chunk

// Increase Node.js memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Define paths
const buildDir = path.join(__dirname, 'build');
const serverDir = path.join(__dirname, 'server');
const publicDir = path.join(__dirname, 'public');

// Log environment for debugging
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  NODE_OPTIONS: process.env.NODE_OPTIONS,
  BUILD_DIR: buildDir,
  SERVER_DIR: serverDir,
  PUBLIC_DIR: publicDir
});

// Helper function to run commands with error handling
const runCommand = (command, options = {}) => {
  try {
    console.log(`🚀 Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit', 
      env: { 
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096',
        NODE_ENV: 'production',
        GENERATE_SOURCEMAP: 'false',
        INLINE_RUNTIME_CHUNK: 'false'
      },
      shell: '/bin/bash',
      ...options 
    });
    console.log('✅ Command successful');
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`, error);
    process.exit(1); // Exit with error code on failure
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

// Process files in chunks to avoid memory issues
const processInChunks = (files, processFn, chunkSize = 50) => {
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    chunk.forEach(processFn);
    // Force garbage collection between chunks if available
    if (global.gc) {
      global.gc();
    }
  }
};

// Move files from source to target directory in chunks
const moveFiles = (sourceDir, targetDir) => {
  if (!fs.existsSync(sourceDir)) return;
  
  const files = fs.readdirSync(sourceDir);
  
  processInChunks(files, (file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    // Skip if source and target are the same
    if (sourcePath === targetPath) return;
    
    try {
      // If target exists, remove it first
      if (fs.existsSync(targetPath)) {
        const stat = fs.lstatSync(targetPath);
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
      }
      
      // Create target directory if it doesn't exist
      const targetParentDir = path.dirname(targetPath);
      if (!fs.existsSync(targetParentDir)) {
        fs.mkdirSync(targetParentDir, { recursive: true });
      }
      
      // Move the file/directory
      fs.renameSync(sourcePath, targetPath);
    } catch (error) {
      console.error(`Error moving ${sourcePath} to ${targetPath}:`, error);
    }
  });
  
  // Try to remove the source directory if it's empty
  try {
    fs.rmdirSync(sourceDir);
  } catch (e) {
    // Directory not empty or other error, which is fine
  }
};

// Main build function
const buildApp = async () => {
  console.log('🚀 Starting optimized build process...');
  
  try {
    // 1. Ensure directories exist
    ensureDirectories();
    
    // 2. Clean up node_modules to ensure a fresh install
    if (fs.existsSync('node_modules')) {
      console.log('🧹 Cleaning up node_modules...');
      fs.rmSync('node_modules', { recursive: true, force: true });
    }
    
    // 3. Install only production dependencies first to save memory
    console.log('📦 Installing production dependencies...');
    if (!runCommand('npm install --production --legacy-peer-deps --prefer-offline')) {
      throw new Error('Failed to install production dependencies');
    }
    
    // 4. Install dev dependencies separately
    console.log('📦 Installing dev dependencies...');
    if (!runCommand('npm install --only=dev --legacy-peer-deps --prefer-offline')) {
      throw new Error('Failed to install dev dependencies');
    }
    
    // 5. Build the React app with increased memory limit and optimizations
    console.log('🔨 Building React app...');
    if (!runCommand('node --max-old-space-size=4096 node_modules/react-scripts/scripts/build.js')) {
      throw new Error('Failed to build React app');
    }
    
    // 6. Install server dependencies
    console.log('📦 Installing server dependencies...');
    if (!runCommand('npm install --production --prefer-offline', { 
      cwd: serverDir,
      env: { 
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=2048'
      }
    })) {
      throw new Error('Failed to install server dependencies');
    }
    
    // 7. Organize build files in chunks to avoid memory issues
    console.log('📂 Organizing build files...');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Move all files from build to public in chunks
    moveFiles(buildDir, publicDir);
    
    // Move public directory back to build directory in chunks
    moveFiles(publicDir, buildDir);
    
    // 8. Clean up development dependencies to reduce image size
    console.log('🧹 Cleaning up development dependencies...');
    if (fs.existsSync('node_modules')) {
      fs.rmSync('node_modules', { recursive: true, force: true });
    }
    
    // Reinstall only production dependencies
    if (!runCommand('npm install --production --legacy-peer-deps --prefer-offline')) {
      console.warn('⚠️ Failed to clean up development dependencies');
    }
    
    console.log('✅ Build completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
};

// Start the build process
buildApp();