// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Locks that stop the relay when a thread panicked while holding one.
//!
//! Every connection runs on its own thread and shares the queues, the file
//! store and the rest behind mutexes. A thread that panics while it holds one
//! leaves it poisoned: from then on every other thread that takes it would
//! panic too, so each connection would die at its first request while the
//! process itself kept running. The service manager sees a relay that is up
//! and never starts it again. Taking a lock here instead ends the process at
//! the first poisoned lock, with a line saying why, so a service set to
//! restart on failure (as `deploy/relay/erevos-relay.service` is) starts a
//! fresh relay, which reads its journal and files back as after any stop.
//!
//! The process exits rather than aborts, so no core dump is written: one
//! would hold the relay's key and whatever messages were in memory.
//!
//! A panic that does not happen while a lock is held changes nothing: it ends
//! its own connection, as before.

use std::sync::{Condvar, Mutex, MutexGuard};
use std::time::Duration;

/// The exit code when a lock was poisoned: not zero, so a restart follows.
const POISONED: i32 = 70;

/// Takes `mutex`, or ends the process if a thread panicked while holding it.
/// `what` names it in the line the relay prints then.
pub fn lock<'a, T>(mutex: &'a Mutex<T>, what: &str) -> MutexGuard<'a, T> {
    mutex.lock().unwrap_or_else(|_| poisoned(what))
}

/// Waits on `condvar` for at most `timeout`, as `Condvar::wait_timeout`
/// does, or ends the process if a thread panicked while holding the lock.
pub fn wait_timeout<'a, T>(
    condvar: &Condvar,
    guard: MutexGuard<'a, T>,
    timeout: Duration,
    what: &str,
) -> MutexGuard<'a, T> {
    match condvar.wait_timeout(guard, timeout) {
        Ok((guard, _)) => guard,
        Err(_) => poisoned(what),
    }
}

fn poisoned(what: &str) -> ! {
    elog!(
        "erevos-relay: a thread panicked while holding the {what}, so the relay stops here to be started again"
    );
    std::process::exit(POISONED);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;
    use std::sync::Arc;

    #[test]
    fn a_lock_that_was_not_poisoned_is_taken_as_usual() {
        let mutex = Mutex::new(1);
        *lock(&mutex, "test lock") += 1;
        assert_eq!(*lock(&mutex, "test lock"), 2);
        let condvar = Condvar::new();
        let guard = wait_timeout(
            &condvar,
            lock(&mutex, "test lock"),
            Duration::from_millis(1),
            "test lock",
        );
        assert_eq!(*guard, 2);
    }

    #[test]
    fn a_panic_that_holds_no_lock_leaves_the_others_usable() {
        let mutex = Arc::new(Mutex::new(0));
        let held = Arc::clone(&mutex);
        let panicked = std::thread::spawn(move || {
            *lock(&held, "test lock") += 1;
            panic!("after the lock was let go");
        })
        .join();
        assert!(panicked.is_err());
        assert_eq!(*lock(&mutex, "test lock"), 1);
    }

    // Run in a child process of this test binary, since it ends the process it runs in.
    #[test]
    fn a_poisoned_lock_ends_the_process() {
        if std::env::var_os("EREVOS_RELAY_POISON_CHILD").is_some() {
            let mutex = Arc::new(Mutex::new(0));
            let held = Arc::clone(&mutex);
            let _ = std::thread::spawn(move || {
                let _guard = lock(&held, "test lock");
                panic!("while holding the lock");
            })
            .join();
            drop(lock(&mutex, "test lock"));
            unreachable!("the poisoned lock ends the process");
        }
        let output = Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "lock::tests::a_poisoned_lock_ends_the_process",
                "--nocapture",
            ])
            .env("EREVOS_RELAY_POISON_CHILD", "1")
            .output()
            .unwrap();
        assert_eq!(output.status.code(), Some(POISONED));
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(
            stderr.contains("panicked while holding the test lock"),
            "{stderr}"
        );
    }
}
