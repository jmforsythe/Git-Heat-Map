import glob
import os
import functools

from flask import Flask, render_template, request, abort

import databaseToJSON

app = Flask(__name__)
app.static_folder = "static"

def db_list():
    return [db[:-3] for db in glob.glob("*.db")]

def valid_db_check(func):
    def wrapper(name):
        if name in db_list():
            return func(name)
        abort(404)
    wrapper.__name__ = func.__name__
    return wrapper

@app.route("/")
def index_page():
    return render_template("index.html", db_list=db_list())

@app.route("/<name>")
@valid_db_check
def treemap_page(name):
    return render_template("treemap.html", name=name)

@app.route("/filetree/<name>.json")
@valid_db_check
def filetree_json(name):
    if not os.path.isfile(f"{name}.json"):
        with open(f"{name}.json", "wb") as f:
            json = databaseToJSON.get_json_from_db(f"{name}.db")
            f.write(json.encode(errors="replace"))
            return json
    else:
        with open(f"{name}.json", "rb") as f:
            return f.read().decode(errors="replace")

@app.route("/highlight/<name>.json")
@valid_db_check
def highight_json(name):
    valid_keys = ("email_include", "email_exclude", "commit_include", "commit_exclude", "filename_include", "filename_exclude", "datetime_include", "datetime_exclude")
    params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
    params_frozen = frozenset(params.items())

    return get_highlight_json(name, params_frozen)

@functools.lru_cache(maxsize=100)
def get_highlight_json(name, params):
    params_dict = {a[0]: a[1] for a in params}
    query, sql_params = databaseToJSON.get_filtered_query(params_dict)
    return databaseToJSON.get_json_from_db(f"{name}.db", query, sql_params)

if __name__ == "__main__":
    app.run()
