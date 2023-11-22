#!/bin/bash

# TARGET=win
# scp bin/compute-linux $TARGET:~/bin/compute
# TARGET=min scp bin/compute-linux $TARGET:~/bin/compute
# TARGET=nic
# scp bin/compute-linux $TARGET:~/bin/compute
# TARGET=st
# scp bin/compute-linux $TARGET:~/bin/compute
# ssh $TARGET "cd ~/bin; ./compute"



SESSION=dstdm

cp -f bin/compute-linux ~/datas/bin/linux/compute
cp -f bin/compute-macos ~/datas/bin/macos/compute
cp -f src/template.config.json ~/datas/bin/linux/compute.template_config.json
cp -f src/template.config.json ~/datas/bin/macos/compute.template_config.json

# npm run build
TARGET=win
ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
scp bin/compute-linux $TARGET:~/bin/compute
TARGET=st
ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
scp bin/compute-linux $TARGET:~/bin/compute
TARGET=nic
ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
scp bin/compute-linux $TARGET:~/bin/compute


# TARGET=jetson
# ssh $TARGET "mkdir -p ~/bin;rm ~/bin/compute"
# scp bin/compute-linux-arm64 $TARGET:~/bin/compute

# echo "kill"

# tmux kill-session -t $SESSION

# echo "new session"

# tmux new -t $SESSION\; \
# split-window -v \; \
# select-pane -t 0\; \
# split-window -v \; \
# select-pane -t 1\; \
# split-window -v \; \
# select-pane -t 2\; \
# send-keys -t 0 "ssh win 'killall compute ; ~/bin/compute'" C-m\; \
# send-keys -t 1 "ssh st 'killall compute ; ~/bin/compute'" C-m\; \
# send-keys -t 2 "./c" C-m\; \

echo "done"

# # firefox http://localhost:4050/ &
# # firefox http://localhost:5555/ &

