#!/bin/bash
# curl -fsSL https://d3w.app/ins/dmc | bash
set -e

VERSION="0.0.1" # TODO: version management
URL=https://d3w.app/bin
BIN=compute.tar.xz
APP=dmc
ARCH=
OS=
arch=$(uname -m)
system_name=$(uname -s)




##########################################################################################
# Check Arch
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

##########################################################################################
# Check OS
if [ "$system_name" = "Linux" ]; then
    OS=linux
elif [ "$system_name" = "Darwin" ]; then
    OS=macos

    echo "MacOS auto installer is not supported."
    echo "There are no plans to provide notalization, so please build the source yourself."
    exit 1

else
    echo "Other system: $system_name"
    exit 1
fi

echo "ARCH: $ARCH, OS: $OS, VERSION: $VERSION"
echo "$URL/$OS-$ARCH/$BIN"

##########################################################################################
# Install DMC
curl -fsSL -o "/tmp/$BIN" "$URL/$OS-$ARCH/$BIN"
tar -xJf "/tmp/$BIN" -C /tmp
chmod +x /tmp/compute
sudo mv /tmp/compute /usr/local/bin/$APP
echo "Installed /usr/local/bin/$APP"
rm "/tmp/$BIN"

sleep 1

##########################################################################################
# Setup config.json
curl -fsSL -o "/tmp/config.json" "$URL/$OS-$ARCH/compute.template_config.json"

sleep 1

if [ -e "/etc/$APP/config.json" ]; then
    echo "Already exists: /etc/$APP/config.json" # nothing to do
else
    sudo mkdir -p /etc/$APP
    sudo mv /tmp/config.json /etc/$APP/config.json
fi

if id "$APP" &>/dev/null; then
    echo "Already exists $APP"
else
    sudo groupadd $APP
    sudo useradd -r -g $APP $APP
    sudo usermod -aG $APP $USER
fi



sleep 1

echo "Setup /etc/$APP/config.json"
sleep 2
cat /etc/$APP/config.json
sudo chown -R $APP:$APP /etc/$APP
sudo chmod -R g+w /etc/$APP



sudo tee /etc/systemd/system/$APP.service << EOF

[Unit]
Description=$APP

[Service]
Type=simple
ExecStart=/usr/local/bin/$APP
Restart=always

[Install]
WantedBy=multi-user.target

EOF

echo "Installed /etc/systemd/system/$APP.service"
echo "sudo systemctl enable $APP"
echo "# Run: sudo systemctl start $APP"
echo "# Run: sudo systemctl status $APP"

exit 0