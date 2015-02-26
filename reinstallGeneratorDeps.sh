#! /usr/bin/env bash

genArray=( "angular" "express" "fonts" "javascript-libs" "pjson" "ptr" "scss" )

pushd "./generator-personal"
	rm -rf ./node_modules
	npm install &
popd

for var in "${genArray[@]}"; do
	echo "now in ${var}"
	pushd "./generator-personal-${var}"
		rm -rf ./node_modules
		npm install &
	popd
done
