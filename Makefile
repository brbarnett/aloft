.PHONY: install dev build typecheck clean preview

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

clean:
	find . -name 'dist' -not -path '*/node_modules/*' -exec rm -rf {} +
	find . -name 'node_modules' -maxdepth 3 -exec rm -rf {} +
