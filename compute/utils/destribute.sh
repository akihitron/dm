#!/bin/bash

# This setting for distribution in personal.

export XZ_OPT=-9

arch=$(uname -m)

if [ "$arch" = "armv7l" ]; then
    echo "Not support armv7l"
elif [ "$arch" = "x86_64" ]; then

    npm run build
    cp -f bin/compute-linux ~/datas/bin/linux-x64/compute
    cp -f bin/compute-macos ~/datas/bin/macos-x64/compute
    cp -f src/template.config.json ~/datas/bin/linux-x64/compute.template_config.json
    cp -f src/template.config.json ~/datas/bin/macos-x64/compute.template_config.json
    tar -cJf ~/datas/bin/linux-x64/compute.tar.xz -C ~/datas/bin/linux-x64 compute
    tar -cJf ~/datas/bin/macos-x64/compute.tar.xz -C ~/datas/bin/macos-x64 compute

elif [ "$arch" = "arm64" ]; then

    npm run build_arm

    system_name=$(uname -s)

    if [ "$system_name" = "Linux" ]; then

        cp -f src/template.config.json ~/datas/bin/linux-arm64/compute.template_config.json
        cp -f bin/compute ~/datas/bin/linux-arm64/compute
        tar -cJf ~/datas/bin/linux-arm64/compute.tar.xz -C ~/datas/bin/linux-arm64 compute

    elif [ "$system_name" = "Darwin" ]; then

        cp -f src/template.config.json ~/datas/bin/macos-arm64/compute.template_config.json
        cp -f bin/compute ~/datas/bin/macos-arm64/compute
        tar -cJf ~/datas/bin/macos-arm64/compute.tar.xz -C ~/datas/bin/macos-arm64 compute

    else
        echo "Other system: $system_name"
    fi

else
    echo "Other arch: $arch"
fi




host_name=$(hostname)

if [ "$host_name" = "min" ]; then
    # MIN Server
    TARGET=win
    ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
    scp bin/compute-linux $TARGET:~/bin/compute

    TARGET=st
    ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
    scp bin/compute-linux $TARGET:~/bin/compute

elif [ "$host_name" = "jetson" ]; then
    # Jetson
    TARGET=jetson
    ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
    scp bin/compute $TARGET:~/bin/compute

fi
