#!/usr/bin/env bash

if [ -z ${1+x} ]; then
	echo "build-heroku-db requires the environment to bulid"
	exit 1
fi
env="${1}"

if [ "${env}" = "prod" ]; then
	echo "You are about to rebuild the production database.  Are you sure? (y/N)"
	read areYouSure
	
	if [ "${areYouSure}" != "y" ]; then
		exit 0
	fi
fi

./rebuild-temp-db.sh "${env}"
if [ "$?" != "0" ]; then
	exit 1
fi
echo "status: ${status}"
heroku pg:reset DATABASE --app "weather-accuracy-${env}"
PGUSER=heroku PGPASSWORD=heroku heroku pg:push weather_accuracy_temp DATABASE --app "weather-accuracy-${env}"
