.PHONY: install dev frontend backend build typecheck lint fix clean preview up down image run

install:
	pnpm install

dev:
	pnpm -r --parallel --if-present run dev

frontend:
	pnpm --filter @aloft/web dev

backend:
	pnpm --filter @aloft/api dev

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

up:
	docker compose up -d

down:
	docker compose down

image:
	docker build -t aloft .

run:
	docker run --rm \
		--network aloft_default \
		--env-file apps/api/.env \
		-e MONGODB_URI=mongodb://mongo:27017/aloft \
		-p 8080:8080 \
		aloft

clean:
	find . -name 'dist' -not -path '*/node_modules/*' -exec rm -rf {} +
	find . -name 'node_modules' -maxdepth 3 -exec rm -rf {} +
