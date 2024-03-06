# General options
name = chrome-pandoc
version = $(shell git describe --tags --always)

all: assets/haskell-logo@16px.png assets/haskell-logo@32px.png assets/haskell-logo@48px.png assets/haskell-logo@128px.png

assets/haskell-logo.svg:
	curl -sSL -z $@ --create-dirs -o $@ https://upload.wikimedia.org/wikipedia/commons/1/1c/Haskell-Logo.svg

assets/haskell-logo@16px.png: assets/haskell-logo.svg
	inkscape $< -o $@ -w 16 -h 16

assets/haskell-logo@32px.png: assets/haskell-logo.svg
	inkscape $< -o $@ -w 32 -h 32

assets/haskell-logo@48px.png: assets/haskell-logo.svg
	inkscape $< -o $@ -w 48 -h 48

assets/haskell-logo@128px.png: assets/haskell-logo.svg
	inkscape $< -o $@ -w 128 -h 128

build: all
	npm install

release: clean build
	7z a releases/$(name)-$(version).zip manifest.json src assets ./@types

clean:
	git clean -d -f -X
