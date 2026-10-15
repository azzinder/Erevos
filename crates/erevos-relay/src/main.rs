//! Erevos relay: holds one-way message queues for offline delivery.
//!
//! Only the queue store exists so far. The network listener, two-hop
//! forwarding and retention come next.

#[allow(dead_code)] // used once the listener lands
mod queue;

fn main() {
    eprintln!("erevos-relay: network listener not written yet");
}
