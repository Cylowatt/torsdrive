#!/usr/bin/env bash

set NODE_ENV=production

if which node >/dev/null; then
    echo 'Node OK'
else
    alias node="nodejs"
fi

npm run build-css && npm run start
