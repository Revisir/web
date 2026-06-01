#!/bin/sh
cat <<EOF > /app/env.js
window.__ENV__ = {
  AUTH_AUTHORITY: "${AUTH_AUTHORITY}",
  AUTH_CLIENT_ID: "${AUTH_CLIENT_ID}",
  CLIENT_URL: "${CLIENT_URL}",
  BACKEND_URL: "${BACKEND_URL}",
};
EOF
exec "$@"
