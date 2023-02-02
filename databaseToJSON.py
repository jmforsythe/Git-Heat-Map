import fileTree
import sqlite3

def get_filtered_query(filter):
    base_query = """
        SELECT files.filePath, SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved)
        FROM files
        JOIN commitFile on files.fileID = commitFile.fileID JOIN_LINE
        WHERE WHERE_LINE
        GROUP BY files.filePath
    """
    params = []
    joins = set()
    wheres = set()
    wheres.add("files.filePath NOTNULL")
    if "emails_include" in filter:
        joins.add("JOIN commitAuthor on commitFile.hash = commitAuthor.hash")
        wheres.add("(" + " OR ".join(["0"] + [f"commitAuthor.authorEmail LIKE ?" for email in filter["emails_include"]]) + ")")
        params.extend(filter["emails_include"])
    
    if "emails_exclude" in filter:
        joins.add("JOIN commitAuthor on commitFile.hash = commitAuthor.hash")
        wheres.add("(" + " OR ".join(["0"] + [f"commitAuthor.authorEmail NOT LIKE ?" for email in filter["emails_exclude"]]) + ")")
        params.extend(filter["emails_exclude"])

    if "commits_include" in filter:
        wheres.add("(" + " OR ".join(["0"] + [f"commitFile.hash LIKE ?" for hash in filter["commits_include"]]) + ")")
        params.extend(filter["commits_include"])

    if "commits_exclude" in filter:
        wheres.add("(" + " OR ".join(["0"] + [f"commitFile.hash NOT LIKE ?" for hash in filter["commits_exclude"]]) + ")")
        params.extend(filter["commits_exclude"])

    if "datetime_include" in filter:
        joins.add("JOIN commits on commitFile.hash = commits.hash")
        wheres.add("(" + " OR ".join(["0"] + [f"commits.authorDate BETWEEN ? AND ?" for date_range in filter["datetime_include"]]) + ")")
        date_expand = [d for r in filter["datetime_include"] for d in r.split(" ")]
        params.extend(date_expand)

    if "datetime_exclude" in filter:
        joins.add("JOIN commits on commitFile.hash = commits.hash")
        wheres.add("(" + " OR ".join(["0"] + [f"commits.authorDate NOT BETWEEN ? AND ?" for date_range in filter["datetime_include"]]) + ")")
        date_expand = [d for r in filter["datetime_exclude"] for d in r.split(" ")]
        params.extend(date_expand)

    query = base_query.replace("JOIN_LINE", " ".join(joins)).replace("WHERE_LINE", " AND ".join(wheres))
    return query, tuple(params)

get_files_SQL = """
SELECT files.filePath, SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved)
FROM files
JOIN commitFile on files.fileID = commitFile.fileID
WHERE files.filePath NOTNULL
GROUP BY files.filePath
"""

def get_json_from_db(database_name, query=get_files_SQL, params=tuple()):
    con = sqlite3.connect(database_name)
    cur = con.cursor()

    file_dict = {}

    cur.execute(query, params)
    while line := cur.fetchone():
        file_dict[line[0]] = line[1]

    con.close()

    rootDir = fileTree.Directory("")
    for key in file_dict:
        cur_dir = rootDir
        path = key.split("/")
        for component in path[:-1]:
            if component not in cur_dir.children:
                cur_dir.add_child(fileTree.Directory(component))
            cur_dir = cur_dir.children[component]
        cur_dir.add_child(fileTree.File(path[-1], file_dict[key]))

    rootDir.update_val()
    return rootDir.get_json(0)

if __name__ == "__main__":
    import sys
    # Needed to stop encoding errors
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 1:
        print(get_json_from_db(sys.argv[1]))
