#!/bin/bash
# --execute=/bin/bash--

pg_dump -h /run/postgresql/ -d <%= dbName %> --schema-only --file=./db-schema.out

echo "finished"
