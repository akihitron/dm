
SESSION=dm

tmux kill-session -t $SESSION
tmux new -t $SESSION\; \
split-window -v \; \
select-pane -t 0\; \
split-window -h \; \
select-pane -t 2\; \
split-window -h \; \
select-pane -t 3\; \
split-window -h \; \
select-pane -t 4\; \
send-keys -t 0 "./f" C-m\; \
send-keys -t 1 "./b" C-m\; \
send-keys -t 2 "./c" C-m\; \
send-keys -t 3 "./g" C-m\; \


# firefox http://localhost:4050/ &
# firefox http://localhost:5555/ &

