#!/bin/bash

# ============================================================================
# Setup Verification Script
# Checks that the development environment is correctly configured
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

# Icons
CHECK="✓"
CROSS="✗"
WARN="⚠"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ============================================================================
# Helper Functions
# ============================================================================

check_pass() {
    echo -e "  ${GREEN}${CHECK}${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}${CROSS}${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}${WARN}${NC} $1"
    ((WARNINGS++))
}

print_section() {
    echo ""
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}────────────────────────────────────────${NC}"
}

# ============================================================================
# Checks
# ============================================================================

check_node() {
    print_section "Node.js & npm"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            check_pass "Node.js v$(node -v | cut -d'v' -f2)"
        else
            check_fail "Node.js $(node -v) (requires 18+)"
        fi
    else
        check_fail "Node.js not installed"
    fi
    
    if command -v npm &> /dev/null; then
        check_pass "npm v$(npm -v)"
    else
        check_fail "npm not installed"
    fi
}

check_dependencies() {
    print_section "Dependencies"
    
    if [ -d "node_modules" ]; then
        check_pass "node_modules exists"
        
        # Check key packages
        if [ -d "node_modules/next" ]; then
            check_pass "next installed"
        else
            check_fail "next not installed"
        fi
        
        if [ -d "node_modules/@supabase/supabase-js" ]; then
            check_pass "@supabase/supabase-js installed"
        else
            check_fail "@supabase/supabase-js not installed"
        fi
    else
        check_fail "node_modules missing (run npm install)"
    fi
}

check_env() {
    print_section "Environment Variables"
    
    if [ -f ".env.local" ]; then
        check_pass ".env.local exists"
        
        # Check for required vars (without exposing values)
        if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null; then
            if grep -q "NEXT_PUBLIC_SUPABASE_URL=$" .env.local 2>/dev/null || grep -q 'NEXT_PUBLIC_SUPABASE_URL=""' .env.local 2>/dev/null; then
                check_warn "NEXT_PUBLIC_SUPABASE_URL is empty"
            else
                check_pass "NEXT_PUBLIC_SUPABASE_URL is set"
            fi
        else
            check_fail "NEXT_PUBLIC_SUPABASE_URL missing"
        fi
        
        if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null; then
            if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=$" .env.local 2>/dev/null || grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY=""' .env.local 2>/dev/null; then
                check_warn "NEXT_PUBLIC_SUPABASE_ANON_KEY is empty"
            else
                check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
            fi
        else
            check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
        fi
    else
        check_fail ".env.local missing (run setup.sh)"
    fi
}

check_git_hooks() {
    print_section "Git Hooks"
    
    if [ -d ".husky" ]; then
        check_pass ".husky directory exists"
        
        if [ -f ".husky/pre-commit" ]; then
            if [ -x ".husky/pre-commit" ]; then
                check_pass "pre-commit hook executable"
            else
                check_warn "pre-commit hook not executable"
            fi
        else
            check_warn "pre-commit hook missing"
        fi
        
        if [ -f ".husky/commit-msg" ]; then
            if [ -x ".husky/commit-msg" ]; then
                check_pass "commit-msg hook executable"
            else
                check_warn "commit-msg hook not executable"
            fi
        else
            check_warn "commit-msg hook missing"
        fi
    else
        check_warn ".husky directory missing"
    fi
}

check_mcp() {
    print_section "Cursor MCP Configuration"
    
    MCP_FILE="$HOME/.cursor/mcp.json"
    
    if [ -f "$MCP_FILE" ]; then
        check_pass "~/.cursor/mcp.json exists"
        
        # Check for configured servers
        if grep -q '"supabase"' "$MCP_FILE" 2>/dev/null; then
            check_pass "Supabase MCP configured"
        else
            check_warn "Supabase MCP not configured"
        fi
        
        if grep -q '"github"' "$MCP_FILE" 2>/dev/null; then
            check_pass "GitHub MCP configured"
        else
            check_warn "GitHub MCP not configured"
        fi
        
        if grep -q '"vercel"' "$MCP_FILE" 2>/dev/null; then
            check_pass "Vercel MCP configured"
        else
            check_warn "Vercel MCP not configured"
        fi
    else
        check_warn "~/.cursor/mcp.json not found (MCP servers not configured)"
        echo -e "        ${YELLOW}Run setup.sh to configure MCP servers${NC}"
    fi
}

check_cursor_rules() {
    print_section "Cursor Rules"
    
    if [ -d ".cursor/rules" ]; then
        RULE_COUNT=$(ls -1 .cursor/rules/*.mdc 2>/dev/null | wc -l)
        if [ "$RULE_COUNT" -gt 0 ]; then
            check_pass "$RULE_COUNT rule files found"
        else
            check_warn "No .mdc rule files found"
        fi
    else
        check_fail ".cursor/rules directory missing"
    fi
}

check_build() {
    print_section "Build Check"
    
    echo -e "  ${BLUE}Running type check...${NC}"
    if npm run typecheck &> /dev/null; then
        check_pass "TypeScript types valid"
    else
        check_fail "TypeScript errors found (run: npm run typecheck)"
    fi
}

# ============================================================================
# Summary
# ============================================================================

print_summary() {
    echo ""
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}  Verification Summary${NC}"
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}${CHECK} Passed:${NC}   $PASSED"
    echo -e "  ${YELLOW}${WARN} Warnings:${NC} $WARNINGS"
    echo -e "  ${RED}${CROSS} Failed:${NC}   $FAILED"
    echo ""
    
    if [ "$FAILED" -eq 0 ]; then
        if [ "$WARNINGS" -eq 0 ]; then
            echo -e "  ${GREEN}${BOLD}All checks passed! You're ready to code.${NC}"
        else
            echo -e "  ${GREEN}${BOLD}Setup complete with warnings.${NC}"
            echo -e "  ${YELLOW}Address warnings for the best experience.${NC}"
        fi
        return 0
    else
        echo -e "  ${RED}${BOLD}Some checks failed. Please fix the issues above.${NC}"
        return 1
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}${BOLD}Verifying Development Environment...${NC}"
    
    # Change to project root
    cd "$(dirname "$0")/.."
    
    check_node
    check_dependencies
    check_env
    check_git_hooks
    check_mcp
    check_cursor_rules
    # Skipping build check in verification for speed - uncomment if desired
    # check_build
    
    print_summary
}

main "$@"

