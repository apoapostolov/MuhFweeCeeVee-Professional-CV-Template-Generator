#!/bin/sh
set -eu

# Named volumes and bind mounts may be created as root by Docker. Limit the
# ownership change to the two mutable application directories, then run the
# web server without root privileges.
mkdir -p /app/data /app/photos /app/runtime-config
chown -R mfcv:mfcv /app/data /app/photos /app/runtime-config

exec gosu mfcv dumb-init "$@"
