// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

//! One OMEMO call from the command line, for checking against other OMEMO
//! libraries (docs/xmpp.md): the JSON request as the first argument, the
//! answer on standard output.

fn main() {
    let request = std::env::args().nth(1).expect("a JSON request");
    match erevos_xmpp::call(request.as_bytes()) {
        Ok(answer) => println!("{}", String::from_utf8_lossy(&answer)),
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    }
}
