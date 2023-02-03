# Git-Heat-Map

![Map showing the cpython repository, highlighting the files that Guido van Rossum changed the most](example_image.png)
*Map showing the cpython repository, highlighting the files that Guido van Rossum changed the most*

## Basic use guide

* Generate database with `python generate_db.py {path_to_repo_dir}`
* Run web server with `python flask_app.py` (flask must be installed, can be installed from pip)
* Connect on `127.0.0.1:5000`
* Available repos will be displayed, select the one you want to view
* Add emails, commits, filenames, and date ranges you want to highlight by using the form on the right, with `%` acting as a wildcard
* Clicking on any of these entries will cause the query to exclude results matching that entry
* Choose the hue that you want the chart to use for highlighting
* Press submit query
* Click on directories to zoom in, and the back button in the sidebar to zoom out

Note that for performance reasons, very small boxes are not drawn. This is set by the `MIN_AREA` global variable in the `display_filetree` function in [treemap.js](static/javascript/treemap.js).

## Project Structure

This project consists of two parts:

1. Git log -> database
2. Database -> treemap

### Git log -> database

Scans through an entire git history using `git log`, and creates a database using three tables:
* *Files*, which just keeps track of filenames
* *Commits*, which stores commit hash, author, committer
* *CommitFile*, which stores an instance of a certain file being changed by a certain commit, and tracks how many lines were added/removed by that commit
* *Author*, which stores an author name and email
* *CommitAuthor*, which links commits and Author in order to support coauthors on commits

Using these we can keep track of which files/commits changed the repository the most, which in itself can provide useful insight

### Database -> treemap

Taking the database above, uses an SQL query to generate a JSON object with the following structure: 
```
directory:
  "name": <Directory name>
  "val": <Sum of sizes of children>
  "children": [<directory or file>, ...]

file:
  "name": <File name>
  "val": <Total number of line changes for this file over all commits>
```
then uses this to generate an inline svg image representing a [treemap](https://en.wikipedia.org/wiki/Treemapping "Wikipedia: Treemapping") of the file system, with the size of each rectangle being the `val` described above.

Then generates a second JSON object in a similar manner to above, but filtering for the things we want (only certain emails, date ranges, etc), then uses this to highlight the rectangles in varying intensity based on the `val`s returned eg highlighting the files changed most by a certain author.

## Performance
These speeds were attained on my personal computer.
### Database generation

| Repo | Number of commits | Git log time | Git log size | Database time | Database size | **Total time** |
| --- | --- | --- | --- | --- | --- | --- |
| [linux](https://github.com/torvalds/linux) | 1,154,884 | 60 minutes | 444MB | 462.618 seconds | 733MB | **68 minutes** |
| [cpython](https://github.com/python/cpython) | 115,874 | 4.6 minutes | 44.6MB | 36.607 seconds | 74.3MB | **5.2 minutes** |

Time taken seems to scale linearly, going through approximately 300 commits/second, or requiring 0.0033 seconds/commit.
Database size also scales linearly, with approximately 2600 commits/MB, or requiring 384 B/commit.

### Querying database and displaying treemap

For this test I filtered each repo by its most prominent authors:

| Repo | Author filter | Time taken |
| --- | --- | --- |
| linux | torvalds@linux-foundation.org | 45.4 seconds |
| cpython | guido@python.org | 1.9 seconds |

Currently `treemap.js` uses a global variable `MIN_AREA` to not render smallest files for better performance.

While these performances are not as fast as desired, a more typically sized repo should perform fine.

## Wanted features

### Submodule tracking
Currently the only submodule changes that can be seen are the top level commit pointer changes. In the future would like to recursively explore submodules and add their files to the database.

### Faster database generation
Currently done using git log which can take a very long time for large repos. Will look into any other ways of getting needed information on files.

### Asynchronous javascript
Currently no async functions are used. I believe the performance of the webpage could be improved if things such as file loading and svg drawing was done asynchronously.

### Remembering filters
Filters must be re-entered every time the page is loaded. Ideally filters would be remembered either through cookies or by storing the filters as a url query, which would allow users to bookmark queries.

### Selectable colours per author
Currently red is hardcoded for all results. In order to show multiple authors we want to highlight in different colours, will need to decide how to colour files edited by both authors.
