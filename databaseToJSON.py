import fileTree
import sqlite3

getFilesSql = """
SELECT files.filePath, SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved)
FROM files
JOIN commitFile on files.fileID = commitFile.fileID
WHERE files.filePath NOTNULL
GROUP BY files.filePath
"""

def getJSONfromDB(database_name, query=getFilesSql):
    con = sqlite3.connect(database_name)
    cur = con.cursor()

    file_dict = {}

    cur.execute(getFilesSql)
    while line := cur.fetchone():
        file_dict[line[0]] = line[1]

    con.close()

    rootDir = fileTree.Directory("/")
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
        print(getJSONfromDB(sys.argv[1]))
