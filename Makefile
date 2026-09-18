# Local pipeline. `make ci` is exactly what GitHub Actions runs.
.PHONY: install dev build preview lint fmt fmt-check check ci clean

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run lint

fmt:
	npm run format

fmt-check:
	npm run format:check

check:
	npm run check

ci:
	npm ci
	npm run lint
	npm run format:check
	npm run check
	npm run build

clean:
	rm -rf dist .astro
