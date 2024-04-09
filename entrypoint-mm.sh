#!/bin/sh

default_dir="/opt/magic_mirror/modules/default"
config_dir="/opt/magic_mirror/config"
css_dir="/opt/magic_mirror/css"

echo "chown modules and config folder ..."
sudo chown -R node:node /opt/magic_mirror/modules &
sudo chown -R node:node ${config_dir}
sudo chown -R node:node ${css_dir}

export LD_PRELOAD=/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1
if [ ! -z "${FAKETIME}" ]; then
  export FAKETIME
fi

cd /opt/magic_mirror

npm run server .
