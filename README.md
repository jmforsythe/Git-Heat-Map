# Git-Heat-Map

![Map showing the files in cpython that Guido van Rossum changed the most](example_image.png)
*Map showing the files in cpython that Guido van Rossum changed the most;
full SVG image available in repo*

## Now with file extension based highlighting
## Now with submodule support
## Website now available

A version of this program is now available for use at [heatmap.jonathanforsythe.co.uk](https://heatmap.jonathanforsythe.co.uk)

## Basic use guide

* Generate database with `python generate_db.py {path_to_repo_dir}`
* Install `flask` from pip
* Run web server with `python app.py` or `flask run` (`flask run --host=<ip>` to run on that ip address, with `0.0.0.0` being used for all addresses on that machine)
* Connect on `127.0.0.1:5000`
* Available repos will be displayed, select the one you want to view
* Add emails, commits, filenames, and date ranges you want to highlight
  * The "browse" buttons allow the user to see a list of valid values
  * Alternatively valid [sqlite](https://www.sqlite.org/lang_expr.html#:~:text=The%20LIKE%20operator%20does%20a,more%20characters%20in%20the%20string.) patterns can be passed in
* Clicking on any of these entries will cause the query to exclude results matching that entry
* By default highlight hue is determined by file extensions but this can be manually overridden
* Options affecting performance are levels of text to render, and minimum size of boxes rendered
* Press submit query to update which files are highlighted
* Press refresh to update highlighting hue and redraw based on window size
* Click on directories to zoom in, and the back button in the sidebar to zoom out

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

| Repo | Author filter | Drawing treemap time | Highlighting treemap time |
| --- | --- | --- | --- |
| linux | torvalds@linux-foundation.org | 19.7 s | 54.3 s |
| cpython | guido@python.org | 842 ms | 1238 ms |

These times are with `minimum size drawn = 0`, on very large repositories, so the performance is not completely unreasonable. This does not include the time for the browser to actually render the svg, which can take longer.

## Wanted features

### Faster database generation
Currently done using git log which can take a very long time for large repos. Will look into any other ways of getting needed information on files.

### Multiple filters per query
Currently the user can submit only a single query for the highlighting. Ideally they could have a separate filter dictating which boxes to draw in the first place, and possibly multiple filters that could result in multiple colour highlighting on the same image.
