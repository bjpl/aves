#!/bin/bash

###############################################################################
# Test Migration Helper Script
#
# This script helps automate common test migration tasks.
#
# Usage:
#   ./migration-script.sh <command> [options]
#
# Commands:
#   analyze <file>           - Analyze a test file for migration opportunities
#   backup <file>            - Create a backup of test file before migration
#   replace-imports <file>   - Update imports to use @/test-utils
#   replace-query <file>     - Replace QueryClient setup with utilities
#   replace-axios <file>     - Replace axios mocking with utilities
#   replace-async <file>     - Replace setTimeout with async utilities
#   full-migrate <file>      - Run all replacements (with backup)
#   validate <file>          - Run tests and check for issues
#   batch-analyze <dir>      - Analyze all test files in directory
#   batch-migrate <dir>      - Migrate all test files in directory
#
# Examples:
#   ./migration-script.sh analyze src/__tests__/MyComponent.test.tsx
#   ./migration-script.sh full-migrate src/__tests__/MyComponent.test.tsx
#   ./migration-script.sh batch-analyze src/__tests__/
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if file exists
check_file() {
  if [ ! -f "$1" ]; then
    error "File not found: $1"
    exit 1
  fi
}

# Analyze command
analyze_file() {
  check_file "$1"
  info "Analyzing $1 for migration opportunities..."

  echo ""
  echo "=== Migration Opportunities ==="
  echo ""

  # Check for QueryClient
  if grep -q "new QueryClient" "$1"; then
    warning "Found manual QueryClient setup"
    echo "  → Replace with: createTestQueryClient()"
  fi

  # Check for axios spies
  if grep -q "jest.spyOn(axios" "$1"; then
    warning "Found axios spy setup"
    echo "  → Replace with: mockAxiosGet/Post/etc()"
  fi

  # Check for setTimeout
  if grep -q "setTimeout.*resolve" "$1"; then
    warning "Found setTimeout promises"
    echo "  → Replace with: flushPromises() or waitForLoadingToFinish()"
  fi

  # Check for fireEvent
  if grep -q "fireEvent\." "$1"; then
    warning "Found fireEvent usage"
    echo "  → Replace with: userEvent"
  fi

  # Check for manual QueryClientProvider
  if grep -q "QueryClientProvider" "$1"; then
    warning "Found manual QueryClientProvider wrapping"
    echo "  → Replace with: renderWithQuery()"
  fi

  # Check for jest.fn
  if grep -q "jest\.fn\|jest\.mock\|jest\.spyOn" "$1"; then
    warning "Found jest mocking (if using Vitest)"
    echo "  → Replace with: vi.fn/mock/spyOn"
  fi

  # Count lines
  lines=$(wc -l < "$1")
  echo ""
  success "Analysis complete: $lines lines"
  echo "  Estimated reduction after migration: ~40-60%"
  echo ""
}

# Backup command
backup_file() {
  check_file "$1"
  backup="$1.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$1" "$backup"
  success "Backup created: $backup"
}

# Replace imports
replace_imports() {
  check_file "$1"
  info "Updating imports in $1..."

  # Create temp file
  tmp=$(mktemp)

  # Check if @/test-utils imports already exist
  if grep -q "@/test-utils" "$1"; then
    warning "File already has @/test-utils imports, skipping"
    return
  fi

  # Add imports after other testing library imports
  awk '
    /^import.*@testing-library/ && !imported {
      print
      if (getline > 0) print
      print "import { renderWithQuery, createTestQueryClient } from '\''@/test-utils/react-query-helpers'\'';"
      print "import { mockAxiosGet, mockAxiosPost, clearAxiosMocks } from '\''@/test-utils/axios-mock-helpers'\'';"
      print "import { waitForLoadingToFinish, flushPromises } from '\''@/test-utils/async-test-helpers'\'';"
      imported = 1
      next
    }
    { print }
  ' "$1" > "$tmp"

  mv "$tmp" "$1"
  success "Imports updated"
}

# Replace QueryClient setup
replace_query() {
  check_file "$1"
  info "Replacing QueryClient setup in $1..."

  # This is a simple replacement - may need manual adjustment
  sed -i.tmp 's/new QueryClient({[^}]*})/createTestQueryClient()/g' "$1"
  rm "$1.tmp" 2>/dev/null || true

  success "QueryClient setup replaced"
}

# Replace axios mocking
replace_axios() {
  check_file "$1"
  info "Replacing axios mocking in $1..."

  # Note: This is a basic replacement, complex mocks may need manual adjustment
  warning "Axios mock replacement requires manual review"
  echo "  Review lines with: jest.spyOn(axios, ...)"
  echo "  Replace with appropriate mockAxiosGet/Post/etc()"

  # Count occurrences
  count=$(grep -c "jest.spyOn(axios" "$1" || true)
  if [ "$count" -gt 0 ]; then
    echo "  Found $count axios spy calls to replace"
  fi
}

