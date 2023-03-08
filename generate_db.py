import sys
import pathlib

import git_database
import git_log_format

def generate_db(log_output, database_path):
    con = git_database.db_connection(database_path)
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

    return last_commit

def main():
    argc = len(sys.argv)
    if argc < 2:
        print("No repo supplied")
        return

    repos_dir = pathlib.Path(__file__).parent / "repos"
    print(repos_dir)
    repos_dir.mkdir(exist_ok=True)

    source_path = pathlib.Path(sys.argv[1])

    repo_name = source_path.stem

    dest_dir = repos_dir / repo_name
    dest_dir.mkdir(exist_ok=True)
    database_path = (dest_dir / repo_name).with_suffix(".db")

    last_commit_file = dest_dir / "lastcommit.txt"
    if last_commit_file.is_file():
        with open(last_commit_file, "r") as f:
            last_commit = f.read()
    else:
        last_commit = None

    log_process = git_log_format.get_log_process(source_path, last_commit)

    log_output = log_process.stdout

    last_commit = generate_db(log_output, database_path)

    if last_commit != None:
        with open(last_commit_file, "w") as f:
            f.write(last_commit)


    print(f"Database generated at \"{database_path.absolute()}\"")

if __name__ == "__main__":
    main()
