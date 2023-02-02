import glob
import functools

from flask import Flask, render_template, request
import databaseToJSON

app = Flask(__name__)
app.static_folder = "static"

@app.route("/")
def index_page():
    db_list = [db[:-3] for db in glob.glob("*.db")]
    return render_template("index.html", db_list=db_list)

@app.route("/<name>")
def treemap_page(name):
    return render_template("treemap.html", name=name)

@app.route("/filetree/<name>.json")
def filetree_json(name):
    return databaseToJSON.get_json_from_db(f"{name}.db")

@app.route("/highlight/<name>.json")
def highight_json(name):
    valid_keys = ("emails_include", "emails_exclude", "commits_include", "commits_exclude", "datetime_include", "datetime_exclude")
    params = {key: tuple(request.args.getlist(key)) for key in valid_keys if key in request.args.keys()}
    params_frozen = frozenset(params.items())

    return get_highlight_json(name, params_frozen)

@functools.lru_cache(maxsize=100)
def get_highlight_json(name, params):
    params_dict = {a[0]: a[1] for a in params}
    query, sql_params = databaseToJSON.get_filtered_query(params_dict)
    return databaseToJSON.get_json_from_db(f"{name}.db", query, sql_params)

app.run()
