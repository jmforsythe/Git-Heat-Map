from flask import Flask, render_template

app = Flask(__name__)
app.static_folder = "static"

@app.route("/")
def main_page():
    return render_template("index.html")

@app.route("/<name>.json")
def get_json(name=None):
    return open(f"{name}.json").read()

app.run()
