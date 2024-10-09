Produce a repository database fast with `gitoxide`.

### How to run

Assuming an existing `Rust` installation (which can be done [with rustup][https://rustup.rs]),
run the following:

```sh
cargo run --release -- /path/to/repository
```

This will drop the required database files in the current directory.
As the database location matters, one might want to do the following instead:

```sh
cargo build --release
cd ..
./db-gen/target/release/db-gen /path/to/repository
```

That way directory files are placed where they would be expected by the visualizer.

