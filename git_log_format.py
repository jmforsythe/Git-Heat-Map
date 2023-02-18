import sys
import subprocess

def get_log_process(path, last_commit=None):
    SEPARATOR="%x1F"
    GIT_COMMIT_FLAG="%x1E"
    command = [
        "git",
        "-C",
        path,
        "log",
        f"--pretty=format:\"%n{GIT_COMMIT_FLAG}%H{SEPARATOR}%aN{SEPARATOR}%aE{SEPARATOR}%aI{SEPARATOR}%cN{SEPARATOR}%cE{SEPARATOR}%cI{SEPARATOR}%(trailers:key=Co-authored-by,valueonly=true,separator={SEPARATOR}){SEPARATOR}{SEPARATOR}%e\"",
        "--reverse",
        "--use-mailmap",
        "--numstat",
        "-z",
        "--compact-summary",
        "--stat-width=1024",
        "--stat-name-width=1024",
        "--stat-graph-width=1"
    ]
    if last_commit:
        command.insert(4, f"{last_commit}..HEAD")
    return subprocess.Popen(command, stdout=subprocess.PIPE)

def main():
    argc = len(sys.argv)
    if argc <= 1:
        print("No repo supplied")
        return

    last_commit = None if argc < 3 else sys.argv[2]
    log_process = get_log_process(sys.argv[1], last_commit)
    while line := log_process.stdout.readline():
        #print(line)
        continue

if __name__ == "__main__":
    main()
