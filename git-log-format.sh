#!/bin/bash

sep="%x1F"
git_commit_flag="%x1E"

# Optional command line argument specifies oldest commit to go to
if [ -z "$2" ]
    then
        range=""
    else
        range=$2..HEAD
fi

# echo $range

git -C $1/ log $range --pretty=format:"$git_commit_flag%H$sep%aN$sep%aE$sep%cN$sep%cE" \
--numstat --reverse --use-mailmap --no-renames
