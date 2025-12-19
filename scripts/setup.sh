#!/bin/bash

# ============================================================================
# Project Setup Script
# Automated onboarding for new contributors
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Icons
CHECK="✓"
CROSS="✗"
ARROW="→"
INFO="ℹ"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}${ARROW} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${INFO} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    if [ -n "$default" ]; then
        echo -e -n "${CYAN}${prompt} [${default}]: ${NC}"
    else
        echo -e -n "${CYAN}${prompt}: ${NC}"
    fi
    read input
    
    if [ -z "$input" ] && [ -n "$default" ]; then
        eval "$var_name='$default'"
    else
        eval "$var_name='$input'"
    fi
}

prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    
    if [ "$default" = "y" ]; then
        echo -e -n "${CYAN}${prompt} [Y/n]: ${NC}"
    else
        echo -e -n "${CYAN}${prompt} [y/N]: ${NC}"
    fi
    read answer
    
    if [ -z "$answer" ]; then
        answer="$default"
    fi
    
    case "$answer" in
        [Yy]* ) return 0;;
        * ) return 1;;
    esac
}

prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    
    echo -e -n "${CYAN}${prompt}: ${NC}"
    read -s input
    echo ""
    eval "$var_name='$input'"
}

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================

check_prerequisites() {
    print_header "Step 1: Checking Prerequisites"
    
    local all_good=true
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            print_success "Node.js v$(node -v | cut -d'v' -f2) (18+ required)"
        else
            print_error "Node.js v$(node -v | cut -d'v' -f2) is too old (18+ required)"
            all_good=false
        fi
    else
        print_error "Node.js is not installed"
        echo -e "    ${YELLOW}Install from: https://nodejs.org/${NC}"
        all_good=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm v$(npm -v)"
    else
        print_error "npm is not installed"
        all_good=false
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        print_success "git v$(git --version | cut -d' ' -f3)"
    else
        print_error "git is not installed"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        print_error "Please install missing prerequisites and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# ============================================================================
# Step 2: Install Dependencies
# ============================================================================

install_dependencies() {
    print_header "Step 2: Installing Dependencies"
    
    if [ -d "node_modules" ]; then
        print_info "node_modules exists, checking if up to date..."
    fi
    
    print_step "Running npm install..."
    npm install
    
    print_success "Dependencies installed!"
}

# ============================================================================
# Step 3: Setup Environment Variables
# ============================================================================

setup_env() {
    print_header "Step 3: Setting Up Environment Variables"
    
    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists"
        if ! prompt_yes_no "Do you want to reconfigure it?" "n"; then
            print_info "Keeping existing .env.local"
            return
        fi
    fi
    
    echo ""
    print_info "You'll need your Supabase project credentials."
    echo -e "    ${YELLOW}Find them at: https://supabase.com/dashboard/project/_/settings/api${NC}"
    echo ""
    
    prompt_input "Supabase Project URL" SUPABASE_URL ""
    prompt_input "Supabase Publishable Key (anon/public key)" SUPABASE_KEY ""
    
    # Create .env.local
    cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_KEY}
EOF
    
    print_success ".env.local created!"
}

# ============================================================================
# Step 4: Setup MCP Servers (Optional)
# ============================================================================

setup_mcp() {
    print_header "Step 4: Setting Up Cursor MCP Servers (Optional)"
    
    echo -e "${BLUE}MCP servers give Cursor AI direct access to:${NC}"
    echo "  • Supabase: Query your database schema, tables, RLS policies"
    echo "  • GitHub: Interact with PRs, issues, diffs"
    echo "  • Vercel: Check deployments, logs, environment"
    echo ""
    
    if ! prompt_yes_no "Would you like to configure MCP servers?" "y"; then
        print_info "Skipping MCP setup. You can run this script again later."
        return
    fi
    
    MCP_FILE="$HOME/.cursor/mcp.json"
    MCP_DIR="$HOME/.cursor"
    
    # Check if mcp.json already exists
    if [ -f "$MCP_FILE" ]; then
        print_warning "~/.cursor/mcp.json already exists"
        if ! prompt_yes_no "Do you want to overwrite it?" "n"; then
            print_info "Keeping existing MCP configuration"
            return
        fi
    fi
    
    # Create .cursor directory if it doesn't exist
    mkdir -p "$MCP_DIR"
    
    echo ""
    print_info "Let's configure each MCP server. Leave blank to skip any."
    echo ""
    
    # Supabase MCP
    echo -e "${BOLD}Supabase MCP${NC}"
    echo -e "    ${YELLOW}Get token: https://supabase.com/dashboard/account/tokens${NC}"
    prompt_input "Supabase Access Token (or press Enter to skip)" SUPABASE_TOKEN ""
    
    echo ""
    
    # GitHub MCP
    echo -e "${BOLD}GitHub MCP${NC}"
    echo -e "    ${YELLOW}Get token: https://github.com/settings/tokens${NC}"
    echo -e "    ${YELLOW}Required scopes: repo, read:org${NC}"
    prompt_input "GitHub Personal Access Token (or press Enter to skip)" GITHUB_TOKEN ""
    
    echo ""
    
    # Vercel MCP
    echo -e "${BOLD}Vercel MCP${NC}"
    echo -e "    ${YELLOW}Get token: https://vercel.com/account/tokens${NC}"
    prompt_input "Vercel Token (or press Enter to skip)" VERCEL_TOKEN ""
    
    # Build MCP config
    echo "{" > "$MCP_FILE"
    echo '  "mcpServers": {' >> "$MCP_FILE"
    
    local first=true
    
    if [ -n "$SUPABASE_TOKEN" ]; then
        if [ "$first" = false ]; then echo "," >> "$MCP_FILE"; fi
        first=false
        cat >> "$MCP_FILE" << EOF
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_TOKEN}"
      ]
    }
