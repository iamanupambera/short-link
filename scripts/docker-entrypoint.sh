#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/typeorm/cli.js migration:run -d ./dist/database/dataSource.service.js

echo "Running database seeds..."
node node_modules/typeorm-extension/bin/cli.cjs -d ./dist/database/dataSource.service.js seed:run

echo "Starting application..."
exec node dist/main
