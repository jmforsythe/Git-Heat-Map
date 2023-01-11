import sys
import sqlite3
import re

# Start of commit
COMMIT_START_SYMBOL = chr(30)
# Unit separator
COMMIT_SPLIT_SYMBOL = chr(31)

select_file_sql = """
    (
        SELECT files.fileID
        FROM files
        WHERE files.filePath = ?
    )
"""

insert_commit_sql = """
    INSERT INTO
    commits(hash, authorDate, committerName, committerEmail, committerDate)
    VALUES(?, ?, ?, ?, ?)
"""

insert_file_sql = """
    INSERT OR IGNORE INTO
    files(filePath)
    VALUES(?)
"""

insert_commitFile_sql = f"""
    INSERT INTO
    commitFile(hash, fileID, linesAdded, linesRemoved)
    VALUES(?, {select_file_sql}, ?, ?)
"""

insert_author_sql = """
    INSERT OR IGNORE INTO
    author(authorEmail, authorName)
    VALUES(?, ?)
"""

insert_commitAuthor_sql = f"""
    INSERT INTO
    commitAuthor(hash, authorEmail)
    VALUES(?, ?)
"""

update_file_sql = """
    UPDATE OR IGNORE files
    SET filePath = ?
    WHERE filePath = ?
"""

delete_commitFile_sql = f"""
    DELETE FROM commitFile
    WHERE commitFile.fileID = {select_file_sql}
"""

delete_file_sql = """
    DELETE FROM files
    WHERE files.filePath = ?
"""

nullify_file_sql = """
    UPDATE FILES
    SET filePath = NULL
    WHERE filePath = ?
"""

regex_numstat_z = re.compile(r"([\-\d]+)\t([\-\d]+)\t(?:\0([^\0]+)\0([^\0]+)|([^\0]+))\0")

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
            authorDate text NOT NULL,
            committerName text NOT NULL,
            committerEmail text NOT NULL,
            committerDate text NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE if not exists files(
            fileID integer NOT NULL PRIMARY KEY,
            filePath text UNIQUE
        )
    """)

    cur.execute("""
        CREATE TABLE if not exists commitFile(
            hash character(40),
            fileID text,
            linesAdded integer,
            linesRemoved integer,
            FOREIGN KEY (hash) REFERENCES commits (hash),
            FOREIGN KEY (fileID) REFERENCES files (fileID),
            PRIMARY KEY (hash, fileID)
        )
    """)

    cur.execute("""
        CREATE TABLE if not exists author(
            authorEmail text NOT NULL PRIMARY KEY,
            authorName text NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE if not exists commitAuthor(
            hash character(40),
            authorEmail text,
            FOREIGN KEY (hash) REFERENCES commits (hash),
            FOREIGN KEY (authorEmail) REFERENCES author (authorEmail),
            PRIMARY KEY (hash, authorEmail)
        )
    """)

def commit_create(cur, fields):
    cur.execute(insert_commit_sql,
                tuple(fields[i] for i in
                ("hash", "authorDate",
                 "committerName", "committerEmail", "committerDate")
                ))

def author_create(cur, fields):
    cur.execute(insert_author_sql,
                tuple(fields[i] for i in
                ("authorEmail", "authorName")
                ))

def commitAuthor_create(cur, fields):
    cur.execute(insert_commitAuthor_sql,
                tuple(fields[i] for i in
                ("hash", "authorEmail")
                ))

def handle_commit(cur, commit_lines):
    if len(commit_lines) <= 1:
        return
    keys = ("hash", "authorName", "authorEmail", "authorDate", "committerName", "committerEmail", "committerDate")
    fields = {keys[i] : commit_lines[0][1:].split(COMMIT_SPLIT_SYMBOL)[i]
              for i in range(len(keys))}
    commit_create(cur, fields)
    author_create(cur, fields)
    commitAuthor_create(cur, fields)

    numstat_line = commit_lines[1]
    matches = regex_numstat_z.findall(numstat_line)
    # First commit in --compact-summary is on the end of previous line
    first_secondary_line = numstat_line.split("\0")[-1]
    commit_lines.insert(2, first_secondary_line)
    for i in range(len(matches)):
        try:
            handle_match(cur, matches[i], commit_lines[2+i], fields)
        except:
            print(matches[i], commit_lines[2+i])
            raise
    return fields["hash"]

def file_create(cur, file_path):
    cur.execute(insert_file_sql, (file_path,))

def file_rename(cur, old_name, new_name):
    cur.execute(update_file_sql, (new_name, old_name))

def file_delete(cur, file_path):
    cur.execute(nullify_file_sql, (file_path,))

def commitFile_create(cur, fields, file_path, added, removed):
    cur.execute(insert_commitFile_sql, (fields["hash"], file_path, added, removed))

def handle_match(cur, match, secondary_line, fields):
    _ = secondary_line.split("|")
    second_path = _[0].strip()

    if match[4]:
        file_path = match[4]
    elif match[2] and match[3]:
        file_rename(cur, match[2], match[3])
        file_path = match[3]

    if re.match(r"(.*)\(new.{0,3}\)$", second_path):
        file_create(cur, file_path)

    if "-" in match[:1]:
        added = 1
        removed = 0
    else:
        added = int(match[0])
        removed = int(match[1])
        second_total = int(_[1].split()[0])
        assert(added+removed == second_total)

    commitFile_create(cur, fields, file_path, added, removed)

    if re.match(r"(.*)\(gone\)$", second_path):
        file_delete(cur, file_path)

def get_line_stdin():
    return sys.stdin.readline()

def main():
    con, database_path = db_connection(sys.argv)
    cur = con.cursor()

    create_tables(cur)

    lines = []

    # Needed to stop encoding errors
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')

    while l := get_line_stdin():
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
