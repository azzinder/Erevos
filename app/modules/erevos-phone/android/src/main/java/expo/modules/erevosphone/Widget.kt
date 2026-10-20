package expo.modules.erevosphone

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper

/** Erevos's widget on the home screen (modules/erevos-widget), told by its class name to count again. */
internal object Widget {
  /** Has the widget count again, `afterMs` from now: Android writes some changes a moment later. */
  fun refresh(context: Context, afterMs: Long = 0) {
    val app = context.applicationContext
    val intent = Intent("expo.modules.erevoswidget.REFRESH").setClassName(app.packageName, "expo.modules.erevoswidget.ErevosWidget")
    val send = Runnable { runCatching { app.sendBroadcast(intent) } }
    if (afterMs <= 0) send.run() else Handler(Looper.getMainLooper()).postDelayed(send, afterMs)
  }
}
