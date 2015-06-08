#!/bin/bash
# --execute=/bin/bash--

connections=$(psql -t -c "select count(*) from pg_stat_activity where datname='<%= dbName %>_test'")

if [ ${connections} != "0" ]; then
	printf "Cannot run while there are current connections to the database\n"
	exit 0
fi

ms1=$(date '+%s%2N')

psqlConnect="-h /run/postgresql/ -d <%= dbName %>"
connectToDb="-h /run/postgresql/ -d <%= dbName %>_test"
psql ${psqlConnect} -c "drop database <%= dbName %>_test"
psql ${psqlConnect} -c "create database <%= dbName %>_test"
						

./generate-db-schema.sh

psql ${connectToDb} -1 -f ./db-schema.out
psql ${connectToDb} -1 -c "\
	grant select, insert, update, delete on all tables in schema public to <%= dbName %>_test; \
	grant select, update on all sequences in schema public to <%= dbName %>_test; \
	revoke all on all tables in schema public from <%= dbName %>; \
	revoke all on all sequences in schema public from <%= dbName %>; \
	alter default privileges in schema public grant select, insert, update, delete on tables to <%= dbName %>_test; \
	alter default privileges in schema public grant select, update on sequences to <%= dbName %>_test; \
	alter default privileges in schema public revoke select, insert, update, delete on tables from <%= dbName %>; \
	alter default privileges in schema public revoke select, update on sequences from <%= dbName %>; \
"

# Insert test data
if [ -f ./test-data/insert-all-test-data.sh ]; then
	printf "inserting all test data\n"
	./test-data/insert-all-test-data.sh "<%= dbName %>_test"
fi

ms2=$(date '+%s%2N')
msDiff=$((${ms2}-${ms1}))
ms=$((msDiff-100))
s=$((msDiff/100))

printf "finished rebuilding <%= dbName %>_test in ${s}.%02d seconds\n" ${ms}