# Replace async patterns
replace_async() {
  check_file "$1"
  info "Replacing async patterns in $1..."

  # Replace setTimeout promises with flushPromises
  sed -i.tmp 's/await new Promise(resolve => setTimeout(resolve, [0-9]*));/await flushPromises();/g' "$1"
  rm "$1.tmp" 2>/dev/null || true

  success "Async patterns replaced"
}

# Full migration
full_migrate() {
  check_file "$1"
  info "Starting full migration of $1..."

  # Create backup
  backup_file "$1"

  # Run all replacements
  replace_imports "$1"
  replace_query "$1"
  replace_async "$1"

  warning "Manual steps still required:"
  echo "  1. Replace axios mocking (see analyze output)"
  echo "  2. Replace fireEvent with userEvent"
  echo "  3. Add clearAxiosMocks() to afterEach"
  echo "  4. Review and test changes"

  success "Automated migration complete"
}

# Validate
validate_file() {
  check_file "$1"
  info "Validating $1..."

  # Run the test
  if npm test "$1"; then
    success "Tests pass!"
  else
    error "Tests failed - review changes"
    exit 1
  fi
}

# Batch analyze
batch_analyze() {
  if [ ! -d "$1" ]; then
    error "Directory not found: $1"
    exit 1
  fi

  info "Analyzing all test files in $1..."

  find "$1" -name "*.test.ts" -o -name "*.test.tsx" | while read -r file; do
    echo ""
    echo "=== $file ==="
    analyze_file "$file"
  done

  success "Batch analysis complete"
}

# Batch migrate
batch_migrate() {
  if [ ! -d "$1" ]; then
    error "Directory not found: $1"
    exit 1
  fi

  warning "This will modify multiple files. Continue? (y/n)"
  read -r confirm
  if [ "$confirm" != "y" ]; then
    info "Cancelled"
    exit 0
  fi

  info "Migrating all test files in $1..."

  count=0
  find "$1" -name "*.test.ts" -o -name "*.test.tsx" | while read -r file; do
    echo ""
    echo "=== Migrating $file ==="
    full_migrate "$file"
    count=$((count + 1))
  done

  success "Batch migration complete: $count files processed"
}

# Main command handler
case "$1" in
  analyze)
    [ -z "$2" ] && error "Usage: $0 analyze <file>" && exit 1
    analyze_file "$2"
    ;;
  backup)
    [ -z "$2" ] && error "Usage: $0 backup <file>" && exit 1
    backup_file "$2"
    ;;
  replace-imports)
    [ -z "$2" ] && error "Usage: $0 replace-imports <file>" && exit 1
    replace_imports "$2"
    ;;
  replace-query)
    [ -z "$2" ] && error "Usage: $0 replace-query <file>" && exit 1
    replace_query "$2"
    ;;
  replace-axios)
    [ -z "$2" ] && error "Usage: $0 replace-axios <file>" && exit 1
    replace_axios "$2"
    ;;
  replace-async)
    [ -z "$2" ] && error "Usage: $0 replace-async <file>" && exit 1
    replace_async "$2"
    ;;
  full-migrate)
    [ -z "$2" ] && error "Usage: $0 full-migrate <file>" && exit 1
    full_migrate "$2"
    ;;
  validate)
    [ -z "$2" ] && error "Usage: $0 validate <file>" && exit 1
    validate_file "$2"
    ;;
  batch-analyze)
    [ -z "$2" ] && error "Usage: $0 batch-analyze <dir>" && exit 1
    batch_analyze "$2"
    ;;
  batch-migrate)
    [ -z "$2" ] && error "Usage: $0 batch-migrate <dir>" && exit 1
    batch_migrate "$2"
    ;;
  *)
    echo "Test Migration Helper Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  analyze <file>           - Analyze a test file for migration opportunities"
    echo "  backup <file>            - Create a backup of test file before migration"
    echo "  replace-imports <file>   - Update imports to use @/test-utils"
    echo "  replace-query <file>     - Replace QueryClient setup with utilities"
    echo "  replace-axios <file>     - Replace axios mocking with utilities"
    echo "  replace-async <file>     - Replace setTimeout with async utilities"
    echo "  full-migrate <file>      - Run all replacements (with backup)"
    echo "  validate <file>          - Run tests and check for issues"
    echo "  batch-analyze <dir>      - Analyze all test files in directory"
    echo "  batch-migrate <dir>      - Migrate all test files in directory"
    echo ""
    echo "Examples:"
    echo "  $0 analyze src/__tests__/MyComponent.test.tsx"
    echo "  $0 full-migrate src/__tests__/MyComponent.test.tsx"
    echo "  $0 batch-analyze src/__tests__/"
    exit 1
    ;;
esac
