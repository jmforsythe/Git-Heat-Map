use anyhow::{anyhow, bail};
use gix::bstr::{BStr, BString, ByteSlice, ByteVec};
use gix::features::progress;
use gix::odb::FindExt;
use gix::parallel::{InOrderIter, SequenceId};
use gix::prelude::ObjectIdExt;
use gix::Progress;
use rusqlite::params;
use std::convert::Infallible;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub fn run(
    repo: gix::Repository,
    mut con: rusqlite::Connection,
    name: &str,
    progress: Arc<prodash::tree::Root>,
    object_cache_size_mb: usize,
) -> anyhow::Result<()> {
    let commit_id = repo.head_id()?.detach();
    let threads = std::thread::available_parallelism()?.get();

    std::fs::write(
        format!("{name}_lastcommit.txt"),
        commit_id.to_hex().to_string().as_bytes(),
    )?;

    let mut stat_progress = {
        let mut p = progress.add_child("extract stats");
        p.init(None, progress::count("commits"));
        p
    };
    let stat_counter = stat_progress.counter().expect("shared counter available");

    let mut event_progress = {
        let mut p = progress.add_child("write to db");
        p.init(None, progress::count("commits"));
        p
    };
    let commit_counter = event_progress.counter().expect("shared counter available");

    let mut change_progress = {
        let mut p = progress.add_child("find changes");
        p.init(None, progress::count("modified files"));
        p
    };
    let change_counter = change_progress.counter().expect("shared counter available");

    let mut lines_progress = {
        let mut p = progress.add_child("find changes");
        p.init(None, progress::count("diff lines"));
        p
    };
    let lines_counter = lines_progress.counter().expect("shared counter available");

    let mut progress = progress.add_child("traverse commit graph");
    progress.init(None, progress::count("commits"));

    std::thread::scope(|scope| -> anyhow::Result<_> {
        struct CommitDiffStats {
            /// The id of the commit which was diffed with its predecessor
            id: gix::hash::ObjectId,
            data: Vec<u8>,
            changes: Vec<FileChange>,
        }
        let start = Instant::now();
        let (tx_stats, rx_stats) = std::sync::mpsc::channel::<Result<(SequenceId, Vec<CommitDiffStats>), Infallible>>();
        let mailmap = repo.open_mailmap();

        let db_thread = scope.spawn({
            move || -> anyhow::Result<()> {
                let trans = con.transaction()?;
                {
                    let mut new_commit = trans.prepare(
                        r#"INSERT INTO
                   commits(hash, authorDate, committerName, committerEmail, committerDate)
                   VALUES(?, ?, ?, ?, ?)"#,
                    )?;
                    let mut insert_author = trans.prepare(
                        r#"
                   INSERT OR IGNORE INTO
                   author(authorEmail, authorName)
                   VALUES(?, ?) 
                "#,
                    )?;
                    let mut commit_author = trans.prepare(
                        r#"
                   INSERT OR IGNORE INTO
                   commitAuthor(hash, authorEmail)
                   VALUES(?, ?)
                "#,
                    )?;
                    let mut insert_commit_file = trans.prepare(
                        r#"
                   INSERT INTO
                   commitFile(hash, fileID, linesAdded, linesRemoved)
                   VALUES(?, (SELECT files.fileID FROM files WHERE files.filePath = ?), ?, ?)
                "#,
                    )?;
                    let mut rename_file = trans.prepare(
                        r#"
                   UPDATE OR IGNORE files
                   SET filePath = ?
                   WHERE filePath = ?
                "#,
                    )?;

                    let mut create_file = trans.prepare(
                        r#"
                   INSERT OR IGNORE INTO
                   files(filePath)
                   VALUES(?)
                "#,
                    )?;
                    let mut nullify_file = trans.prepare(
                        r#"
                   UPDATE FILES
                   SET filePath = NULL
                   WHERE filePath = ?
                "#,
                    )?;
                    for stats in InOrderIter::from(rx_stats.into_iter()) {
                        for CommitDiffStats { id, data, changes } in stats.expect("infallible") {
                            let Ok(commit) = gix::objs::CommitRef::from_bytes(&data) else { continue };

                            let author = mailmap.resolve_cow(commit.author.trim());
                            let committer = mailmap.resolve_cow(commit.committer.trim());
                            let id = id.to_string();
                            new_commit.execute(params![
                                id,
                                author.time.format(gix::date::time::format::ISO8601),
                                committer.name.to_str_lossy(),
                                committer.email.to_str_lossy(),
                                committer.time.format(gix::date::time::format::ISO8601)
                            ])?;
                            insert_author.execute(params![author.email.to_str_lossy(), author.name.to_str_lossy()])?;
                            commit_author.execute(params![id, author.email.to_str_lossy()])?;
                            for mut name_email in commit
                                .message_trailers()
                                .filter_map(|t| (t.token == "Co-authored-by").then(|| t.value.trim().to_owned()))
                            {
                                name_email.push_str(b" 1661947406 +0200"); // make it a parseable signature, for now this isn't built-in to `gitoxide`
                                if let Ok((_, sig)) = gix::actor::signature::decode::<()>(&name_email) {
                                    insert_author
                                        .execute(params![sig.email.to_str_lossy(), sig.name.to_str_lossy()])?;
                                    commit_author.execute(params![id, sig.email.to_str_lossy()])?;
                                }
                            }

                            let id = id.to_string();
                            for change in changes {
                                match change.mode {
                                    FileMode::Added | FileMode::Modified => {
                                        create_file.execute(params![change.relpath.to_str_lossy()])?;
                                    }
                                    FileMode::Removed => {
                                        nullify_file.execute(params![change.relpath.to_str_lossy()])?;
                                    }
                                    FileMode::Renamed { source_relpath } => {
                                        rename_file.execute(params![
                                            change.relpath.to_str_lossy(),
                                            source_relpath.to_str_lossy()
                                        ])?;
                                    }
                                }
                                insert_commit_file.execute(params![
                                    id,
                                    change.relpath.to_str_lossy(),
                                    change.lines.added,
                                    change.lines.removed
                                ])?;
                            }
                            commit_counter.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                }
                trans.commit()?;
                crate::db::create_indices(&con)?;
                con.close().ok();
                Ok(())
            }
        });

        let (tx_tree_ids, stat_threads) = {
            let (tx, rx) = crossbeam_channel::unbounded::<(
                SequenceId,
                Vec<(Option<gix::hash::ObjectId>, gix::hash::ObjectId, Vec<u8>)>,
            )>();
            let stat_workers = (0..threads)
                .map(|_| {
                    scope.spawn({
                        let stat_counter = stat_counter.clone();
                        let change_counter = change_counter.clone();
                        let lines_counter = lines_counter.clone();
                        let tx_stats = tx_stats.clone();
                        let mut repo = repo.clone();
                        repo.object_cache_size_if_unset((object_cache_size_mb * 1024 * 1024) / threads);
                        let rx = rx.clone();
                        move || -> anyhow::Result<()> {
                            for (chunk_id, chunk) in rx {
                                let mut out_chunk = Vec::with_capacity(chunk.len());
                                for (parent_commit, commit, data) in chunk {
                                    stat_counter.fetch_add(1, Ordering::SeqCst);
                                    if gix::interrupt::is_triggered() {
                                        return Ok(());
                                    }
                                    let mut out = Vec::new();
                                    let from = match parent_commit {
                                        Some(id) => {
                                            match repo.find_object(id).ok().and_then(|c| c.peel_to_tree().ok()) {
                                                Some(tree) => tree,
                                                None => continue,
                                            }
                                        }
                                        None => repo.empty_tree(),
                                    };
                                    let to = match repo.find_object(commit).ok().and_then(|c| c.peel_to_tree().ok()) {
                                        Some(c) => c,
                                        None => continue,
                                    };
                                    from.changes()?.track_path().for_each_to_obtain_tree(&to, |change| {
                                        use gix::object::tree::diff::change::Event::*;
                                        change_counter.fetch_add(1, Ordering::SeqCst);
                                        match change.event {
                                            Addition { entry_mode, id } => {
                                                if entry_mode.is_no_tree() {
                                                    add_lines(&mut out, change.location, &lines_counter, id);
                                                }
                                            }
                                            Modification {
                                                entry_mode,
                                                previous_entry_mode,
                                                id,
                                                previous_id,
                                            } => match (previous_entry_mode.is_blob(), entry_mode.is_blob()) {
                                                (false, false) => {}
                                                (false, true) => {
                                                    add_lines(&mut out, change.location, &lines_counter, id);
                                                }
                                                (true, false) => {
                                                    add_lines(&mut out, change.location, &lines_counter, previous_id);
                                                }
                                                (true, true) => {
                                                    if let Some(Ok(diff)) = change.event.diff() {
                                                        let mut nl = 0;
                                                        let counts = diff.line_counts();
                                                        nl += counts.insertions as usize + counts.removals as usize;
                                                        let lines = LineStats {
                                                            added: counts.insertions as usize,
                                                            removed: counts.removals as usize,
                                                        };
                                                        lines_counter.fetch_add(nl, Ordering::SeqCst);
                                                        out.push(FileChange {
                                                            relpath: change.location.to_owned(),
                                                            mode: FileMode::Modified,
                                                            lines,
                                                        });
                                                    }
                                                }
                                            },
                                            Deletion { entry_mode, id } => {
                                                if entry_mode.is_no_tree() {
                                                    remove_lines(&mut out, change.location, &lines_counter, id);
                                                }
                                            }
                                            Rewrite {
                                                source_location,
                                                diff,
                                                copy,
                                                ..
                                            } => {
                                                if !copy {
                                                    out.push(FileChange {
                                                        relpath: change.location.to_owned(),
                                                        mode: FileMode::Renamed {
                                                            source_relpath: source_location.to_owned(),
                                                        },
                                                        lines: diff
                                                            .map(|d| LineStats {
                                                                added: d.insertions as usize,
                                                                removed: d.removals as usize,
                                                            })
                                                            .unwrap_or_default(),
                                                    });
                                                }
                                            }
                                        }
                                        Ok::<_, Infallible>(Default::default())
                                    })?;
                                    out_chunk.push(CommitDiffStats {
                                        id: commit,
                                        data,
                                        changes: out,
                                    });
                                }
                                if tx_stats.send(Ok((chunk_id, out_chunk))).is_err() {
                                    break;
                                }
                            }
                            Ok(())
                        }
                    })
                })
                .collect::<Vec<_>>();
            (tx, stat_workers)
        };
        drop(tx_stats);

        let mut commit_idx = 0;
        const CHUNK_SIZE: usize = 50;
        let mut chunk = Vec::with_capacity(CHUNK_SIZE);
        let mut chunk_id: SequenceId = 0;
        let commit_iter = gix::interrupt::Iter::new(
            commit_id.ancestors(|oid, buf| {
                progress.inc();
                repo.objects.find(oid, buf).map(|obj| {
                    let res = {
                        let mut parents = gix::objs::CommitRefIter::from_bytes(obj.data).parent_ids();
                        let res = parents.next().map(|first_parent| (Some(first_parent), oid.to_owned()));
                        match parents.next() {
                            Some(_) => None,
                            None => res,
                        }
                    };
                    if let Some((first_parent, commit)) = res {
                        if chunk.len() == CHUNK_SIZE {
                            tx_tree_ids
                                .send((chunk_id, std::mem::replace(&mut chunk, Vec::with_capacity(CHUNK_SIZE))))
                                .ok();
                            chunk_id += 1;
                        }
                        chunk.push((first_parent, commit, obj.data.to_vec()));
                    }
                    commit_idx += 1;
                    gix::objs::CommitRefIter::from_bytes(obj.data)
                })
            }),
            || anyhow!("Cancelled by user"),
        );
        for c in commit_iter {
            match c? {
                Ok(c) => c,
                Err(gix::traverse::commit::ancestors::Error::FindExisting { .. }) => {
                    eprintln!("shallow repository - commit history is truncated");
                    break;
                }
                Err(err) => return Err(err.into()),
            };
        }
        tx_tree_ids.send((chunk_id, chunk)).ok();
        drop(tx_tree_ids);
        progress.show_throughput(start);
        drop(progress);

        let stat_max = Some(commit_idx);
        stat_progress.set_max(stat_max);
        event_progress.set_max(stat_max);
        for handle in stat_threads {
            handle.join().expect("no panic")?;
            if gix::interrupt::is_triggered() {
                bail!("Cancelled by user");
            }
        }
        stat_progress.show_throughput(start);
        change_progress.show_throughput(start);
        lines_progress.show_throughput(start);

        db_thread.join().expect("no panic")?;
        event_progress.show_throughput(start);
        Ok(())
    })?;

    Ok(())
}

fn add_lines(out: &mut Vec<FileChange>, path: &BStr, lines_counter: &AtomicUsize, id: gix::Id<'_>) {
    if let Ok(blob) = id.object() {
        let nl = blob.data.lines_with_terminator().count();
        let mut lines = LineStats::default();
        lines.added += nl;
        lines_counter.fetch_add(nl, Ordering::SeqCst);
        out.push(FileChange {
            relpath: path.to_owned(),
            mode: FileMode::Added,
            lines,
        });
    }
}

fn remove_lines(out: &mut Vec<FileChange>, path: &BStr, lines_counter: &AtomicUsize, id: gix::Id<'_>) {
    if let Ok(blob) = id.object() {
        let mut lines = LineStats::default();
        let nl = blob.data.lines_with_terminator().count();
        lines.removed += nl;
        lines_counter.fetch_add(nl, Ordering::SeqCst);
        out.push(FileChange {
            relpath: path.to_owned(),
            mode: FileMode::Removed,
            lines,
        })
    }
}

#[derive(Debug)]
enum FileMode {
    Added,
    Removed,
    Modified,
    Renamed { source_relpath: BString },
}

#[derive(Debug)]
struct FileChange {
    relpath: BString,
    mode: FileMode,
    lines: LineStats,
}

/// Line statistics for a particular commit.
#[derive(Debug, Default, Copy, Clone)]
struct LineStats {
    /// amount of added lines
    added: usize,
    /// amount of removed lines
    removed: usize,
}
