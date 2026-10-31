// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! Which addresses the relay may connect to when a phone names another relay
//! (`FORWARD`, `FILE_VIA`, and a forward held with `LATER`).
//!
//! A phone gives the other relay's address as text, so without a check it
//! could have this relay connect anywhere this relay can reach and only it:
//! itself on `127.0.0.1`, the machines on its own network, a cloud
//! provider's metadata service on `169.254.169.254`. So the relay resolves
//! the address once, takes only addresses on the public internet, and
//! connects to the one it checked, not to the name again, so a name that
//! resolves elsewhere a moment later changes nothing.
//!
//! An address that is refused is answered as one that cannot be reached
//! (`UNREACHABLE`), as before, so a phone learns nothing new from it.
//!
//! An operator who runs relays on a home or office network, which reach each
//! other at private addresses, allows them with
//! `EREVOS_RELAY_PRIVATE_PEERS=allow`.
//!
//! Not audited.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

/// Whether `ip` is an address on the public internet: not this machine, not
/// a private or shared network, not link-local, multicast, broadcast, set
/// aside for documentation, testing or later use, nor an IPv6 address that
/// stands for an IPv4 address that is any of those.
pub fn global(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => global_v4(ip),
        IpAddr::V6(ip) => global_v6(ip),
    }
}

fn global_v4(ip: Ipv4Addr) -> bool {
    let [a, b, c, _] = ip.octets();
    !(a == 0 // "this network", 0.0.0.0/8
        || a == 10 // private, 10.0.0.0/8
        || (a == 100 && (64..128).contains(&b)) // shared by carriers (CGNAT), 100.64.0.0/10
        || a == 127 // loopback, 127.0.0.0/8
        || (a == 169 && b == 254) // link-local, 169.254.0.0/16
        || (a == 172 && (16..32).contains(&b)) // private, 172.16.0.0/12
        || (a == 192 && b == 0 && c == 0) // protocol assignments, 192.0.0.0/24
        || (a == 192 && b == 0 && c == 2) // documentation, 192.0.2.0/24
        || (a == 192 && b == 88 && c == 99) // 6to4 relays, 192.88.99.0/24
        || (a == 192 && b == 168) // private, 192.168.0.0/16
        || (a == 198 && (18..20).contains(&b)) // benchmarking, 198.18.0.0/15
        || (a == 198 && b == 51 && c == 100) // documentation, 198.51.100.0/24
        || (a == 203 && b == 0 && c == 113) // documentation, 203.0.113.0/24
        || a >= 224) // multicast 224.0.0.0/4, later use 240.0.0.0/4 and broadcast
}

fn global_v6(ip: Ipv6Addr) -> bool {
    let s = ip.segments();
    // IPv4-mapped, ::ffff:0:0/96, and the well-known NAT64 prefix,
    // 64:ff9b::/96: as good as the IPv4 address in them.
    if let Some(v4) = ip.to_ipv4_mapped() {
        return global_v4(v4);
    }
    if s[..6] == [0x64, 0xff9b, 0, 0, 0, 0] {
        return global_v4(embedded_v4(s[6], s[7]));
    }
    // 6to4, 2002::/16, carries the IPv4 address of the far end.
    if s[0] == 0x2002 {
        return global_v4(embedded_v4(s[1], s[2]));
    }
    // Only global unicast, 2000::/3, is on the internet. That leaves out the
    // unspecified address, loopback and IPv4-compatible addresses (::/96),
    // the discard prefix (100::/64), local NAT64 (64:ff9b:1::/48), unique
    // local (fc00::/7), link-local (fe80::/10), site-local (fec0::/10) and
    // multicast (ff00::/8).
    (s[0] & 0xe000) == 0x2000
        // Protocol assignments, 2001::/23, which hold Teredo and benchmarking.
        && !(s[0] == 0x2001 && s[1] < 0x0200)
        // Documentation, 2001:db8::/32 and 3fff::/20.
        && !(s[0] == 0x2001 && s[1] == 0x0db8)
        && !(s[0] == 0x3fff && s[1] < 0x1000)
}

fn embedded_v4(high: u16, low: u16) -> Ipv4Addr {
    let [a, b] = high.to_be_bytes();
    let [c, d] = low.to_be_bytes();
    Ipv4Addr::new(a, b, c, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn is_global(text: &str) -> bool {
        global(text.parse().unwrap())
    }

    #[test]
    fn addresses_on_the_internet_are_taken() {
        for text in [
            "1.1.1.1",
            "8.8.8.8",
            "93.184.216.34",
            "100.63.255.255",
            "100.128.0.0",
            "172.15.255.255",
            "172.32.0.0",
            "192.0.1.1",
            "192.169.0.1",
            "198.17.255.255",
            "198.20.0.0",
            "223.255.255.255",
            "2606:4700:4700::1111",
            "2a00:1450:4001:80b::200e",
            "2001:4860:4860::8888",
            "::ffff:8.8.8.8",
            "64:ff9b::808:808",
            "2002:808:808::1",
        ] {
            assert!(is_global(text), "{text} should be taken");
        }
    }

    #[test]
    fn addresses_off_the_internet_are_refused() {
        for text in [
            "0.0.0.0",
            "0.1.2.3",
            "10.0.0.1",
            "10.255.255.255",
            "100.64.0.1",
            "100.127.255.255",
            "127.0.0.1",
            "127.255.0.1",
            "169.254.169.254",
            "172.16.0.1",
            "172.31.255.255",
            "192.0.0.1",
            "192.0.0.170",
            "192.0.2.1",
            "192.88.99.1",
            "192.168.1.10",
            "198.18.0.1",
            "198.19.255.255",
            "198.51.100.7",
            "203.0.113.7",
            "224.0.0.1",
            "239.255.255.250",
            "240.0.0.1",
            "255.255.255.255",
            "::",
            "::1",
            "::127.0.0.1",
            "::8.8.8.8",
            "::ffff:127.0.0.1",
            "::ffff:10.0.0.1",
            "::ffff:169.254.169.254",
            "::ffff:192.168.0.1",
            "::ffff:0.0.0.0",
            "64:ff9b::7f00:1",
            "64:ff9b::a9fe:a9fe",
            "64:ff9b:1::808:808",
            "2002:7f00:1::1",
            "2002:c0a8:101::1",
            "100::1",
            "fc00::1",
            "fd12:3456:789a::1",
            "fe80::1",
            "febf::1",
            "fec0::1",
            "ff02::1",
            "ff0e::1",
            "2001::1",
            "2001:2::1",
            "2001:1ff::1",
            "2001:db8::1",
            "3fff::1",
            "4000::1",
        ] {
            assert!(!is_global(text), "{text} should be refused");
        }
    }
}
