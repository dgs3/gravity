# fxhash project Makefile

# Variables
ENTRY=src/index.js

# Default target
.PHONY: all
all: dev

.PHONY: install
install:
	npm install --include=dev

# Local development server
.PHONY: dev
dev:
	npx fxhash dev

# Create a production bundle
.PHONY: build
build:
	npx fxhash bundle

# Preview the production bundle
.PHONY: preview
preview:
	npx fxhash preview --bundle $(BUNDLE)

# Clean the dist directory
.PHONY: clean
clean:
	rm -rf $(DIST)

# Rebuild and preview
.PHONY: rebuild
rebuild: clean build preview

# Run lint (if using eslint)
.PHONY: lint
lint:
	npx eslint "src/**/*.js" --ignore-pattern "**/*.min.js" --fix

# Open localhost in browser
.PHONY: open
open:
	open http://localhost:3000


