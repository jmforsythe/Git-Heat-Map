#!/bin/bash
lastcommit=""
if [ -f "${1##*/}_lastcommit.txt" ]; then
    lastcommit=`cat ${1##*/}_lastcommit.txt`
fi
./git-log-format.sh $1 $lastcommit | python git-database.py $1
