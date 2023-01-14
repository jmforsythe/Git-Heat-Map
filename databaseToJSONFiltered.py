import databaseToJSON

example_filter = {
    "emails": ["%"]
}

# This is not sanitised at all, need to replace with adding sql parameters
def get_filtered_query(filter=example_filter):
    query = """
        SELECT files.filePath, SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved)
        FROM files
        JOIN commitFile on files.fileID = commitFile.fileID JOIN_LINE
        WHERE files.filePath NOTNULL WHERE_LINE
        GROUP BY files.filePath
    """
    if "emails" in filter and filter["emails"]:
        query = query.replace("JOIN_LINE", "JOIN commitAuthor on commitFile.hash = commitAuthor.hash")
        query = query.replace("WHERE_LINE", "AND ("+" OR ".join([f"commitAuthor.authorEmail LIKE \"{email}\"" for email in filter["emails"]]) + ")")
    else:
        query = query.replace("JOIN_LINE", "")
        query = query.replace("WHERE_LINE", "")
    return query

if __name__ == "__main__":
    import sys
    # Needed to stop encoding errors
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 1:
        print(databaseToJSON.get_json_from_db(sys.argv[1], get_filtered_query()))
