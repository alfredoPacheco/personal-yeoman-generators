#! /usr/bin/env bash

genArray=( "angular" "express" "fonts" "javascript-libs" "pjson" "ptr" "scss" "git" "heroku" )

pushd "./generator-personal"
	npm install -g ./ &
popd

for var in "${genArray[@]}"; do
	echo "now in ${var}"
	pushd "./generator-personal-${var}"
		npm install -g ./ &
	popd
done

wait
