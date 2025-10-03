/**
 * E2E Testing Setup Validation Script
 *
 * CONCEPT: Verify Playwright installation and configuration
 * WHY: Catch setup issues early before running tests
 * USAGE: npx ts-node e2e/utils/validate-setup.ts
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

class SetupValidator {
  private results: ValidationResult[] = [];

  validate(name: string, condition: boolean, successMsg: string, failMsg: string): void {
    this.results.push({
      name,
      passed: condition,
      message: condition ? successMsg : failMsg
    });
  }

  async runValidation(): Promise<void> {
    console.log('🔍 Validating E2E Testing Setup...\n');

    // Check Playwright installation
    try {
      const playwrightVersion = execSync('npx playwright --version', { encoding: 'utf-8' }).trim();
      this.validate(
        'Playwright Installation',
        true,
        `✅ Playwright installed: ${playwrightVersion}`,
        '❌ Playwright not installed'
      );
    } catch {
      this.validate(
        'Playwright Installation',
        false,
        '',
        '❌ Playwright not installed. Run: npm install -D @playwright/test'
      );
    }

    // Check configuration file
    const configPath = join(process.cwd(), 'playwright.config.ts');
    this.validate(
      'Configuration File',
      existsSync(configPath),
      '✅ playwright.config.ts exists',
      '❌ playwright.config.ts not found'
    );

    // Check test directory
    const testDir = join(process.cwd(), 'e2e', 'tests');
    this.validate(
      'Test Directory',
      existsSync(testDir),
      '✅ e2e/tests directory exists',
      '❌ e2e/tests directory not found'
    );

    // Check fixtures directory
    const fixturesDir = join(process.cwd(), 'e2e', 'fixtures');
    this.validate(
      'Fixtures Directory',
      existsSync(fixturesDir),
      '✅ e2e/fixtures directory exists',
      '❌ e2e/fixtures directory not found'
    );

    // Check test files
    const testFiles = [
      'navigation.spec.ts',
      'learning-flow.spec.ts',
      'practice-mode.spec.ts',
      'species-browser.spec.ts',
      'responsive-design.spec.ts',
      'smoke.spec.ts'
    ];

    const existingTests = testFiles.filter(file =>
      existsSync(join(testDir, file))
    );

    this.validate(
      'Test Files',
      existingTests.length === testFiles.length,
      `✅ All ${testFiles.length} test files exist`,
      `❌ Missing test files: ${testFiles.length - existingTests.length}`
    );

    // Check browsers installation
    try {
      execSync('npx playwright install --dry-run chromium', { encoding: 'utf-8' });
      this.validate(
        'Browser Installation',
        true,
        '✅ Browsers appear to be installed',
        '❌ Browsers not installed'
      );
    } catch {
      this.validate(
        'Browser Installation',
        false,
        '',
        '⚠️  Browsers may not be installed. Run: npx playwright install'
      );
    }

    // Check NPM scripts
    try {
      const packageJson = require(join(process.cwd(), 'package.json'));
      const hasE2EScripts = packageJson.scripts['test:e2e'] !== undefined;

      this.validate(
        'NPM Scripts',
        hasE2EScripts,
        '✅ E2E test scripts configured in package.json',
        '❌ E2E test scripts missing from package.json'
      );
    } catch {
      this.validate(
        'NPM Scripts',
        false,
        '',
        '❌ Could not read package.json'
      );
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    this.validate(
      'Node.js Version',
      majorVersion >= 18,
      `✅ Node.js ${nodeVersion} (>= 18 required)`,
      `❌ Node.js ${nodeVersion} is too old. Version 18+ required.`
    );

    // Print results
    this.printResults();
  }

  private printResults(): void {
    console.log('\n📊 Validation Results:\n');
    console.log('═'.repeat(60));

    let passed = 0;
    let failed = 0;

    this.results.forEach(result => {
      console.log(`${result.message}`);
      result.passed ? passed++ : failed++;
    });

    console.log('═'.repeat(60));
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}\n`);

    if (failed === 0) {
      console.log('🎉 All validation checks passed! Your E2E setup is ready.\n');
      console.log('📝 Next steps:');
      console.log('   1. Run smoke tests: npm run test:e2e:smoke');
      console.log('   2. Run full suite: npm run test:e2e');
      console.log('   3. View UI mode: npm run test:e2e:ui\n');
    } else {
      console.log('⚠️  Some validation checks failed. Please address the issues above.\n');
      process.exit(1);
    }
  }
}

// Run validation
const validator = new SetupValidator();
validator.runValidation().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
