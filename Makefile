FLUTTER ?= fvm flutter
DART ?= fvm dart
PORT ?= 8787

.PHONY: setup check build serve sources bench
setup:
	command -v npx
	fvm install
	$(FLUTTER) pub get
	npm ci
check:
	$(DART) format --output=none --set-exit-if-changed lib test
	$(FLUTTER) analyze --no-pub lib test
	$(FLUTTER) test --no-pub
build:
	$(FLUTTER) build web --profile --wasm --no-web-resources-cdn --output build/profile
	$(FLUTTER) build web --release --wasm --no-web-resources-cdn --output build/release
serve:
	node tool/serve.mjs $(PORT)
sources:
	bash tool/sources.sh
bench:
	node tool/bench.mjs chromium
