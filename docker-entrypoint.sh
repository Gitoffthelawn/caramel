#!/bin/sh
# caramel-app container entrypoint — one-root-compose (F-016).
#
# Fail-hard: apply DB migrations, THEN start the standalone server. `set -e`
# with no `|| true` and no retry loop — a failed migration must crash the boot
# loudly and visibly, never silently serve against an unmigrated schema.
set -e

echo ">>> [entrypoint] applying prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy \
  --schema apps/caramel-app/prisma/schema.prisma
echo ">>> [entrypoint] migrations applied; starting server"

exec node apps/caramel-app/server.js
