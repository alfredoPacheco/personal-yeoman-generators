#!/bin/bash
# --execute=/bin/bash--

connections=$(psql -t -c "select count(*) from pg_stat_activity where datname='<%= dbName %>_temp'")

if [ -z ${1+x} ]; then
	echo "rebuild-temp-db requires the environment to bulid"
	exit 1
fi
env="${1}"

if [ ${connections} != "0" ]; then
	printf "Cannot run while there are current connections to the database\n"
	exit 1
fi

ms1=$(date '+%s%2N')

./generate-db-schema.sh
./generate-table-schemas.sh

psqlConnect="-h /run/postgresql/"
connectToDb="-h /run/postgresql/ -d  <%= dbName %>_temp"
psql ${psqlConnect} -c "drop database <%= dbName %>_temp"
psql ${psqlConnect} -c "create database <%= dbName %>_temp"

psql ${connectToDb} -1 -f ./db-schema.out
psql ${connectToDb} -1 -c "\
	grant select, insert, update, delete on all tables in schema public to heroku; \
	grant select, update on all sequences in schema public to heroku; \
	alter default privileges in schema public grant select, insert, update, delete on tables to heroku; \
	alter default privileges in schema public grant select, update on sequences to heroku; \
"

# if we're pushing to the show environment, then we want test data
insertDataFile=''
if [ "${env}" = "show" ]; then
	insertDataFile='./test-data/insert-all-test-data.sh'
else 
	insertDataFile='./initial-data/insert-all-initial-data.sh'
fi

# Insert initial data
if [ -f "${insertDataFile}" ]; then
	printf "inserting all initial data\n"
	"${insertDataFile}" "<%= dbName %>_temp"
fi

ms2=$(date '+%s%2N')
msDiff=$((${ms2}-${ms1}))
ms=$((msDiff-100))
s=$((msDiff/100))

printf "finished rebuilding <%= dbName %> in ${s}.%02d seconds\n" ${ms}

exit 0
