import sys
import sqlite3
import re

# Start of commit
COMMIT_START_SYMBOL = chr(30)
# Unit separator
COMMIT_SPLIT_SYMBOL = chr(31)

repo_path = "test-repo"
database_path = "test"

argc = len(sys.argv)
if argc > 1:
    reponame = sys.argv[1]
    path_unix = reponame.split("/")
    path_win = reponame.split("\\")
    if len(path_unix) >= len(path_win):
        path = path_unix
    else:
        path = path_unix
    while path[-1] == "":
        path = path[:-1]
    database_path = path[-1]
if argc > 2:
    database_path = sys.argv[2]
database_path += ".db"

con = sqlite3.connect(database_path)
cur = con.cursor()

cur.execute("""
    CREATE TABLE if not exists commits(
        hash character(40) NOT NULL PRIMARY KEY,
        authorName varchar(255) NOT NULL,
        authorEmail varchar(255) NOT NULL,
        committerName varchar(255) NOT NULL,
        committerEmail varchar(255) NOT NULL
    )
""")

cur.execute("""
    CREATE TABLE if not exists files(
        fileID integer NOT NULL PRIMARY KEY,
        filePath varchar(255) NOT NULL UNIQUE
    )
""")

cur.execute("""
    CREATE TABLE if not exists commitFile(
        hash character(40),
        fileID varchar(255),
        linesAdded integer,
        linesRemoved integer,
        FOREIGN KEY (hash) REFERENCES commits (hash),
        FOREIGN KEY (fileID) REFERENCES files (fileID),
        PRIMARY KEY (hash, fileID)
    )
""")
insert_commit_sql = """
    INSERT OR IGNORE INTO
    commits(hash, authorName, authorEmail, committerName, committerEmail)
    VALUES(?, ?, ?, ?, ?)
    """

insert_file_sql = """
    INSERT OR IGNORE INTO
    files(filePath)
    VALUES(?)
    """

insert_commitFile_sql = """
    INSERT OR IGNORE INTO
    commitFile(hash, fileID, linesAdded, linesRemoved)
    VALUES(?, ?, ?, ?)
    """

update_file_sql = """
    UPDATE files
    SET filePath = ?
    WHERE filePath = ?
"""

rename_regex_brace = re.compile(r"(.*){(.*) => (.*)}(.*)")
rename_regex_no_brace = re.compile(r"(.*) => (.*)")

fields = []

# Needed to stop encoding errors
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

for l in sys.stdin:
    line = l.rstrip()
    if line == "":
        continue
    elif line[0] == COMMIT_START_SYMBOL:
        fields = line[1:].split(COMMIT_SPLIT_SYMBOL)
        last_commit = fields[0]
        cur.execute(insert_commit_sql, fields)
    else:
        added, removed, file_path = line.split("\t")
        
        # Ignore binary files
        if added == "-" or removed == "-":
            continue
        
        # Insert into file table
        cur.execute(insert_file_sql, (file_path,))

        # Insert into commitFile table
        cur.execute("SELECT files.fileID FROM files WHERE files.filePath=?", (file_path,))
        x = cur.fetchall()
        fileID = x[0][0]
        cur.execute(insert_commitFile_sql, (fields[0], fileID, int(added), int(removed)))

con.commit()
con.close()

if len(fields) > 0:
    with open(f"{database_path[:-3]}_lastcommit.txt", "w") as lc:
        lc.write(fields[0])
