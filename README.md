# Git-Heat-Map

This project consists of two parts:

1. Git log -> database
2. Database -> treemap

## Git log -> database

Scans through an entire git history using `git log`, and creates a database using three tables:
* *Files*, which just keeps track of filenames
* *Commits*, which stores commit hash, author, committer
* *CommitFile*, which stores an instance of a certain file being changed by a certain commit, and tracks how many lines were added/removed by that commit

Using these we can keep track of which files/commits changed the repository the most, which in itself can provide useful insight

### Planned features

#### File rename tracking
Unfortunately this is very difficult to do currently, due to the way renames can show up multiple times in the same git history. For the moment renames are disabled, so any renaming or moving of a file will make it lose its history in the database.
#### File deleting
Currently the command line arguments passed to `git log` do not clearly show when file are deleted, so the only way to determine that at the moment is to keep track of total number of lines and then delete the entry when this equals zero. There is another argument to `git log` which seems promising, so this shall be investigated further.
#### Submodule tracking
Currently the only submodule changes that can be seen are the top level commit pointer changes. In the future would like to recursively explore submodules and add their files to the database.

## Database -> treemap

Taking the database above, shall calculate a [treemap](https://en.wikipedia.org/wiki/Treemapping "Wikipedia: Treemapping") of the file system, with the size of each directory being the sum of the sizes of the files contained within, and the size of each file being either the size on disk, or the number of changed lines of code across all commits in the database.

### Planned features

#### Basic webpage displaying a treemap of all files in the repo
#### Filtering by author(s) to see which areas of a codebase people touch most
