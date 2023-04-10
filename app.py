import pathlib
import functools
import sqlite3
import functools

from flask import Flask, render_template, request, abort, make_response

import databaseToJSON

app = Flask(__name__)
app.static_folder = "static"

project_dir = pathlib.Path(__file__).parent
repos_dir = project_dir / "repos"
query_dir = project_dir / "sql"

def db_list():
    return (d.stem for d in repos_dir.iterdir() if d.is_dir())

def query_list():
    return (d.stem for d in query_dir.iterdir())

def valid_db_check(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        name = kwargs["name"]
        if name in db_list():
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
        db_path = (repos_dir / name / name).with_suffix(".db")
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
    return render_template("index.html", db_list=sorted(db_list()))

@app.route("/<name>")
@valid_db_check
def treemap_page(name):
    return render_template("treemap.html", name=name)

@app.route("/<name>/filetree.json")
@cache_on_db_change
@valid_db_check
def filetree_json(name):
    db_path = (repos_dir / name / name).with_suffix(".db")
    json_path = repos_dir / name / "filetree.json"
    if not json_path.is_file():
        with open(json_path, "wb") as f:
            json = databaseToJSON.get_json_from_db(db_path)
            f.write(json.encode(errors="replace"))
            return json
    else:
        with open(json_path, "rb") as f:
            return f.read().decode(errors="replace")

@app.route("/<name>/highlight.json")
@cache_on_db_change
@valid_db_check
def highight_json(name):
    valid_keys = ("email_include", "email_exclude", "commit_include", "commit_exclude", "filename_include", "filename_exclude", "datetime_include", "datetime_exclude")
    params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
    params_frozen = frozenset(params.items())
    return get_highlight_json(name, params_frozen)

@app.route("/<name>/query/<query>")
@cache_on_db_change
@valid_db_check
@valid_query_check
def sql_query(name, query):
    db_path = (repos_dir / name / name).with_suffix(".db")
    query_path = (project_dir / "sql" / query).with_suffix(".sql")
    with open(query_path) as f:
        query_text = f.read()
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(query_text, tuple(request.args.keys()))
        out = cur.fetchall()
        return out

@functools.lru_cache(maxsize=100)
def get_highlight_json(name, params):
    db_path = (repos_dir / name / name).with_suffix(".db")
    params_dict = {a[0]: a[1] for a in params}
    query, sql_params = databaseToJSON.get_filtered_query(params_dict)
    return databaseToJSON.get_json_from_db(db_path, query, sql_params)

if __name__ == "__main__":
    app.run()
