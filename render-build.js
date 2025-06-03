const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Starting build process for Render deployment...');

// Define paths
const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const buildDir = path.join(rootDir, 'build');
const frontendBuildDir = path.join(rootDir, 'build');

// Clean build directory
console.log('🧹 Cleaning build directory...');
fs.emptyDirSync(buildDir);

// Install frontend dependencies
console.log('📦 Installing frontend dependencies...');
execSync('npm install', { stdio: 'inherit' });

// Install backend dependencies first
console.log('📦 Installing backend dependencies...');
const serverPackageJson = require('./server/package.json');
const serverDependencies = serverPackageJson.dependencies || {};

// Create a temporary package.json with only the required dependencies
const tempPackageJson = {
  name: 'donation-app-server',
  version: '1.0.0',
  private: true,
  dependencies: serverDependencies
};

// Write the temporary package.json
fs.writeFileSync(
  path.join(rootDir, 'package-server.json'),
  JSON.stringify(tempPackageJson, null, 2)
);

// Install production dependencies in the root
console.log('📦 Installing production dependencies in root...');
execSync('npm install --production --prefix .', { stdio: 'inherit' });

// Build frontend
console.log('🔨 Building frontend...');
execSync('npm run build', { stdio: 'inherit' });

// Copy backend files to build directory
console.log('📂 Copying backend files...');
fs.copySync(serverDir, buildDir, {
  filter: (src) => {
    // Skip node_modules, .git, and other unnecessary files
    const relativePath = path.relative(serverDir, src);
    return !relativePath.startsWith('node_modules') && 
           !relativePath.startsWith('.git') &&
           !relativePath.endsWith('.env') &&
           !relativePath.includes('test') &&
           !relativePath.includes('coverage');
  }
});

// Copy frontend build to build/public
console.log('📂 Copying frontend build files...');
fs.ensureDirSync(path.join(buildDir, 'public'));
fs.copySync(frontendBuildDir, path.join(buildDir, 'public'), { overwrite: true });

// Create a package.json in the build directory
const packageJson = {
  name: 'donation-app',
  version: '1.0.0',
  private: true,
  main: 'server.js',
  scripts: {
    start: 'node server.js'
  },
  dependencies: {}
};

// Copy only production dependencies from server/package.json
try {
  const serverPackageJson = require('./server/package.json');
  if (serverPackageJson.dependencies) {
    packageJson.dependencies = serverPackageJson.dependencies;
  }
} catch (error) {
  console.warn('⚠️ Could not read server/package.json:', error.message);
}

// Write the package.json to the build directory
fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('✅ Package.json created in build directory');

// Create a .env file in the build directory
if (fs.existsSync(path.join(serverDir, '.env'))) {
  fs.copyFileSync(
    path.join(serverDir, '.env'),
    path.join(buildDir, '.env')
  );
  console.log('✅ Copied .env file to build directory');
} else {
  console.warn('⚠️ No .env file found in server directory');
}

console.log('🎉 Build process completed successfully!');
console.log('📦 Build directory structure:');
console.log(fs.readdirSync(buildDir));

process.exit(0);