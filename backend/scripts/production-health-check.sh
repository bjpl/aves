#!/bin/bash

###############################################################################
# Production Health Check Script
#
# Verifies production deployment health by testing critical endpoints,
# database connectivity, authentication, and admin workflow functionality.
#
# Usage:
#   ./scripts/production-health-check.sh <BASE_URL> <ADMIN_TOKEN>
#
# Example:
#   ./scripts/production-health-check.sh https://api.example.com your-admin-jwt-token
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3001}"
ADMIN_TOKEN="${2}"
TIMEOUT=10
FAILED_CHECKS=0

# Helper functions
log_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_response() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local headers="$4"

    local response
    local status_code

    if [ -n "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" -H "$headers" "$url" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" = "$expected_status" ]; then
        log_success "$name (HTTP $status_code)"
        echo "$body"
        return 0
    else
        log_error "$name failed (expected HTTP $expected_status, got $status_code)"
        echo "$body" | head -n 5
        return 1
    fi
}

###############################################################################
# Pre-flight Checks
###############################################################################

echo ""
echo "=========================================="
echo "Production Health Check"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "=========================================="
echo ""

if [ -z "$ADMIN_TOKEN" ]; then
    log_warning "ADMIN_TOKEN not provided. Admin-only endpoints will be skipped."
    log_info "Usage: $0 <BASE_URL> <ADMIN_TOKEN>"
fi

###############################################################################
# 1. Server Health Check
###############################################################################

echo "1. Server Health Check"
echo "---"

if response=$(check_response "Health endpoint" "${BASE_URL}/health" "200"); then
    # Parse JSON response
    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
    timestamp=$(echo "$response" | jq -r '.timestamp' 2>/dev/null || echo "unknown")

    if [ "$status" = "ok" ]; then
        log_success "Server is healthy (timestamp: $timestamp)"
    else
        log_error "Server health status is not 'ok': $status"
    fi
else
    log_error "Health check endpoint failed"
fi

echo ""

###############################################################################
# 2. Database Connectivity
###############################################################################

echo "2. Database Connectivity"
echo "---"

# Test database through species endpoint (public data)
if response=$(check_response "Database query" "${BASE_URL}/api/species?limit=1" "200"); then
    count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
        log_success "Database connectivity verified (returned $count species)"
    else
        log_warning "Database query returned no results"
    fi
else
    log_error "Database connectivity test failed"
fi

echo ""

###############################################################################
# 3. Authentication
###############################################################################

echo "3. Authentication"
echo "---"

# Test unauthenticated access (should fail)
if response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" \
    "${BASE_URL}/api/ai/annotations/stats" 2>/dev/null || echo "000"); then
    status_code=$(echo "$response" | tail -n 1)
    if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        log_success "Unauthenticated request correctly rejected (HTTP $status_code)"
    else
        log_warning "Unauthenticated request got unexpected status: HTTP $status_code"
    fi
fi

echo ""

###############################################################################
# 4. Admin Endpoints (requires ADMIN_TOKEN)
###############################################################################

