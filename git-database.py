import sys
import sqlite3
import re

# Start of commit
COMMIT_START_SYMBOL = chr(30)
# Unit separator
COMMIT_SPLIT_SYMBOL = chr(31)

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

def parse_rename(file_path):
    if x := rename_regex_brace:
        old_name = x.group(1)+x.group(2)+x.group(4)
        new_name = x.group(1)+x.group(3)+x.group(4)
    elif x := rename_regex_no_brace:
        old_name = x.group(1)
        new_name = x.group(2)
    else:
        old_name = file_path
        new_name = file_path
    return old_name, new_name

def db_connection(argv):
    database_path = "test"

    argc = len(argv)
    if argc > 1:
        reponame = argv[1]
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
        database_path = argv[2]
    database_path += ".db"

    con = sqlite3.connect(database_path)

    return con, database_path

def create_tables(cur):
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

def handle_commit(cur, commit_lines):
    if len(commit_lines) == 0:
        return
    fields = commit_lines[0][1:].split(COMMIT_SPLIT_SYMBOL)
    cur.execute(insert_commit_sql, fields)
    for line in commit_lines[1:]:
        handle_commit_line(cur, line, fields)
    return fields[0]

def handle_commit_line(cur, line, fields):
    added, removed, file_path = line.split("\t")

    # Ignore binary files
    if added == "-" or removed == "-":
        return
    
    # Insert into file table
    cur.execute(insert_file_sql, (file_path,))

    # Insert into commitFile table
    cur.execute("SELECT files.fileID FROM files WHERE files.filePath=?", (file_path,))
    x = cur.fetchall()
    fileID = x[0][0]
    cur.execute(insert_commitFile_sql, (fields[0], fileID, int(added), int(removed)))

def main():
    con, database_path = db_connection(sys.argv)
    cur = con.cursor()

    create_tables(cur)

    lines = []

    # Needed to stop encoding errors
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')

    for l in sys.stdin:
        line = l.rstrip()
        if len(line) == 0:
            continue
        if line[0] == COMMIT_START_SYMBOL:
            last_commit = handle_commit(cur, lines)
            lines = [line]
        else:
            lines.append(line)
    last_commit = handle_commit(cur, lines)

    con.commit()
    con.close()

    if last_commit != None:
        with open(f"{database_path[:-3]}_lastcommit.txt", "w") as lc:
            lc.write(last_commit)

if __name__ == "__main__":
    main()
