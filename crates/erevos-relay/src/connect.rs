//! Connects to a name that resolves to more than one address: tries each in
//! the order the resolver gave them, so an address that does not answer (an
//! IPv6 address where IPv6 does not work, one server of several that is
//! down) does not fail the connection while another one would answer.
//!
//! The attempts share one deadline. Each attempt but the last gets an even
//! share of the time left, and never less than `MIN_ATTEMPT` while that much
//! is left: an address that drops what is sent to it cannot take the time of
//! the ones after it, and a long list does not cut every attempt too short to
//! succeed. The last attempt gets all the time that is left.

use std::io;
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

/// Shortest time an attempt gets, while that much time is left.
const MIN_ATTEMPT: Duration = Duration::from_secs(5);

/// Connects to the first of `addresses` that answers, in their order, all
/// within `timeout`. The error is the last attempt's, or `NotFound` when
/// there is no address.
pub fn to_any(addresses: &[SocketAddr], timeout: Duration) -> io::Result<TcpStream> {
    if addresses.is_empty() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "no address"));
    }
    let deadline = Instant::now() + timeout;
    let mut last = io::Error::new(io::ErrorKind::TimedOut, "connection timed out");
    for (i, address) in addresses.iter().enumerate() {
        let left = deadline.saturating_duration_since(Instant::now());
        if left.is_zero() {
            break;
        }
        match TcpStream::connect_timeout(address, share(left, addresses.len() - i)) {
            Ok(tcp) => return Ok(tcp),
            Err(e) => last = e,
        }
    }
    Err(last)
}

/// The time the next attempt gets, with `left` until the deadline and
/// `remaining` attempts still to make, the next one among them.
fn share(left: Duration, remaining: usize) -> Duration {
    match u32::try_from(remaining) {
        Ok(0 | 1) => left,
        Ok(n) => (left / n).max(MIN_ATTEMPT.min(left)),
        Err(_) => MIN_ATTEMPT.min(left),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    /// An address on this machine that nothing listens on.
    fn closed() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.local_addr().unwrap()
    }

    #[test]
    fn an_address_that_refuses_is_passed_over() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let open = listener.local_addr().unwrap();
        let tcp = to_any(&[closed(), open], Duration::from_secs(5)).unwrap();
        assert_eq!(tcp.peer_addr().unwrap(), open);
    }

    #[test]
    fn the_first_that_answers_is_taken() {
        let first = TcpListener::bind("127.0.0.1:0").unwrap();
        let second = TcpListener::bind("127.0.0.1:0").unwrap();
        let first = first.local_addr().unwrap();
        let tcp = to_any(
            &[first, second.local_addr().unwrap()],
            Duration::from_secs(5),
        )
        .unwrap();
        assert_eq!(tcp.peer_addr().unwrap(), first);
    }

    #[test]
    fn the_last_error_is_given_when_none_answers() {
        let e = to_any(&[closed(), closed()], Duration::from_secs(5)).unwrap_err();
        assert_eq!(e.kind(), io::ErrorKind::ConnectionRefused);
    }

    #[test]
    fn no_address_is_not_found() {
        let e = to_any(&[], Duration::from_secs(5)).unwrap_err();
        assert_eq!(e.kind(), io::ErrorKind::NotFound);
    }

    #[test]
    fn each_attempt_gets_its_share_and_the_last_gets_the_rest() {
        let s = Duration::from_secs;
        assert_eq!(share(s(15), 1), s(15));
        assert_eq!(share(s(15), 2), Duration::from_millis(7500));
        assert_eq!(share(s(15), 3), s(5));
        // Never less than MIN_ATTEMPT while that much is left.
        assert_eq!(share(s(15), 4), s(5));
        assert_eq!(share(s(15), 100), s(5));
        // Nor more than is left.
        assert_eq!(share(s(3), 3), s(3));
        assert_eq!(share(Duration::ZERO, 2), Duration::ZERO);
    }
}
