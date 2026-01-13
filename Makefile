# ============================================
# ROADGUARD MAKEFILE
# ============================================

.PHONY: all install test deploy frontend clean

# Default target
all: install test

# ============================================
# INSTALLATION
# ============================================

install: install-contracts install-frontend

install-contracts:
	@echo "Installing contract dependencies..."
	cd contracts && forge install OpenZeppelin/openzeppelin-contracts --no-git

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# ============================================
# TESTING
# ============================================

test: test-contracts test-frontend

test-contracts:
	@echo "Running contract tests..."
	cd contracts && forge test -vv

test-contracts-gas:
	@echo "Running contract tests with gas report..."
	cd contracts && forge test --gas-report

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test

test-coverage:
	@echo "Running tests with coverage..."
	cd contracts && forge coverage
	cd frontend && npm run test:coverage

# ============================================
# DEPLOYMENT
# ============================================

deploy-testnet:
	@echo "Deploying to Mantle Sepolia Testnet..."
	cd contracts && forge script script/Deploy.s.sol \
		--rpc-url https://rpc.sepolia.mantle.xyz \
		--broadcast \
		--verify \
		-vvv

deploy-mainnet:
	@echo "⚠️  Deploying to Mantle Mainnet..."
	@echo "Are you sure? Press Ctrl+C to cancel, Enter to continue..."
	@read
	cd contracts && forge script script/Deploy.s.sol \
		--rpc-url https://rpc.mantle.xyz \
		--broadcast \
		--verify \
		-vvv

deploy-dry-run:
	@echo "Dry run deployment (no broadcast)..."
	cd contracts && forge script script/Deploy.s.sol \
		--rpc-url https://rpc.sepolia.mantle.xyz \
		-vvv

# ============================================
# FRONTEND
# ============================================

frontend-dev:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

frontend-build:
	@echo "Building frontend for production..."
	cd frontend && npm run build

frontend-start:
	@echo "Starting production frontend..."
	cd frontend && npm start

frontend-lint:
	@echo "Linting frontend..."
	cd frontend && npm run lint

frontend-typecheck:
	@echo "Type checking frontend..."
	cd frontend && npm run typecheck

# ============================================
# DATABASE
# ============================================

db-setup:
	@echo "Setting up database schema..."
	psql $(DATABASE_URL) < database/schema.sql

db-studio:
	@echo "Opening Drizzle Studio..."
	cd frontend && npm run db:studio

# ============================================
# UTILITIES
# ============================================

clean:
	@echo "Cleaning build artifacts..."
	cd contracts && rm -rf out cache
	cd frontend && rm -rf .next node_modules

format:
	@echo "Formatting code..."
	cd contracts && forge fmt
	cd frontend && npm run lint -- --fix

# Contract utilities
contract-size:
	@echo "Checking contract size..."
	cd contracts && forge build --sizes

contract-snapshot:
	@echo "Creating gas snapshot..."
	cd contracts && forge snapshot

# ============================================
# HELP
# ============================================

help:
	@echo "RoadGuard Makefile Commands"
	@echo "==========================="
	@echo ""
	@echo "Installation:"
	@echo "  make install          - Install all dependencies"
	@echo "  make install-contracts - Install contract deps only"
	@echo "  make install-frontend - Install frontend deps only"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make test-contracts   - Run contract tests"
	@echo "  make test-frontend    - Run frontend tests"
	@echo "  make test-coverage    - Run tests with coverage"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-testnet   - Deploy to Mantle Sepolia"
	@echo "  make deploy-mainnet   - Deploy to Mantle Mainnet"
	@echo "  make deploy-dry-run   - Simulate deployment"
	@echo ""
	@echo "Frontend:"
	@echo "  make frontend-dev     - Start dev server"
	@echo "  make frontend-build   - Build for production"
	@echo "  make frontend-start   - Start production server"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Remove build artifacts"
	@echo "  make format           - Format all code"
	@echo "  make contract-size    - Check contract sizes"
