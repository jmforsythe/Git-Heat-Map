import sqlite3

from . import file_tree

def get_filtered_query(filter):
    base_query = """
        SELECT files.filePath, SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved)
        FROM (
            SELECT DISTINCT commitAuthor.hash
            FROM commitAuthor
            WHERE WHERE_INNER_LINE
        ) commitsFiltered
        JOIN commitFile ON commitsFiltered.hash = commitFile.hash
        JOIN files ON commitFile.fileID = files.fileID JOIN_LINE
        WHERE WHERE_LINE
        GROUP BY files.filePath
    """

    params = []
    joins = set()
    wheres = ["files.filePath NOTNULL"]
    wheres_inner = []

    valid_field = lambda key: key in filter and isinstance(filter[key], tuple) and len(filter[key]) > 0

    if valid_field("email_include"):
        wheres_inner.append("(" + " OR ".join([f"commitAuthor.authorEmail LIKE ?" for email in filter["email_include"]]) + ")")
        params.extend(filter["email_include"])

    if valid_field("email_exclude"):
        wheres_inner.append("(" + " AND ".join([f"commitAuthor.authorEmail NOT LIKE ?" for email in filter["email_exclude"]]) + ")")
        params.extend(filter["email_exclude"])

    if valid_field("commit_include"):
        wheres.append("(" + " OR ".join([f"commitFile.hash LIKE ?" for hash in filter["commit_include"]]) + ")")
        params.extend(filter["commit_include"])

    if valid_field("commit_exclude"):
        wheres.append("(" + " AND ".join([f"commitFile.hash NOT LIKE ?" for hash in filter["commit_exclude"]]) + ")")
        params.extend(filter["commit_exclude"])

    if valid_field("filename_include"):
        wheres.append("(" + " OR ".join([f"files.filePath LIKE ?" for filename in filter["filename_include"]]) + ")")
        params.extend(filter["filename_include"])

    if valid_field("filename_exclude"):
        wheres.append("(" + " AND ".join([f"files.filePath NOT LIKE ?" for filename in filter["filename_exclude"]]) + ")")
        params.extend(filter["filename_exclude"])

    if valid_field("datetime_include"):
        joins.add("JOIN commits on commitFile.hash = commits.hash")
        wheres.append("(" + " OR ".join([f"commits.authorDate BETWEEN ? AND ?" for date_range in filter["datetime_include"]]) + ")")
        date_expand = [d for r in filter["datetime_include"] for d in r.split(" ")]
        params.extend(date_expand)

    if valid_field("datetime_exclude"):
        joins.add("JOIN commits on commitFile.hash = commits.hash")
        wheres.append("(" + " AND ".join([f"commits.authorDate NOT BETWEEN ? AND ?" for date_range in filter["datetime_exclude"]]) + ")")
        date_expand = [d for r in filter["datetime_exclude"] for d in r.split(" ")]
        params.extend(date_expand)

    if len(wheres_inner) == 0:
        wheres_inner = ["1"]
    query = base_query.replace("JOIN_LINE", " ".join(joins)).replace("WHERE_LINE", " AND ".join(wheres)).replace("WHERE_INNER_LINE", " AND ".join(wheres_inner))
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

    rootDir = file_tree.Directory("")
    for key in file_dict:
        cur_dir = rootDir
        path = key.split("/")
        for component in path[:-1]:
            if component not in cur_dir.children:
                cur_dir.add_child(file_tree.Directory(component))
            cur_dir = cur_dir.children[component]
        cur_dir.add_child(file_tree.File(path[-1], file_dict[key]))

    rootDir.update_val()
    return rootDir.get_json(0)

if __name__ == "__main__":
    import sys
    # Needed to stop encoding errors
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 1:
        print(get_json_from_db(sys.argv[1]))
