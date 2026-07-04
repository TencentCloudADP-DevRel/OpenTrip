.PHONY: dev dev-web dev-api check test lint format typecheck build docs deploy install help

install: ## Install all workspace dependencies
	@pnpm install

dev: ## Start web + api dev servers together (creates apps/api/.env if missing)
	@test -f apps/api/.env || (cp apps/api/.env.example apps/api/.env && echo "Created apps/api/.env from example — edit it if needed.")
	@pnpm dev

dev-web: ## Start only the web dev server (Vite, proxies /api to :8787)
	@pnpm --filter @wayfare/web dev

dev-api: ## Start only the api dev server (Hono via tsx, port 8787)
	@test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
	@pnpm --filter @wayfare/api dev

check: ## Run all quality checks (typecheck + lint + test + build)
	@pnpm check

typecheck: ## Run TypeScript type checking across all packages
	@pnpm typecheck

test: ## Run tests across all packages
	@pnpm test

lint: ## Run linter across all packages
	@pnpm lint

format: ## Run formatter across all packages
	@pnpm -r format

build: ## Build all packages
	@pnpm build

docs: ## Validate documentation links and structure
	@pnpm docs:check

deploy: ## Deployment entry points
	@echo "Cloudflare: see deploy/cloudflare/README.md"
	@echo "Docker:     see deploy/docker/README.md"

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'
