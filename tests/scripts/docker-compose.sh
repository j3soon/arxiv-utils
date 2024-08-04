#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [[ "$1" == "up" ]]; then
    docker compose -f $DIR/../end-to-end-test/compose.yml up --build "${@:2}"
elif [[ "$1" == "pull" ]]; then
    docker compose -f $DIR/../end-to-end-test/compose.yml pull
elif [[ "$1" == "down" ]]; then
    docker compose -f $DIR/../end-to-end-test/compose.yml down
elif [[ "$1" == "shutdown" ]]; then
    docker compose -f $DIR/../end-to-end-test/compose.yml down -v --remove-orphans
fi
