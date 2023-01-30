import sys
import pathlib

import git_database
import git_log_format

def generate_db(log_output):
    con, database_path = git_database.db_connection(sys.argv)
    cur = con.cursor()

    git_database.create_tables(cur)

    lines = []

    while line := git_database.get_next_line(log_output):
        if chr(line[0]).encode() == git_database.COMMIT_START_SYMBOL.encode():
            last_commit = git_database.handle_commit(cur, lines)
            lines = [line]
        else:
            lines.append(line)
    last_commit = git_database.handle_commit(cur, lines)

    git_database.create_indices(cur)

    con.commit()
    con.close()

    if last_commit != None:
        with open(f"{database_path[:-3]}_lastcommit.txt", "w") as lc:
            lc.write(last_commit)

def main():
    argc = len(sys.argv)
    if argc < 2:
        print("No repo supplied")
        return

    repo_name = pathlib.Path(sys.argv[1]).parts[-1]
    last_commit_file = pathlib.Path(f"{repo_name}_lastcommit.txt")
    if last_commit_file.is_file():
        last_commit = last_commit_file.open().read()
    else:
        last_commit = None

    log_process = git_log_format.get_log_process(sys.argv[1], last_commit)

    log_output = log_process.stdout

    generate_db(log_output)

if __name__ == "__main__":
    main()
