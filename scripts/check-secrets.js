#!/usr/bin/env node

/**
 * Secret Detection Script
 *
 * Scans the codebase for potential hardcoded secrets, API keys, and sensitive data.
 * This helps prevent accidental exposure of credentials in version control.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const rootDir = path.resolve(__dirname, '..');
const findings = [];
const warnings = [];

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Secret detection patterns
 * These are common patterns that indicate potential secrets
 */
const secretPatterns = [
  // API Keys and Tokens
  {
    name: 'Generic API Key',
    pattern: /['\"]?api[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]/gi,
    severity: 'high',
  },
  {
    name: 'Generic Secret Key',
    pattern: /['\"]?secret[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9_\-]{16,}['\"]/gi,
    severity: 'high',
  },
  {
    name: 'Generic Access Token',
    pattern: /['\"]?access[_-]?token['\"]?\s*[:=]\s*['\"][a-zA-Z0-0_\-]{16,}['\"]/gi,
    severity: 'high',
  },

  // Specific Service Keys
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'critical',
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-api[a-zA-Z0-9\-_]{48,}/g,
    severity: 'critical',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    severity: 'critical',
  },

  // Database Credentials
  {
    name: 'Database URL with credentials',
    pattern: /postgres:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_!@#$%^&*()]+@/gi,
    severity: 'critical',
  },
  {
    name: 'MongoDB URL with credentials',
    pattern: /mongodb(\+srv)?:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_!@#$%^&*()]+@/gi,
    severity: 'critical',
  },

  // JWT Secrets
  {
    name: 'JWT Secret (non-placeholder)',
    pattern: /jwt[_-]?secret['\"]?\s*[:=]\s*['\"](?!your|change|test|secret|example)[a-zA-Z0-9_\-]{16,}['\"]/gi,
    severity: 'high',
  },

  // Generic Passwords
  {
    name: 'Hardcoded Password',
    pattern: /password['\"]?\s*[:=]\s*['\"](?!your|change|test|password|example|\*+|\.+)[a-zA-Z0-9!@#$%^&*()_\-+=]{8,}['\"]/gi,
    severity: 'high',
  },

  // Private Keys
  {
    name: 'Private Key',
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    severity: 'critical',
  },

  // GitHub Tokens
  {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
  },
  {
    name: 'GitHub OAuth Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
  },
];

/**
 * Files and directories to exclude from scanning
 */
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.env.example',
  '.env.*.example',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'check-secrets.js', // Don't scan this file
  'validate-production.js',
];

/**
 * File extensions to scan
 */
const includeExtensions = [
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
  '.env',
  '.yaml',
  '.yml',
  '.config.js',
  '.config.ts',
];

/**
 * Check if a file should be scanned
 */
function shouldScanFile(filePath) {
  const relativePath = path.relative(rootDir, filePath);

  // Exclude patterns
  if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
    return false;
  }

  // Include only specific extensions
  const ext = path.extname(filePath);
  return includeExtensions.includes(ext);
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);

    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludePatterns.some(pattern => file.includes(pattern))) {
          getAllFiles(filePath, fileList);
        }
      } else if (shouldScanFile(filePath)) {
        fileList.push(filePath);
      }
    } catch (error) {
      // Skip files we can't access
    }
  });

  return fileList;
}

/**
 * Scan a file for secrets
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);

    secretPatterns.forEach(({ name, pattern, severity }) => {
      const matches = content.match(pattern);

      if (matches && matches.length > 0) {
        // Filter out false positives (examples, placeholders, etc.)
        const realMatches = matches.filter(match => {
          const lower = match.toLowerCase();
          return !(
            lower.includes('example') ||
            lower.includes('your_') ||
            lower.includes('change-this') ||
            lower.includes('placeholder') ||
            lower.includes('xxx') ||
            lower.includes('...') ||
            lower.includes('***')
          );
        });

        if (realMatches.length > 0) {
          findings.push({
            file: relativePath,
            type: name,
            severity,
            matches: realMatches,
          });
        }
      }
    });
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Check if .env files are committed
 */
