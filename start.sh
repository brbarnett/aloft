#!/bin/sh
set -e

SERVER_PORT="${SERVER_PORT:-${PORT:-8080}}"

export SERVER_PORT
envsubst '${SERVER_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

nginx

exec node /app/api/dist/index.js
