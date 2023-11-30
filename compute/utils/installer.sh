#!/bin/bash
# curl -fsSL https://d3w.app/bin/installer/dmc.sh | bash

VERSION="0.0.1"
URL=https://d3w.app/bin
BIN=compute.tar.xz
ARCH=
OS=
arch=$(uname -m)
system_name=$(uname -s)

if [ "$arch" = "armv7l" ]; then
    echo "Not support armv7l"
    exit 1
elif [ "$arch" = "x86_64" ]; then
    ARCH=x64
elif [ "$arch" = "arm64" ]; then
    ARCH=arm64
else
    echo "Other arch: $arch"
    exit 1
fi

if [ "$system_name" = "Linux" ]; then
    OS=linux
elif [ "$system_name" = "Darwin" ]; then
    OS=macos
else
    echo "Other system: $system_name"
    exit 1
fi

echo "ARCH: $ARCH, OS: $OS, VERSION: $VERSION"
echo "$URL/$OS-$ARCH/$BIN"

curl -fsSL -o "/tmp/$BIN" "$URL/$OS-$ARCH/$BIN"
tar -xJf "/tmp/$BIN" -C /tmp
chmod +x /tmp/dmc
sudo mv /tmp/dmc /usr/local/bin/dmc
echo "Installed /usr/local/bin/dmc"
rm "/tmp/$BIN"

sleep 1

sudo mkdir -p /etc/dmc
curl -fsSL -o "/tmp/config.json" "$URL/$OS-$ARCH/compute.template_config.json"

sleep 1

if [ -e "/etc/dmc/config.json" ]; then
    echo "Already exists: /etc/dmc/config.json" # nothing to do
else
    sudo mv /tmp/config.json /etc/dmc/config.json
fi

sleep 1

echo "Setup /etc/dmc/config.json"
sleep 2
cat /etc/dmc/config.json

# Daemonize
if [ "$system_name" = "Linux" ]; then

sudo tee /etc/systemd/system/dmc.service << EOF

[Unit]
Description=dmc

[Service]
Type=simple
ExecStart=/usr/local/bin/dmc
Restart=always

[Install]
WantedBy=multi-user.target

EOF

    sudo systemctl daemon-reload
    sudo systemctl enable dmc
    # sudo systemctl start dmc
    # sudo systemctl status dmc
    echo "Installed /etc/systemd/system/dmc.service"
    echo "Run: sudo systemctl start dmc"
    echo "Run: sudo systemctl status dmc"
    

elif [ "$system_name" = "Darwin" ]; then
    OS=macos
else
    echo "Other system: $system_name"
    exit 1
fi

