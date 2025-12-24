#!/bin/bash

# AVES API ImageURL Verification Script
# Tests all critical endpoints to ensure imageUrl is present in responses

set -e

BASE_URL="${API_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "=================================================="
echo "AVES API ImageURL Verification"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local jq_filter="$3"
    local needs_auth="$4"

    echo -n "Testing $name... "

    local curl_opts="-s"
    if [ "$needs_auth" = "true" ] && [ -n "$AUTH_TOKEN" ]; then
        curl_opts="$curl_opts -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi

    local response=$(eval curl $curl_opts "$BASE_URL$endpoint")

    if [ $? -ne 0 ]; then
        echo -e "${RED}FAILED${NC} - Request failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Check if response is valid JSON
    if ! echo "$response" | jq empty 2>/dev/null; then
        echo -e "${RED}FAILED${NC} - Invalid JSON response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Apply JQ filter to check for imageUrl
    local result=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null)

    if [ "$result" = "true" ]; then
        echo -e "${GREEN}PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    elif [ "$result" = "false" ]; then
        echo -e "${RED}FAILED${NC} - Missing imageUrl"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "  Response preview:"
        echo "$response" | jq '.' | head -20
        return 1
    elif [ "$result" = "empty" ]; then
        echo -e "${YELLOW}SKIPPED${NC} - No data returned"
        return 0
    else
        echo -e "${RED}FAILED${NC} - Unexpected response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "Testing Core Endpoints..."
echo "-------------------------------------------"

# Test 1: Species List
test_endpoint \
    "GET /api/species" \
    "/api/species" \
    'if (.data | length) > 0 then (.data[0] | has("primaryImageUrl")) else "empty" end' \
    false

# Test 2: Species Detail
test_endpoint \
    "GET /api/species/:id" \
    "/api/species/1" \
    'if .images then (.images[0] | has("url") and has("thumbnailUrl")) else "empty" end' \
    false

# Test 3: Annotations List
test_endpoint \
    "GET /api/annotations" \
    "/api/annotations" \
    'if (.data | length) > 0 then (.data[0] | has("imageUrl")) else "empty" end' \
    false

# Test 4: Content Learn
test_endpoint \
    "GET /api/content/learn" \
    "/api/content/learn" \
    'if (.data | length) > 0 then (.data[0] | has("imageUrl")) else "empty" end' \
    false

echo ""
echo "Testing Authenticated Endpoints (requires AUTH_TOKEN)..."
echo "-------------------------------------------"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}SKIPPED${NC} - No AUTH_TOKEN provided"
    echo "Set AUTH_TOKEN environment variable to test authenticated endpoints"
else
    # Test 5: SRS Due Terms
    test_endpoint \
        "GET /api/srs/due" \
        "/api/srs/due" \
        'if (. | length) > 0 then (.[0] | has("imageUrl")) else "empty" end' \
        true

    # Test 6: Annotation Mastery Weak
    test_endpoint \
        "GET /api/mastery/weak/:userId" \
        "/api/mastery/weak/test-user-id" \
        'if (.annotations | length) > 0 then (.annotations[0] | has("imageUrl")) else "empty" end' \
        true
fi

echo ""
echo "=================================================="
echo "Results Summary"
echo "=================================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Check the full audit report: docs/API_AUDIT_REPORT.md"
    echo "2. Review service implementations for failed endpoints"
    echo "3. Ensure database has test data with images"
    exit 1
fi
