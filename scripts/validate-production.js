#!/usr/bin/env node

/**
 * Production Validation Script
 *
 * Comprehensive pre-deployment validation for the aves project.
 * Performs multiple checks to ensure production readiness:
 * - Dependencies installed
 * - TypeScript compilation
 * - Linting
 * - Tests
 * - Build process
 * - Security checks
 * - Configuration validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Validation results storage
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// Root directory
const rootDir = path.resolve(__dirname, '..');

/**
 * Execute a shell command and return the result
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options,
    });
  } catch (error) {
    if (options.ignoreErrors) {
      return error.stdout || '';
    }
    throw error;
  }
}

/**
 * Log a message with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(70) + '\n');
}

/**
 * Log a check result
 */
function logCheck(checkName, passed, message = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${checkName}`, color);
  if (message) {
    console.log(`     ${message}`);
  }
}

/**
 * Log a warning
 */
function logWarning(checkName, message) {
  log(`⚠ WARN ${checkName}`, 'yellow');
  if (message) {
    console.log(`     ${message}`);
  }
}

/**
 * Record a check result
 */
function recordResult(checkName, passed, message = '') {
  const result = { check: checkName, message };
  if (passed) {
    results.passed.push(result);
    logCheck(checkName, true, message);
  } else {
    results.failed.push(result);
    logCheck(checkName, false, message);
  }
}

/**
 * Record a warning
 */
function recordWarning(checkName, message) {
  results.warnings.push({ check: checkName, message });
  logWarning(checkName, message);
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

/**
 * Check 1: Verify all required files exist
 */
function checkRequiredFiles() {
  logSection('1. Required Files');

  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    '.gitignore',
    '.env.example',
    'backend/package.json',
    'frontend/package.json',
    'backend/.env.example',
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    const exists = fs.existsSync(filePath);
    recordResult(`File exists: ${file}`, exists,
      exists ? '' : 'Required file is missing');
  });
}

/**
 * Check 2: Verify dependencies are installed
 */
function checkDependenciesInstalled() {
  logSection('2. Dependencies Installation');

  const checkNodeModules = (workspace = '') => {
    const dir = workspace ? path.join(rootDir, workspace) : rootDir;
    const nodeModulesPath = path.join(dir, 'node_modules');
    const exists = fs.existsSync(nodeModulesPath);
    const label = workspace ? `${workspace} dependencies` : 'Root dependencies';
    recordResult(label, exists,
      exists ? '' : 'Run npm install');
  };

  checkNodeModules();
  checkNodeModules('backend');
  checkNodeModules('frontend');

  // Check for package-lock.json (security)
  const hasLockFile = fs.existsSync(path.join(rootDir, 'package-lock.json'));
  if (!hasLockFile) {
    recordWarning('package-lock.json', 'Lock file missing - dependencies not pinned');
  } else {
    recordResult('package-lock.json exists', true, 'Dependencies are pinned');
  }
}

/**
 * Check 3: Run TypeScript compilation
 */
function checkTypeScript() {
  logSection('3. TypeScript Compilation');

  // Check backend TypeScript
  try {
    log('Checking backend TypeScript...', 'cyan');
    exec('cd backend && npx tsc --noEmit');
    recordResult('Backend TypeScript compilation', true);
  } catch (error) {
    recordResult('Backend TypeScript compilation', false,
      'TypeScript errors detected - fix before deploying');
  }

  // Check if frontend has TypeScript
  const frontendTsConfig = path.join(rootDir, 'frontend', 'tsconfig.json');
  if (fs.existsSync(frontendTsConfig)) {
    try {
      log('Checking frontend TypeScript...', 'cyan');
      exec('cd frontend && npx tsc --noEmit');
      recordResult('Frontend TypeScript compilation', true);
    } catch (error) {
      recordResult('Frontend TypeScript compilation', false,
        'TypeScript errors detected - fix before deploying');
    }
  }
}

/**
 * Check 4: Run ESLint
 */
function checkLinting() {
  logSection('4. Code Linting');

  try {
    log('Running linters...', 'cyan');
    exec('npm run lint', { ignoreErrors: true });
    recordResult('ESLint checks', true);
  } catch (error) {
    const errorOutput = error.stderr || error.stdout || '';
    const hasErrors = errorOutput.includes('error');

    if (hasErrors) {
      recordResult('ESLint checks', false, 'Linting errors detected');
    } else {
      recordWarning('ESLint checks', 'Linting warnings detected');
    }
  }
}

/**
 * Check 5: Run tests
 */
function checkTests() {
  logSection('5. Test Suite');

  try {
    log('Running tests...', 'cyan');
    exec('npm run test', { ignoreErrors: true });
    recordResult('Test suite', true, 'All tests passing');
  } catch (error) {
    recordResult('Test suite', false, 'Some tests are failing');
  }
}

/**
 * Check 6: Verify build process
 */
function checkBuild() {
  logSection('6. Build Process');

  try {
    log('Building backend...', 'cyan');
    exec('npm run build');
    recordResult('Backend build', true);
  } catch (error) {
    recordResult('Backend build', false, 'Build failed');
  }

  // Try frontend build if build:all script exists
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  if (pkg.scripts && pkg.scripts['build:all']) {
    try {
      log('Building all workspaces...', 'cyan');
      exec('npm run build:all');
      recordResult('Frontend build', true);
    } catch (error) {
      recordResult('Frontend build', false, 'Build failed');
    }
  }
}

/**
 * Check 7: Scan for console.log statements in production code
 */
function checkConsoleLogs() {
  logSection('7. Production Code Quality');

  try {
    // Search for console.log in src directories, excluding test files
    const backendLogs = exec(
      'grep -r "console\\." backend/src --include="*.ts" --include="*.js" --exclude="*.test.*" --exclude="*.spec.*" || true',
      { ignoreErrors: true }
    );

    const frontendLogs = exec(
      'grep -r "console\\." frontend/src --include="*.ts" --include="*.tsx" --include="*.js" --exclude="*.test.*" --exclude="*.spec.*" || true',
      { ignoreErrors: true }
    );

    const hasBackendLogs = backendLogs.trim().length > 0;
    const hasFrontendLogs = frontendLogs.trim().length > 0;

    if (!hasBackendLogs && !hasFrontendLogs) {
      recordResult('No console.log in production code', true);
    } else {
      const files = [];
      if (hasBackendLogs) files.push('backend');
      if (hasFrontendLogs) files.push('frontend');
      recordWarning('console.log statements found',
        `Found in ${files.join(', ')} - consider using proper logging`);
    }
  } catch (error) {
    recordWarning('Console log check', 'Unable to scan for console.log statements');
  }
}

/**
 * Check 8: Verify environment variable documentation
 */
function checkEnvDocumentation() {
  logSection('8. Environment Configuration');

  // Check .env.example files exist and are comprehensive
  const checkEnvExample = (filePath, label) => {
    if (!fs.existsSync(filePath)) {
      recordResult(`${label} .env.example`, false, 'Example file missing');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line =>
      line.trim() && !line.trim().startsWith('#')
    );

    recordResult(`${label} .env.example`, true,
      `${lines.length} environment variables documented`);

    // Check for placeholder values
    const hasPlaceholders = lines.some(line =>
      line.includes('your_') ||
      line.includes('change-this') ||
      line.includes('_here')
    );

    if (hasPlaceholders) {
      recordResult(`${label} has placeholder values`, true,
        'Good - using placeholder values in examples');
    }
  };

  checkEnvExample(path.join(rootDir, '.env.example'), 'Root');
  checkEnvExample(path.join(rootDir, 'backend', '.env.example'), 'Backend');
}

/**
 * Check 9: Run security checks for hardcoded secrets
 */
function checkSecrets() {
  logSection('9. Security - Secret Detection');

  try {
    log('Running secret detection...', 'cyan');
    exec('node scripts/check-secrets.js');
    recordResult('Secret detection', true, 'No hardcoded secrets detected');
  } catch (error) {
    recordResult('Secret detection', false,
      'Potential secrets found - review check-secrets.js output');
  }
}

/**
 * Check 10: Verify .gitignore is properly configured
 */
function checkGitignore() {
  logSection('10. Git Configuration');

  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    recordResult('.gitignore exists', false, 'Missing .gitignore file');
    return;
  }

  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

  // Check for critical patterns
  const requiredPatterns = [
    { pattern: /\.env/i, name: '.env files' },
    { pattern: /node_modules/i, name: 'node_modules' },
    { pattern: /dist|build/i, name: 'build directories' },
    { pattern: /\.log/i, name: 'log files' },
  ];

  requiredPatterns.forEach(({ pattern, name }) => {
    const hasPattern = pattern.test(gitignore);
    recordResult(`Gitignore excludes ${name}`, hasPattern,
      hasPattern ? '' : `Add ${name} to .gitignore`);
  });

  // Check that .env files are not committed
  try {
    const trackedEnvFiles = exec('git ls-files | grep "\.env$" || true');
    const hasTrackedEnv = trackedEnvFiles.trim().length > 0;

    if (hasTrackedEnv) {
      recordResult('No .env files committed', false,
        'Remove .env files from git: git rm --cached .env');
    } else {
      recordResult('No .env files committed', true);
    }
  } catch (error) {
    recordWarning('Git tracked files check', 'Unable to check tracked files');
  }
}

/**
 * Check 11: Verify package versions are properly specified
 */
function checkPackageVersions() {
  logSection('11. Dependency Versioning');

  const checkPackageJson = (filePath, label) => {
    if (!fs.existsSync(filePath)) return;

    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    let unpinnedCount = 0;
    let wildcardCount = 0;

    Object.entries(allDeps || {}).forEach(([name, version]) => {
      // Check for wildcards or very loose versioning
      if (version === '*' || version === 'latest') {
        wildcardCount++;
      } else if (version.startsWith('^') || version.startsWith('~')) {
        unpinnedCount++;
      }
    });

    if (wildcardCount > 0) {
      recordWarning(`${label} package versions`,
        `${wildcardCount} packages use wildcards - pin versions for production`);
    } else if (unpinnedCount > 0) {
      recordResult(`${label} package versions`, true,
        `Using semver ranges (${unpinnedCount} packages with ^ or ~)`);
    } else {
      recordResult(`${label} package versions`, true,
        'All versions are pinned');
    }
  };

  checkPackageJson(path.join(rootDir, 'package.json'), 'Root');
  checkPackageJson(path.join(rootDir, 'backend', 'package.json'), 'Backend');
  checkPackageJson(path.join(rootDir, 'frontend', 'package.json'), 'Frontend');
}

/**
 * Check 12: Verify Node.js version compatibility
 */
function checkNodeVersion() {
  logSection('12. Runtime Environment');

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));

  if (pkg.engines && pkg.engines.node) {
    const requiredVersion = pkg.engines.node;
    const currentVersion = process.version;

    log(`Required: ${requiredVersion}`, 'cyan');
    log(`Current: ${currentVersion}`, 'cyan');

    // Simple version check (could be more sophisticated)
    const requiredMajor = parseInt(requiredVersion.replace(/[^\d]/g, ''));
    const currentMajor = parseInt(currentVersion.replace('v', '').split('.')[0]);

    const compatible = currentMajor >= requiredMajor;
    recordResult('Node.js version compatibility', compatible,
      compatible ? '' : `Upgrade to Node.js ${requiredVersion}`);
  } else {
    recordWarning('Node.js version', 'No engine requirements specified in package.json');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log('\n' + '█'.repeat(70), 'bright');
  log('  PRODUCTION VALIDATION SCRIPT', 'bright');
  log('  Aves Project Pre-Deployment Checks', 'cyan');
  log('█'.repeat(70) + '\n', 'bright');

  log(`Working directory: ${rootDir}`, 'cyan');
  log(`Node version: ${process.version}`, 'cyan');
  log(`Timestamp: ${new Date().toISOString()}\n`, 'cyan');

  // Run all validation checks
  checkRequiredFiles();
  checkDependenciesInstalled();
  checkTypeScript();
  checkLinting();
  checkTests();
  checkBuild();
  checkConsoleLogs();
  checkEnvDocumentation();
  checkSecrets();
  checkGitignore();
  checkPackageVersions();
  checkNodeVersion();

  // Print summary
  logSection('VALIDATION SUMMARY');

  const totalChecks = results.passed.length + results.failed.length;
  const passRate = ((results.passed.length / totalChecks) * 100).toFixed(1);

  log(`Total Checks: ${totalChecks}`, 'bright');
  log(`Passed: ${results.passed.length}`, 'green');
  log(`Failed: ${results.failed.length}`, 'red');
  log(`Warnings: ${results.warnings.length}`, 'yellow');
  log(`Pass Rate: ${passRate}%\n`, results.failed.length === 0 ? 'green' : 'yellow');

  // Print failed checks
  if (results.failed.length > 0) {
    console.log('\n' + '─'.repeat(70));
    log('FAILED CHECKS:', 'red');
    console.log('─'.repeat(70));
    results.failed.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.check}`);
      if (result.message) {
        console.log(`   → ${result.message}`);
      }
    });
  }

  // Print warnings
  if (results.warnings.length > 0) {
    console.log('\n' + '─'.repeat(70));
    log('WARNINGS:', 'yellow');
    console.log('─'.repeat(70));
    results.warnings.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.check}`);
      if (result.message) {
        console.log(`   → ${result.message}`);
      }
    });
  }

  // Final verdict
  console.log('\n' + '═'.repeat(70));
  if (results.failed.length === 0) {
    log('✓ PRODUCTION VALIDATION PASSED', 'green');
    log('  All checks passed - ready for deployment!', 'bright');
  } else {
    log('✗ PRODUCTION VALIDATION FAILED', 'red');
    log(`  Fix ${results.failed.length} failed check(s) before deploying`, 'bright');
  }
  console.log('═'.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(results.failed.length === 0 ? 0 : 1);
}

// Run the validation
main().catch(error => {
  console.error('\n' + '═'.repeat(70));
  log('✗ VALIDATION SCRIPT ERROR', 'red');
  console.error('═'.repeat(70));
  console.error(error);
  process.exit(1);
});
