use std::sync::Arc;

use clap::Parser;

mod db;
mod engine;

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    gix::interrupt::init_handler(|| {})?;
    let repo = gix::open(args.repo_dir)?;

    let progress = prodash::tree::Root::new();
    let render_progress = prodash::render::line(
        std::io::stderr(),
        Arc::downgrade(&progress),
        prodash::render::line::Options {
            level_filter: None,
            frames_per_second: 30.0,
            initial_delay: Some(std::time::Duration::from_millis(1000)),
            timestamp: true,
            throughput: true,
            hide_cursor: true,
            ..prodash::render::line::Options::default()
        }
        .auto_configure(prodash::render::line::StreamKind::Stderr),
    );

    let name = repo_name(&repo)?;
    let db = db::create(&name)?;
    engine::run(repo, db, &name, progress, args.object_cache_size_mb)?;
    render_progress.wait();

    Ok(())
}

#[derive(Parser)]
#[command(author, version, about)]
struct Args {
    /// The total amount of object cache memory in MB.
    ///
    /// 0 disables it.
    #[arg(long, short = 'o', default_value_t = 200)]
    object_cache_size_mb: usize,
    /// path to the git repository to generate the database for
    #[arg(default_value = ".")]
    repo_dir: std::path::PathBuf,
}

fn repo_name(repo: &gix::Repository) -> std::io::Result<String> {
    Ok(repo
        .work_dir()
        .unwrap_or_else(|| repo.git_dir())
        .canonicalize()?
        .file_stem()
        .expect("canonicalized path yields a stem")
        .to_string_lossy()
        .into_owned())
}
