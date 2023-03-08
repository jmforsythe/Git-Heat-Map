import glob
import pathlib
import functools

from flask import Flask, render_template, request, abort

import databaseToJSON

app = Flask(__name__)
app.static_folder = "static"

repos_dir = pathlib.Path(__file__).parent / "repos"

def db_list():
    return (d.stem for d in repos_dir.iterdir() if d.is_dir())

def valid_db_check(func):
    def wrapper(name):
        if name in db_list():
            return func(name)
        abort(404)
    wrapper.__name__ = func.__name__
    return wrapper

@app.route("/")
def index_page():
    return render_template("index.html", db_list=sorted(db_list()))

@app.route("/<name>")
@valid_db_check
def treemap_page(name):
    return render_template("treemap.html", name=name)

@app.route("/<name>/filetree.json")
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
@valid_db_check
def highight_json(name):
    valid_keys = ("email_include", "email_exclude", "commit_include", "commit_exclude", "filename_include", "filename_exclude", "datetime_include", "datetime_exclude")
    params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
    params_frozen = frozenset(params.items())

    return get_highlight_json(name, params_frozen)

@functools.lru_cache(maxsize=100)
def get_highlight_json(name, params):
    db_path = (repos_dir / name / name).with_suffix(".db")
    params_dict = {a[0]: a[1] for a in params}
    query, sql_params = databaseToJSON.get_filtered_query(params_dict)
    return databaseToJSON.get_json_from_db(db_path, query, sql_params)

if __name__ == "__main__":
    app.run()
