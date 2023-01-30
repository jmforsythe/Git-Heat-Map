import fileTree
import sqlite3

example_filter = {
    "emails": []
}

def get_filtered_query(filter=example_filter):
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

    if "emails" in filter:
        joins.add("JOIN commitAuthor on commitFile.hash = commitAuthor.hash")
        wheres.add("(" + " OR ".join(["0"] + [f"commitAuthor.authorEmail LIKE ?" for email in filter["emails"]]) + ")")
        params.extend(filter["emails"])

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