EOF
    fi
    
    if [ -n "$GITHUB_TOKEN" ]; then
        if [ "$first" = false ]; then 
            # Add comma to previous entry
            sed -i '' -e '$ s/}$/},/' "$MCP_FILE" 2>/dev/null || sed -i '$ s/}$/},/' "$MCP_FILE"
        fi
        first=false
        cat >> "$MCP_FILE" << EOF
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
EOF
    fi
    
    if [ -n "$VERCEL_TOKEN" ]; then
        if [ "$first" = false ]; then 
            sed -i '' -e '$ s/}$/},/' "$MCP_FILE" 2>/dev/null || sed -i '$ s/}$/},/' "$MCP_FILE"
        fi
        first=false
        cat >> "$MCP_FILE" << EOF
    "vercel": {
      "command": "npx",
      "args": ["-y", "vercel-mcp-server"],
      "env": {
        "VERCEL_API_TOKEN": "${VERCEL_TOKEN}"
      }
    }
EOF
    fi
    
    echo '  }' >> "$MCP_FILE"
    echo '}' >> "$MCP_FILE"
    
    if [ "$first" = true ]; then
        print_warning "No MCP servers configured"
    else
        print_success "MCP configuration saved to ~/.cursor/mcp.json"
        print_info "Restart Cursor to activate MCP servers"
    fi
}

# ============================================================================
# Step 5: Initialize Git Hooks
# ============================================================================

setup_git_hooks() {
    print_header "Step 5: Setting Up Git Hooks"
    
    if [ -d ".husky" ]; then
        print_success "Husky already initialized"
    else
        print_step "Initializing Husky..."
        npx husky install 2>/dev/null || npm run prepare 2>/dev/null || true
        print_success "Git hooks configured"
    fi
    
    # Make sure hooks are executable
    if [ -f ".husky/pre-commit" ]; then
        chmod +x .husky/pre-commit
    fi
    if [ -f ".husky/commit-msg" ]; then
        chmod +x .husky/commit-msg
    fi
    if [ -f ".husky/pre-push" ]; then
        chmod +x .husky/pre-push
    fi
    
    print_success "Git hooks ready!"
}

# ============================================================================
# Step 6: Run Verification
# ============================================================================

run_verification() {
    print_header "Step 6: Verifying Setup"
    
    ./scripts/verify-setup.sh
}

# ============================================================================
# Step 7: Success Message
# ============================================================================

print_success_message() {
    print_header "🎉 Setup Complete!"
    
    echo -e "${GREEN}You're ready to start developing!${NC}"
    echo ""
    echo -e "${BOLD}Quick Start:${NC}"
    echo -e "  ${CYAN}npm run dev${NC}          Start the development server"
    echo -e "  ${CYAN}npm run lint${NC}         Check for linting errors"
    echo -e "  ${CYAN}npm run build${NC}        Build for production"
    echo ""
    echo -e "${BOLD}Key Files:${NC}"
    echo -e "  ${CYAN}docs/CONTRIBUTING.md${NC}  Development workflow guide"
    echo -e "  ${CYAN}docs/ARCHITECTURE.md${NC}  Project structure overview"
    echo -e "  ${CYAN}docs/CONVENTIONS.md${NC}   Coding standards"
    echo ""
    echo -e "${BOLD}Cursor Tips:${NC}"
    echo -e "  Use ${CYAN}@cursor-rules${NC}    to reference project rules"
    echo -e "  Use ${CYAN}@file${NC}            to reference specific files"
    echo -e "  Use ${CYAN}@codebase${NC}        to search the codebase"
    echo ""
    
    if [ -f "$HOME/.cursor/mcp.json" ]; then
        echo -e "${YELLOW}${INFO} Remember to restart Cursor to activate MCP servers${NC}"
        echo ""
    fi
    
    echo -e "${BOLD}Next Steps:${NC}"
    echo "  1. Open the project in Cursor"
    echo "  2. Run 'npm run dev' to start developing"
    echo "  3. Read CONTRIBUTING.md for the full workflow"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    clear
    echo ""
    echo -e "${BLUE}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║                                                           ║"
    echo "  ║   🚀 Project Setup                                        ║"
    echo "  ║                                                           ║"
    echo "  ║   This script will set up your development environment    ║"
    echo "  ║   and configure Cursor for optimal AI-assisted coding.    ║"
    echo "  ║                                                           ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Change to project root
    cd "$(dirname "$0")/.."
    
    check_prerequisites
    install_dependencies
    setup_env
    setup_mcp
    setup_git_hooks
    run_verification
    print_success_message
}

main "$@"

