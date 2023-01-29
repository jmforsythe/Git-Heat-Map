#!/bin/bash
strip_last=${1%/}
lastcommit=""
if [ -f "${strip_last##*/}_lastcommit.txt" ]; then
    lastcommit=`cat ${strip_last##*/}_lastcommit.txt`
fi
sh git-log-format.sh $1 $lastcommit | python -m cProfile git-database.py $1
