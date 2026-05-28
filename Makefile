.PHONY: install dev build typecheck lint fix clean preview

install:
	pnpm install

dev:
	pnpm --filter @aloft/web dev

build:
	pnpm -r build

typecheck:
	pnpm -r --if-present run typecheck

preview:
	pnpm --filter @aloft/web preview

lint:
	pnpm format:check
	pnpm -r --if-present run typecheck

fix:
	pnpm format

clean:
	find . -name 'dist' -not -path '*/node_modules/*' -exec rm -rf {} +
	find . -name 'node_modules' -maxdepth 3 -exec rm -rf {} +
