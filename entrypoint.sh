#!/bin/sh
cat <<EOF > /app/env.js
window.__ENV__ = {
  FE_AUTH_AUTHORITY: "${FE_AUTH_AUTHORITY}",
  FE_AUTH_CLIENT_ID: "${FE_AUTH_CLIENT_ID}",
  FE_CLIENT_URL: "${FE_CLIENT_URL}",
  FE_BACKEND_URL: "${FE_BACKEND_URL}",
};
EOF
exec "$@"
