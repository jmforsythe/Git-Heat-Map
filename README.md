# Git-Heat-Map

![Map showing the cpython repositiory, highlighting the files that Guido van Rossum changed the most](example_image.png)
*Map showing the cpython repositiory, highlighting the files that Guido van Rossum changed the most (excluding the configure file in the root directory)*

## Basic use guide

* Generate database with `./generate-db.sh {path_to_repo_dir}`
* Run web server with `python flask_app.py` (flask must be installed, can be install from pip)
* Connect on `127.0.0.1:5000/{name_of_repo}`
* Select email to search for in the form at the bottom and click submit

This project consists of two parts:

1. Git log -> database
2. Database -> treemap

## Git log -> database

Scans through an entire git history using `git log`, and creates a database using three tables:
* *Files*, which just keeps track of filenames
* *Commits*, which stores commit hash, author, committer
* *CommitFile*, which stores an instance of a certain file being changed by a certain commit, and tracks how many lines were added/removed by that commit
* *Author*, which stores an author name and email
* *CommitAuthor*, which links commits and Author in order to support coauthors on commits

Using these we can keep track of which files/commits changed the repository the most, which in itself can provide useful insight

### Planned features

#### Submodule tracking
Currently the only submodule changes that can be seen are the top level commit pointer changes. In the future would like to recursively explore submodules and add their files to the database.

## Database -> treemap

Taking the database above, shall calculate a [treemap](https://en.wikipedia.org/wiki/Treemapping "Wikipedia: Treemapping") of the file system, with the size of each directory being the sum of the sizes of the files contained within, and the size of each file being either the size on disk, or the number of changed lines of code across all commits in the database.
