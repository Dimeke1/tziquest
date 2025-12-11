from flask import Flask, send_from_directory
import os
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
app = Flask(
    __name__,
    static_folder=str(ROOT),
    static_url_path="",
)


@app.route("/", methods=["GET"])
def index() -> object:
    """Serve the static single-page quiz app."""
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
