#!/bin/bash
# --execute=/bin/bash--

res=$(psql -h /run/postgresql/ -d <%= dbName %> --tuples-only -c "select pt.tablename from pg_catalog.pg_tables pt where pt.schemaname = 'public'")

for table in ${res}; do
	mkdir -p ./tables
	tableCreateFile="./tables/${table}_create.sql"
	if [ ! -f "${tableCreateFile}" ]; then
		touch "${tableCreateFile}"
	fi
	
    pg_dump -h /run/postgresql/ -d <%= dbName %> --schema-only --table="${table}" --file="${tableCreateFile}"
done
