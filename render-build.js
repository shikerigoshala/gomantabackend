const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Starting backend build process for Render deployment...');

// Define paths
const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const buildDir = path.join(rootDir, 'build');

// Clean build directory
console.log('🧹 Cleaning build directory...');
fs.emptyDirSync(buildDir);

// Install backend dependencies in the server directory first
console.log('📦 Installing backend dependencies...');
process.chdir(serverDir);
execSync('npm install --production', { stdio: 'inherit' });
process.chdir(rootDir);

// Get the server's package.json
const serverPackage = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));

// Create a package.json for production
const prodPackageJson = {
  name: 'donation-app-backend',
  version: '1.0.0',
  private: true,
  main: 'server.js',
  scripts: {
    start: 'node server.js',
    dev: 'nodemon server.js'
  },
  dependencies: serverPackage.dependencies || {}
};

// Copy server files to build directory first
console.log('📂 Copying server files...');
fs.copySync(serverDir, buildDir, {
  filter: (src) => {
    // Exclude unnecessary files
    const exclude = [
      'node_modules',
      '.git',
      '.env',
      '.gitignore',
      '*.log',
      'README.md',
      'test',
      'coverage',
      'package-lock.json'
    ];
    
    const relativePath = path.relative(serverDir, src);
    return !exclude.some(pattern => 
      typeof pattern === 'string' 
        ? relativePath.includes(pattern)
        : pattern.test(relativePath)
    );
  }
});

// Write the production package.json
fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2)
);

// Install production dependencies in the build directory
console.log('📦 Installing production dependencies in build directory...');
process.chdir(buildDir);

// Install dependencies one by one to ensure they're all installed
const requiredDependencies = ['cors', 'express', 'dotenv', 'jsonwebtoken', 'nodemailer'];
requiredDependencies.forEach(dep => {
  if (prodPackageJson.dependencies[dep]) {
    console.log(`📦 Installing ${dep}...`);
    try {
      execSync(`npm install ${dep}@${prodPackageJson.dependencies[dep]} --production`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`⚠️ Failed to install ${dep}:`, error.message);
      // Continue with other dependencies
    }
  }
});

// Final npm install to ensure everything is properly linked
console.log('🔍 Verifying all dependencies are installed...');
execSync('npm install --production', { stdio: 'inherit' });

console.log('✅ Backend build completed successfully!');

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