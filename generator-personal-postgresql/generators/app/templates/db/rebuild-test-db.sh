#!/bin/bash
# --execute=/bin/bash--

connections=$(psql -t -c "select count(*) from pg_stat_activity where datname='<%= dbName %>_test'")

if [ ${connections} != "0" ]; then
	printf "Cannot run while there are current connections to the database\n"
	exit 0
fi

ms1=$(date '+%s%2N')

psqlConnect="-h /run/postgresql/ -d <%= dbName %>"
connectToTest="-h /run/postgresql/ -d <%= dbName %>_test"
psql zz${psqlConnect} -c "drop database <%= dbName %>_test"
psql ${psqlConnect} -c "create database <%= dbName %>_test"
						

./generate-db-schema.sh

psql ${connectToTest} -f ./db-schema.out
psql ${connectToTest} -c "\
	grant select, insert, update, delete on all tables in schema public to <%= dbName %>_test; \
	grant select, update on all sequences in schema public to <%= dbName %>_test; \
	alter default privileges in schema public grant all on tables to <%= dbName %>_test; \
	alter default privileges in schema public grant all on sequences to <%= dbName %>_test; \
"

# Insert test data

for f in "./test-data/*"; do
	psql ${connectToTest} -f "${f}"
done 

ms2=$(date '+%s%2N')
msDiff=$((${ms2}-${ms1}))
ms=$((msDiff-100))
s=$((msDiff/100))

printf "finished rebuilding <%= dbName %>_test in ${s}.%02d seconds\n" ${ms}