if [ -n "$ADMIN_TOKEN" ]; then
    echo "4. Admin Endpoints"
    echo "---"

    # 4a. Stats endpoint
    if response=$(check_response "Stats endpoint" \
        "${BASE_URL}/api/ai/annotations/stats" \
        "200" \
        "Authorization: Bearer $ADMIN_TOKEN"); then

        # Validate stats structure
        total=$(echo "$response" | jq -r '.data.total' 2>/dev/null || echo "null")
        pending=$(echo "$response" | jq -r '.data.pending' 2>/dev/null || echo "null")
        approved=$(echo "$response" | jq -r '.data.approved' 2>/dev/null || echo "null")
        rejected=$(echo "$response" | jq -r '.data.rejected' 2>/dev/null || echo "null")

        if [ "$total" != "null" ] && [ "$pending" != "null" ]; then
            log_success "Stats structure valid (total: $total, pending: $pending, approved: $approved, rejected: $rejected)"
        else
            log_error "Stats response missing expected fields"
        fi
    fi

    # 4b. Pending annotations
    if response=$(check_response "Pending annotations" \
        "${BASE_URL}/api/ai/annotations/pending?limit=5" \
        "200" \
        "Authorization: Bearer $ADMIN_TOKEN"); then

        count=$(echo "$response" | jq -r '.annotations | length' 2>/dev/null || echo "0")
        total=$(echo "$response" | jq -r '.total' 2>/dev/null || echo "0")
        log_success "Pending annotations retrieved (showing $count of $total)"
    fi

    # 4c. Analytics endpoint
    if response=$(check_response "Analytics endpoint" \
        "${BASE_URL}/api/annotations/analytics" \
        "200" \
        "Authorization: Bearer $ADMIN_TOKEN"); then

        has_overview=$(echo "$response" | jq 'has("overview")' 2>/dev/null || echo "false")
        has_by_species=$(echo "$response" | jq 'has("bySpecies")' 2>/dev/null || echo "false")
        has_quality_flags=$(echo "$response" | jq 'has("qualityFlags")' 2>/dev/null || echo "false")

        if [ "$has_overview" = "true" ] && [ "$has_by_species" = "true" ] && [ "$has_quality_flags" = "true" ]; then
            log_success "Analytics structure valid"
        else
            log_error "Analytics response missing expected sections"
        fi
    fi

    echo ""
else
    echo "4. Admin Endpoints"
    echo "---"
    log_warning "Skipped (no ADMIN_TOKEN provided)"
    echo ""
fi

###############################################################################
# 5. Security Headers
###############################################################################

echo "5. Security Headers"
echo "---"

headers=$(curl -s -I --max-time "$TIMEOUT" "${BASE_URL}/health" 2>/dev/null || echo "")

# Check for important security headers
if echo "$headers" | grep -qi "X-Content-Type-Options"; then
    log_success "X-Content-Type-Options header present"
else
    log_warning "X-Content-Type-Options header missing"
fi

if echo "$headers" | grep -qi "X-Frame-Options"; then
    log_success "X-Frame-Options header present"
else
    log_warning "X-Frame-Options header missing"
fi

if echo "$headers" | grep -qi "Strict-Transport-Security"; then
    log_success "Strict-Transport-Security header present"
else
    log_warning "Strict-Transport-Security header missing (expected for HTTPS)"
fi

if echo "$headers" | grep -qi "Content-Security-Policy"; then
    log_success "Content-Security-Policy header present"
else
    log_warning "Content-Security-Policy header missing"
fi

echo ""

###############################################################################
# 6. Response Time Check
###############################################################################

echo "6. Performance Check"
echo "---"

# Measure response time for health endpoint
start_time=$(date +%s%N)
curl -s --max-time "$TIMEOUT" "${BASE_URL}/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

if [ "$response_time" -lt 100 ]; then
    log_success "Health endpoint response time: ${response_time}ms (excellent)"
elif [ "$response_time" -lt 500 ]; then
    log_success "Health endpoint response time: ${response_time}ms (good)"
elif [ "$response_time" -lt 2000 ]; then
    log_warning "Health endpoint response time: ${response_time}ms (acceptable)"
else
    log_error "Health endpoint response time: ${response_time}ms (too slow)"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo "=========================================="
echo "Health Check Summary"
echo "=========================================="

if [ $FAILED_CHECKS -eq 0 ]; then
    log_success "All health checks passed!"
    echo ""
    exit 0
else
    log_error "$FAILED_CHECKS check(s) failed"
    echo ""
    echo "Review the failures above and check:"
    echo "  - Server logs for errors"
    echo "  - Database connectivity"
    echo "  - Environment configuration"
    echo "  - Network/firewall settings"
    echo ""
    exit 1
fi
