//! A clean stop on `SIGTERM` (what `systemctl stop` and `restart` send) or
//! `SIGINT` (Ctrl-C).
//!
//! Both are blocked in every thread from the start (`block`), and one thread
//! waits for them (`wait`). On one it takes the queue store's lock, keeps
//! the queues' news beside the journal (see `queue.rs`), and ends the process
//! while it still holds the lock, so nothing changes in the store after the
//! news were kept. A relay that stops any other way (a crash, `SIGKILL`, a
//! lock found poisoned) keeps no news, and its queues' news start afresh at
//! the next start, as before.

use crate::server::SharedStore;

#[cfg(unix)]
pub struct Signals(libc::sigset_t);

#[cfg(not(unix))]
pub struct Signals;

/// Blocks `SIGTERM` and `SIGINT` in this thread and so in every thread it
/// starts from now on: call it before any other thread starts. `None` if they
/// cannot be blocked, and then they end the process at once, as by default.
#[cfg(unix)]
pub fn block() -> Option<Signals> {
    // SAFETY: the set is initialised by sigemptyset before it is read, and
    // pthread_sigmask only reads it and writes nothing back (null old set).
    unsafe {
        let mut set: libc::sigset_t = std::mem::zeroed();
        if libc::sigemptyset(&mut set) != 0
            || libc::sigaddset(&mut set, libc::SIGTERM) != 0
            || libc::sigaddset(&mut set, libc::SIGINT) != 0
            || libc::pthread_sigmask(libc::SIG_BLOCK, &set, std::ptr::null_mut()) != 0
        {
            return None;
        }
        Some(Signals(set))
    }
}

#[cfg(not(unix))]
pub fn block() -> Option<Signals> {
    None
}

/// Waits on a thread of its own for one of the signals `block` blocked, then
/// keeps the news and ends the process. It must be started whenever `block`
/// gave `Some`, or nothing would stop the relay but `SIGKILL`.
pub fn wait(signals: Signals, store: SharedStore) {
    std::thread::spawn(move || {
        let signal = next(&signals);
        let store = store.store();
        match store.keep_news() {
            Ok(Some(kept)) => eprintln!(
                "erevos-relay: stopping on {signal}, with the news of {kept} queues kept for the next start"
            ),
            Ok(None) => eprintln!("erevos-relay: stopping on {signal}"),
            Err(e) => eprintln!(
                "erevos-relay: stopping on {signal}; cannot keep the queues' news, so they start afresh: {e}"
            ),
        }
        // While `store` still holds the lock: nothing changes after this.
        std::process::exit(0);
    });
}

#[cfg(unix)]
fn next(signals: &Signals) -> &'static str {
    loop {
        let mut signal: libc::c_int = 0;
        // SAFETY: the set was made by `block`; sigwait writes only `signal`.
        if unsafe { libc::sigwait(&signals.0, &mut signal) } == 0 {
            return if signal == libc::SIGINT {
                "SIGINT"
            } else {
                "SIGTERM"
            };
        }
    }
}

#[cfg(not(unix))]
fn next(_: &Signals) -> &'static str {
    loop {
        std::thread::park();
    }
}
