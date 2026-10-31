// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! The relay itself, stopped as systemd stops it.
#![cfg(unix)]

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

/// Starts the relay on free ports with its journal at `journal`, and returns
/// it once it listens, with its log lines from then on.
fn start(journal: &Path) -> (Child, mpsc::Receiver<String>) {
    let mut relay = Command::new(env!("CARGO_BIN_EXE_erevos-relay"))
        .args(["127.0.0.1:0", "127.0.0.1:0"])
        .env_clear()
        .env("EREVOS_RELAY_JOURNAL", journal)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let (tx, rx) = mpsc::channel();
    let stderr = relay.stderr.take().unwrap();
    thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            if tx.send(line).is_err() {
                break;
            }
        }
    });
    loop {
        match rx.recv_timeout(Duration::from_secs(20)) {
            Ok(line) if line.starts_with("erevos-relay listening") => return (relay, rx),
            Ok(_) => {}
            Err(e) => {
                let _ = relay.kill();
                let _ = relay.wait();
                panic!("the relay did not start: {e}");
            }
        }
    }
}

/// Sends `signal` to the relay, and returns the lines it said until it ended,
/// which it must have done with success.
fn stop(mut relay: Child, signal: libc::c_int, log: &mpsc::Receiver<String>) -> Vec<String> {
    // SAFETY: kill only sends a signal, to the child started above.
    assert_eq!(unsafe { libc::kill(relay.id() as libc::pid_t, signal) }, 0);
    let status = relay.wait().unwrap();
    assert!(status.success(), "{status}");
    let mut said = Vec::new();
    while let Ok(line) = log.recv_timeout(Duration::from_secs(5)) {
        said.push(line);
    }
    said
}

#[test]
fn a_relay_stopped_with_sigterm_keeps_its_news_for_the_next_start() {
    let dir = std::env::temp_dir().join(format!("erevos-relay-stop-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let journal = dir.join("queues.journal");
    let mut news = journal.as_os_str().to_owned();
    news.push(".news");
    let news = PathBuf::from(news);

    let (relay, log) = start(&journal);
    let said = stop(relay, libc::SIGTERM, &log);
    assert!(
        said.iter()
            .any(|l| l.contains("stopping on SIGTERM, with the news of 0 queues kept")),
        "{said:?}"
    );
    let kept = std::fs::read(&news).unwrap();
    assert_eq!(&kept[..8], b"EREVOSN1");

    // Taken, and gone, at the next start; Ctrl-C stops it the same way.
    let (relay, log) = start(&journal);
    assert!(!news.exists());
    let said = stop(relay, libc::SIGINT, &log);
    assert!(
        said.iter().any(|l| l.contains("stopping on SIGINT")),
        "{said:?}"
    );
    assert!(news.exists());
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn a_relay_whose_log_is_gone_still_stops_on_sigterm() {
    let dir = std::env::temp_dir().join(format!("erevos-relay-stop-nolog-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let journal = dir.join("queues.journal");
    let mut news = journal.as_os_str().to_owned();
    news.push(".news");
    let news = PathBuf::from(news);

    let mut relay = Command::new(env!("CARGO_BIN_EXE_erevos-relay"))
        .args(["127.0.0.1:0", "127.0.0.1:0"])
        .env_clear()
        .env("EREVOS_RELAY_JOURNAL", &journal)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    // Read its log until it listens, then close the pipe, as a `| head` that has
    // had its lines does: what it logs after that cannot be written.
    let mut lines = BufReader::new(relay.stderr.take().unwrap()).lines();
    loop {
        match lines.next() {
            Some(Ok(line)) if line.starts_with("erevos-relay listening") => break,
            Some(Ok(_)) => {}
            _ => panic!("the relay did not start"),
        }
    }
    drop(lines);

    // SAFETY: kill only sends a signal, to the child started above.
    assert_eq!(unsafe { libc::kill(relay.id() as libc::pid_t, libc::SIGTERM) }, 0);
    let mut status = None;
    for _ in 0..100 {
        status = relay.try_wait().unwrap();
        if status.is_some() {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    if status.is_none() {
        let _ = relay.kill();
        let _ = relay.wait();
        panic!("the relay did not stop on SIGTERM once its log was gone");
    }
    assert!(status.unwrap().success(), "{status:?}");
    assert!(news.exists());
    std::fs::remove_dir_all(&dir).unwrap();
}
