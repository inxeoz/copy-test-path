.PHONY: chrome firefox

chrome:
	@mkdir -p dist
	@echo "Building Chrome extension..."
	cd chromium && zip -r ../dist/copy-test-path-chrome.zip . -x "*.git*" -x "*.DS_Store"
	@echo "-> dist/copy-test-path-chrome.zip"

firefox:
	@mkdir -p dist
	@echo "Building Firefox extension..."
	cd firefox && zip -r ../dist/copy-test-path-firefox.xpi . -x "*.git*" -x "*.DS_Store"
	@echo "-> dist/copy-test-path-firefox.xpi"
