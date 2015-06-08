#!/usr/bin/env bash
# --execute=/bin/bash--

./generate-db-schema.sh && ./generate-table-schemas.sh && ./rebuild-test-db.sh
