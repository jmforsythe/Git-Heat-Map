import pathlib
import functools
import sqlite3
import functools

from server import database_to_JSON

from flask import Flask, render_template, request, abort, make_response

app = Flask(__name__)
app.static_folder = "static"

project_dir = pathlib.Path(__file__).parent
repos_dir = project_dir / "repos"
query_dir = project_dir / "sql"

def top_level_db_list():
    return (d.stem for d in repos_dir.iterdir() if d.is_dir())

def db_path_list():
    return (db.parent for db in repos_dir.rglob("*.db"))

def query_list():
    return (d.stem for d in query_dir.iterdir())

def valid_db_check(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        name = kwargs["name"]
        poss_path = repos_dir / pathlib.Path(name)
        if poss_path in db_path_list():
            return func(*args, **kwargs)
        abort(404)
    return wrapper

def valid_query_check(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        query = kwargs["query"]
        if query in query_list():
            return func(*args, **kwargs)
        abort(404)
    return wrapper

def cache_on_db_change(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        name = kwargs["name"]
        this_repo_dir = repos_dir / pathlib.Path(name)
        db_path = (this_repo_dir / this_repo_dir.stem).with_suffix(".db")
        server_time = db_path.stat().st_mtime
        client_time = request.if_modified_since
        if client_time != None and client_time.timestamp()+1 >= server_time:
            return make_response("", 304)
        rv = make_response(func(*args, **kwargs))
        rv.headers["cache-control"] = "no-cache"
        rv.last_modified = db_path.stat().st_mtime
        return rv
    return wrapper

@app.route("/")
def index_page():
    return render_template("index.html", db_list=sorted(top_level_db_list()))

@app.route("/<path:name>")
@valid_db_check
def treemap_page(name):
    return render_template("treemap.html", name=name)

@app.route("/<path:name>/filetree.json")
@cache_on_db_change
@valid_db_check
def filetree_json(name):
    if request.args.keys():
        valid_keys = ("email_include", "email_exclude", "commit_include", "commit_exclude", "filename_include", "filename_exclude", "datetime_include", "datetime_exclude")
        params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
        params_frozen = frozenset(params.items())
        return get_json_with_params(name, params_frozen)

    # If no parameters are given, use specially cached result
    this_repo_dir = repos_dir / pathlib.Path(name)
    db_path = (this_repo_dir / this_repo_dir.stem).with_suffix(".db")
    json_path = this_repo_dir / "filetree.json"
    if json_path.is_file():
        database_change_time = db_path.stat().st_mtime
        json_change_time = json_path.stat().st_mtime
        if not database_change_time > json_change_time:
            # Use cached result only if it exists and is newer than the database
            with open(json_path, "rb") as f:
                return f.read().decode(errors="replace")

    with open(json_path, "wb") as f:
        json = database_to_JSON.get_json_from_db(db_path)
        f.write(json.encode(errors="replace"))
        return json


@app.route("/<path:name>/highlight.json")
@cache_on_db_change
@valid_db_check
def highight_json(name):
    valid_keys = ("email_include", "email_exclude", "commit_include", "commit_exclude", "filename_include", "filename_exclude", "datetime_include", "datetime_exclude")
    params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
    params_frozen = frozenset(params.items())
    return get_json_with_params(name, params_frozen)

@app.route("/<path:name>/.gitmodules")
@cache_on_db_change
@valid_db_check
def submodule_list(name):
    this_repo_dir = repos_dir / pathlib.Path(name)
    gitmodules_path = this_repo_dir / ".gitmodules"
    if not gitmodules_path.is_file():
        return []
    with open(this_repo_dir / ".gitmodules") as f:
        return f.read().splitlines()

@app.route("/<path:name>/query/<query>")
@cache_on_db_change
@valid_db_check
@valid_query_check
def sql_query(name, query):
    this_repo_dir = repos_dir / pathlib.Path(name)
    db_path = (this_repo_dir / this_repo_dir.stem).with_suffix(".db")
    query_path = (project_dir / "sql" / query).with_suffix(".sql")
    with open(query_path) as f:
        query_text = f.read()
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(query_text, tuple(request.args.keys()))
        out = [[i[0] for i in cur.description]] + cur.fetchall()
        return out

@functools.lru_cache(maxsize=100)
def get_json_with_params(name, params):
    this_repo_dir = repos_dir / pathlib.Path(name)
    db_path = (this_repo_dir / this_repo_dir.stem).with_suffix(".db")
    params_dict = {a[0]: a[1] for a in params}
    query, sql_params = database_to_JSON.get_filtered_query(params_dict)
    return database_to_JSON.get_json_from_db(db_path, query, sql_params)

if __name__ == "__main__":
    app.run()
