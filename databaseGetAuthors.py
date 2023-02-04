import sqlite3

def get_authors_from_db(database_name):
    con = sqlite3.connect(f"{database_name}.db")
    cur = con.cursor()
    cur.execute("""
        SELECT authorEmail, authorName
        FROM author
        ORDER BY authorName ASC;
    """)
    authors = cur.fetchall()
    con.close()
    return authors
