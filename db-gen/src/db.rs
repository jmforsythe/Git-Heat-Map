pub fn create_indices(con: &rusqlite::Connection) -> rusqlite::Result<()> {
    con.execute_batch("CREATE INDEX if not exists commitFileID ON commitFile (fileID)")?;
    con.execute_batch("CREATE INDEX if not exists commitAuthorEmail ON commitAuthor (authorEmail)")
}

pub fn create(name: &str) -> rusqlite::Result<rusqlite::Connection> {
    let con = rusqlite::Connection::open(format!("{name}.db"))?;
    con.execute_batch(
        r#"
    CREATE TABLE if not exists commits(
        hash character(40) NOT NULL PRIMARY KEY,
        authorDate text NOT NULL,
        committerName text NOT NULL,
        committerEmail text NOT NULL,
        committerDate text NOT NULL
    )
"#,
    )?;
    con.execute_batch(
        r#"
    CREATE TABLE if not exists files(
        fileID integer NOT NULL PRIMARY KEY,
        filePath text UNIQUE
    )
"#,
    )?;
    con.execute_batch(
        r#"
   CREATE TABLE if not exists commitFile(
        hash character(40),
        fileID text,
        linesAdded integer,
        linesRemoved integer,
        FOREIGN KEY (hash) REFERENCES commits (hash),
        FOREIGN KEY (fileID) REFERENCES files (fileID),
        PRIMARY KEY (hash, fileID)
    )
    "#,
    )?;
    con.execute_batch(
        r#"
    CREATE TABLE if not exists author(
        authorEmail text NOT NULL PRIMARY KEY,
        authorName text NOT NULL
    )
"#,
    )?;
    con.execute_batch(
        r#"
    CREATE TABLE if not exists commitAuthor(
        hash character(40),
        authorEmail text,
        FOREIGN KEY (hash) REFERENCES commits (hash),
        FOREIGN KEY (authorEmail) REFERENCES author (authorEmail),
        PRIMARY KEY (hash, authorEmail)
    )
"#,
    )?;

    Ok(con)
}