function checkCommittedEnvFiles() {
  try {
    const trackedFiles = execSync('git ls-files', {
      cwd: rootDir,
      encoding: 'utf-8',
    });

    const envFiles = trackedFiles
      .split('\n')
      .filter(file => {
        const filename = path.basename(file);
        return filename === '.env' ||
               (filename.startsWith('.env.') && !filename.endsWith('.example'));
      });

    if (envFiles.length > 0) {
      warnings.push({
        type: 'Committed .env files',
        files: envFiles,
        message: 'These .env files are tracked in git and may contain secrets',
      });
    }
  } catch (error) {
    // Not a git repository or git not available
  }
}

/**
 * Check .gitignore configuration
 */
function checkGitignore() {
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    warnings.push({
      type: 'Missing .gitignore',
      message: '.gitignore file not found - environment files may be committed',
    });
    return;
  }

  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

  // Check for critical patterns
  const requiredPatterns = [
    { pattern: /^\.env$/m, name: '.env' },
    { pattern: /^\.env\.\*/m, name: '.env.*' },
  ];

  requiredPatterns.forEach(({ pattern, name }) => {
    if (!pattern.test(gitignore)) {
      warnings.push({
        type: 'Incomplete .gitignore',
        message: `Pattern "${name}" not found in .gitignore`,
      });
    }
  });
}

/**
 * Main execution
 */
function main() {
  console.log('\n' + '═'.repeat(70));
  log('  SECRET DETECTION SCAN', 'bright');
  log('  Scanning for hardcoded secrets and credentials', 'cyan');
  console.log('═'.repeat(70) + '\n');

  log(`Working directory: ${rootDir}`, 'cyan');
  log(`Timestamp: ${new Date().toISOString()}\n`, 'cyan');

  // Get all files to scan
  log('Scanning files...', 'cyan');
  const files = getAllFiles(rootDir);
  log(`Found ${files.length} files to scan\n`, 'cyan');

  // Scan each file
  files.forEach(scanFile);

  // Additional checks
  checkCommittedEnvFiles();
  checkGitignore();

  // Print results
  console.log('─'.repeat(70));
  log('SCAN RESULTS', 'bright');
  console.log('─'.repeat(70) + '\n');

  // Print findings by severity
  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');

  if (critical.length > 0) {
    log(`CRITICAL FINDINGS (${critical.length}):`, 'red');
    critical.forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.type} in ${finding.file}`);
      finding.matches.forEach(match => {
        // Redact the actual secret
        const redacted = match.substring(0, 10) + '***REDACTED***';
        console.log(`   → ${redacted}`);
      });
    });
    console.log();
  }

  if (high.length > 0) {
    log(`HIGH SEVERITY FINDINGS (${high.length}):`, 'yellow');
    high.forEach((finding, index) => {
      console.log(`\n${index + 1}. ${finding.type} in ${finding.file}`);
      finding.matches.forEach(match => {
        const redacted = match.substring(0, 10) + '***REDACTED***';
        console.log(`   → ${redacted}`);
      });
    });
    console.log();
  }

  if (warnings.length > 0) {
    log(`WARNINGS (${warnings.length}):`, 'yellow');
    warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.type}`);
      console.log(`   → ${warning.message}`);
      if (warning.files) {
        warning.files.forEach(file => {
          console.log(`     - ${file}`);
        });
      }
    });
    console.log();
  }

  // Summary
  console.log('─'.repeat(70));
  if (findings.length === 0 && warnings.length === 0) {
    log('✓ NO SECRETS DETECTED', 'green');
    log('  All checks passed - no hardcoded secrets found', 'bright');
  } else {
    const totalIssues = findings.length + warnings.length;
    log(`✗ ISSUES DETECTED: ${totalIssues}`, 'red');
    log(`  Critical: ${critical.length}`, critical.length > 0 ? 'red' : 'reset');
    log(`  High: ${high.length}`, high.length > 0 ? 'yellow' : 'reset');
    log(`  Warnings: ${warnings.length}`, warnings.length > 0 ? 'yellow' : 'reset');
    console.log();
    log('  ACTION REQUIRED:', 'bright');
    log('  1. Remove any hardcoded secrets from source code', 'yellow');
    log('  2. Use environment variables for all sensitive data', 'yellow');
    log('  3. Update .gitignore to exclude .env files', 'yellow');
    log('  4. Rotate any exposed credentials immediately', 'yellow');
  }
  console.log('═'.repeat(70) + '\n');

  // Exit with error if secrets found
  process.exit(findings.length > 0 ? 1 : 0);
}

// Run the scan
main();
