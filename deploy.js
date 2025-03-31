const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  buildDir: '.next',
  outputDir: 'dist',
  requiredFiles: [
    '.next',
    'public',
    'package.json',
    'next.config.js',
    '.env.production',
    'prisma'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
  process.exit(1);
}

// Main deployment function
async function deploy() {
  try {
    // Check if .env.production exists
    if (!fs.existsSync('.env.production')) {
      warning('No .env.production file found. Creating one from .env...');
      fs.copyFileSync('.env', '.env.production');
      success('Created .env.production');
    }

    // Build the application
    info('Building the application...');
    execSync('npm run build', { stdio: 'inherit' });
    success('Build completed');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir);
    } else {
      // Clean output directory
      fs.rmSync(config.outputDir, { recursive: true, force: true });
      fs.mkdirSync(config.outputDir);
    }

    // Copy required files to output directory
    info('Copying files to output directory...');
    config.requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        if (fs.lstatSync(file).isDirectory()) {
          execSync(`xcopy "${file}" "${config.outputDir}\\${file}" /E /I /H /Y`, { stdio: 'inherit' });
        } else {
          fs.copyFileSync(file, path.join(config.outputDir, file));
        }
        success(`Copied ${file}`);
      } else {
        warning(`File or directory not found: ${file}`);
      }
    });

    // Generate prisma client
    info('Generating Prisma client...');
    process.chdir(config.outputDir);
    execSync('npx prisma generate', { stdio: 'inherit' });
    success('Prisma client generated');

    // Create a start script
    fs.writeFileSync('start.bat', '@echo off\necho Starting the application...\nnpm start');
    success('Created start.bat');

    // Return to original directory
    process.chdir('..');

    success('Deployment package created successfully!');
    info(`Your application is ready for deployment in the "${config.outputDir}" directory.`);
    info('To deploy, copy the entire directory to your web server and run "npm start".');
  } catch (err) {
    error(`Deployment failed: ${err.message}`);
  }
}

// Run the deployment
deploy(); 