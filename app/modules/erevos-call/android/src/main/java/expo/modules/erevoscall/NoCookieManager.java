package expo.modules.erevoscall;

import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebView;

// The cookie store React Native's WebSocket and fetch are given instead of Android's (NoCookies.kt):
// it keeps nothing, and loads no WebView. Java, not Kotlin, so it can also cover the store's methods
// that Android leaves out of its public classes, which a Kotlin "override" could not name.
@SuppressWarnings("deprecation")
final class NoCookieManager extends CookieManager {
  @Override
  public void setAcceptCookie(boolean accept) {}

  @Override
  public boolean acceptCookie() {
    return false;
  }

  @Override
  public void setAcceptThirdPartyCookies(WebView webview, boolean accept) {}

  @Override
  public boolean acceptThirdPartyCookies(WebView webview) {
    return false;
  }

  @Override
  public void setCookie(String url, String value) {}

  @Override
  public void setCookie(String url, String value, ValueCallback<Boolean> callback) {
    if (callback != null) callback.onReceiveValue(false);
  }

  @Override
  public String getCookie(String url) {
    return null;
  }

  public String getCookie(String url, boolean privateBrowsing) {
    return null;
  }

  @Override
  public void removeSessionCookie() {}

  @Override
  public void removeSessionCookies(ValueCallback<Boolean> callback) {
    if (callback != null) callback.onReceiveValue(false);
  }

  @Override
  public void removeAllCookie() {}

  @Override
  public void removeAllCookies(ValueCallback<Boolean> callback) {
    if (callback != null) callback.onReceiveValue(false);
  }

  @Override
  public boolean hasCookies() {
    return false;
  }

  public boolean hasCookies(boolean privateBrowsing) {
    return false;
  }

  @Override
  public void removeExpiredCookie() {}

  @Override
  public void flush() {}

  protected boolean allowFileSchemeCookiesImpl() {
    return false;
  }

  protected void setAcceptFileSchemeCookiesImpl(boolean accept) {}
}
