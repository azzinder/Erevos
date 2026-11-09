# SPDX-FileCopyrightText: 2026 azzinder
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

Name:       erevos
Summary:    Private chats and encrypted files
Version:    0.0.1
Release:    1
License:    AGPLv3+
URL:        https://github.com/azzinder/Erevos
Source0:    %{name}-%{version}.tar.bz2
Requires:   sailfishsilica-qt5 >= 0.10.9
Requires:   sailfish-components-webview-qt5
Requires:   sailfish-components-webview-qt5-popups
BuildRequires:  pkgconfig(sailfishapp) >= 1.0.2
BuildRequires:  pkgconfig(Qt5Core)
BuildRequires:  pkgconfig(Qt5Qml)
BuildRequires:  pkgconfig(Qt5Quick)
BuildRequires:  pkgconfig(Qt5Network)
BuildRequires:  pkgconfig(Qt5DBus)
BuildRequires:  pkgconfig(libcrypto)
BuildRequires:  pkgconfig(keepalive)
BuildRequires:  pkgconfig(nemonotifications-qt5)
BuildRequires:  pkgconfig(ngf-qt5)
BuildRequires:  desktop-file-utils

%description
Erevos, a messenger built for privacy: the app's web build, with its
end-to-end encryption core in WebAssembly, in Sailfish WebView. While it
is not in front, or closed, its helper erevos-watch waits at the relay
and says how many messages came, and rings for a call.

%prep
%setup -q -n %{name}-%{version}

%build
%qmake5
%make_build
# The helper that waits at the relay while Erevos is closed (watch/).
cd watch
%qmake5
%make_build

%install
%qmake5_install
cd watch
%qmake5_install
cd ..

desktop-file-install --delete-original \
  --dir %{buildroot}%{_datadir}/applications \
   %{buildroot}%{_datadir}/applications/*.desktop

%files
%defattr(-,root,root,-)
%{_bindir}/%{name}
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/*/apps/%{name}.png
%{_bindir}/erevos-watch
%{_datadir}/dbus-1/services/app.erevos.service
%{_datadir}/dbus-1/services/app.erevos.watch.service
/usr/lib/systemd/user/erevos-watch.service
%{_datadir}/lipstick/notificationcategories/x-erevos.message.conf
%{_datadir}/lipstick/notificationcategories/x-erevos.call.conf
