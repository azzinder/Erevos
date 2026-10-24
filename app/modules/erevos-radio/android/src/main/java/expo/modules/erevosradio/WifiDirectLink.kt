package expo.modules.erevosradio

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pGroup
import android.net.wifi.p2p.WifiP2pManager
import android.net.wifi.p2p.nsd.WifiP2pDnsSdServiceInfo
import android.net.wifi.p2p.nsd.WifiP2pDnsSdServiceRequest
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.security.SecureRandom

/**
 * Wi-Fi Direct between Erevos phones with no Wi-Fi in common: a small Wi-Fi of their own, faster
 * than Bluetooth, on which LanLink finds and links them as on any Wi-Fi, and a call goes straight
 * between them.
 *
 * Each phone says by Wi-Fi Direct service discovery (DNS-SD, `_erevos._tcp`) that Erevos is
 * there, with LanLink's random nonce, the same pseudo-identifier its broadcasts carry. Of two that
 * hear each other and are not linked yet, the lower nonce makes a group with a random name and
 * passphrase and says them the same way; the other joins with them, which Android 10 and later
 * allow with no question to the user, as does any other that hears of the group. Anyone near can hear that and join too, as on an open
 * Wi-Fi: they get only what LanLink gives anyone, sealed packets. A group no one is in, or one
 * that brought no link, is let go, and that phone is left alone a while.
 *
 * Only groups this made or joined are ever removed, so another app's Wi-Fi Direct is left as it
 * is: while one is up, this makes and joins none. `quiet`, while Erevos is in the background: it
 * looks every QUIET_LOOK_MS, not every LOOK_MS, as a look keeps the Wi-Fi searching for two minutes.
 */
@SuppressLint("MissingPermission")
class WifiDirectLink(
  private val context: Context,
  private val lan: LanLink,
  private val onLog: (text: String) -> Unit,
) {
  private val main = Handler(Looper.getMainLooper())
  private val manager: WifiP2pManager? = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
  private val random = SecureRandom()

  // Main looper only.
  private var channel: WifiP2pManager.Channel? = null
  private var running = false
  private var quiet = false
  private var lastLook = 0L
  private var said: Map<String, String>? = null
  // The group this phone made (its name and passphrase), and since when it is kept without anyone in it.
  private var made: Pair<String, String>? = null
  private var madeAt = 0L
  // The phone whose group this one joined (its nonce), and since when it is kept without a link.
  private var joined: String? = null
  private var joinedAt = 0L
  // Phones not tried again until a time, by nonce.
  private val resting = HashMap<String, Long>()

  fun start() {
    main.post { startOnMain() }
  }

  fun stop() {
    main.post { stopOnMain() }
  }

  fun setQuiet(on: Boolean) {
    main.post { quiet = on }
  }

  private val tick = object : Runnable {
    override fun run() {
      if (!running) return
      val now = System.currentTimeMillis()
      // LanLink's nonce changes when it starts again.
      say(made)
      if (now - lastLook >= if (quiet) QUIET_LOOK_MS else LOOK_MS) {
        lastLook = now
        look()
      }
      check(now)
      main.postDelayed(this, TICK_MS)
    }
  }

  private fun startOnMain() {
    if (running) return
    val wifi = manager
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || wifi == null) {
      onLog("Wi-Fi Direct: not on this phone")
      return
    }
    val opened = try {
      wifi.initialize(context, Looper.getMainLooper()) {
        // Android let go of the channel: opened again a little later.
        channel = null
        if (running) main.postDelayed({ if (running) reopen() }, REOPEN_MS)
      }
    } catch (e: SecurityException) {
      onLog("Wi-Fi Direct needs a permission: ${e.message}")
      null
    } ?: return
    running = true
    channel = opened
    wifi.setDnsSdResponseListeners(opened, null) { _, record, _ -> heard(record) }
    wifi.addServiceRequest(opened, WifiP2pDnsSdServiceRequest.newInstance(SERVICE_TYPE), quietly("Wi-Fi Direct cannot look"))
    lastLook = 0L
    said = null
    main.post(tick)
  }

  private fun reopen() {
    stopOnMain()
    startOnMain()
  }

  private fun stopOnMain() {
    running = false
    main.removeCallbacks(tick)
    val wifi = manager ?: return
    val open = channel ?: return
    if (made != null || joined != null) wifi.removeGroup(open, quietly(null))
    made = null
    joined = null
    said = null
    wifi.clearLocalServices(open, quietly(null))
    wifi.clearServiceRequests(open, quietly(null))
    wifi.stopPeerDiscovery(open, quietly(null))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) open.close()
    channel = null
  }

  // Looking for Erevos phones also lets them find this one.
  private fun look() {
    val wifi = manager ?: return
    val open = channel ?: return
    try {
      wifi.discoverPeers(open, quietly(null))
      wifi.discoverServices(open, quietly("Wi-Fi Direct cannot look"))
    } catch (e: SecurityException) {
      onLog("Wi-Fi Direct needs a permission: ${e.message}")
    }
  }

  // What this phone says: its nonce, and its group's name and passphrase while it has one.
  private fun say(group: Pair<String, String>?) {
    val wifi = manager ?: return
    val open = channel ?: return
    val ours = lan.ownNonce() ?: return
    val record = HashMap<String, String>()
    record["v"] = "1"
    record["n"] = ours
    if (group != null) {
      record["g"] = group.first
      record["p"] = group.second
    }
    if (record == said) return
    said = record
    val service = WifiP2pDnsSdServiceInfo.newInstance("erevos", SERVICE_TYPE, record)
    wifi.clearLocalServices(
      open,
      object : WifiP2pManager.ActionListener {
        override fun onSuccess() = wifi.addLocalService(open, service, quietly("Wi-Fi Direct cannot say it is here"))

        override fun onFailure(reason: Int) = wifi.addLocalService(open, service, quietly("Wi-Fi Direct cannot say it is here"))
      },
    )
  }

  private fun heard(record: Map<String, String>) {
    if (!running) return
    val theirs = record["n"]?.takeIf { NONCE.matches(it) } ?: return
    val ours = lan.ownNonce() ?: return
    if (theirs == ours || lan.linkedTo(theirs) || made != null || joined != null) return
    val now = System.currentTimeMillis()
    if ((resting[theirs] ?: 0L) > now) return
    // A group they have already is joined; otherwise the lower nonce makes one.
    val name = record["g"]?.takeIf { GROUP_NAME.matches(it) }
    val passphrase = record["p"]?.takeIf { PASSPHRASE.matches(it) }
    if (name != null && passphrase != null) join(theirs, name, passphrase, now) else if (ours < theirs) makeGroup(now)
  }

  private fun makeGroup(now: Long) {
    val wifi = manager ?: return
    val open = channel ?: return
    val group = "DIRECT-ev-${hex(3)}" to hex(12)
    val config = WifiP2pConfig.Builder()
      .setNetworkName(group.first)
      .setPassphrase(group.second)
      .enablePersistentMode(false)
      .build()
    made = group
    madeAt = now
    wifi.createGroup(
      open,
      config,
      object : WifiP2pManager.ActionListener {
        override fun onSuccess() {
          onLog("Wi-Fi Direct: a group for Erevos phones nearby")
          say(group)
        }

        override fun onFailure(reason: Int) {
          if (made == group) made = null
          onLog("Wi-Fi Direct: no group ($reason)")
        }
      },
    )
  }

  private fun join(theirs: String, name: String, passphrase: String, now: Long) {
    val wifi = manager ?: return
    val open = channel ?: return
    val config = WifiP2pConfig.Builder()
      .setNetworkName(name)
      .setPassphrase(passphrase)
      .enablePersistentMode(false)
      .build()
    joined = theirs
    joinedAt = now
    wifi.connect(
      open,
      config,
      object : WifiP2pManager.ActionListener {
        override fun onSuccess() = onLog("Wi-Fi Direct: joining an Erevos phone's group")

        override fun onFailure(reason: Int) {
          if (joined == theirs) joined = null
          rest(theirs)
          onLog("Wi-Fi Direct: cannot join ($reason)")
        }
      },
    )
  }

  // A group kept while someone is in it, or while it brought a link; otherwise let go.
  private fun check(now: Long) {
    val wifi = manager ?: return
    val open = channel ?: return
    if (made == null && joined == null) return
    wifi.requestGroupInfo(open) { group: WifiP2pGroup? ->
      val mine = made
      val theirs = joined
      if (mine != null) {
        when {
          group == null || group.networkName != mine.first -> if (now - madeAt > SETTLE_MS) forget("the group is gone")
          group.clientList.isNotEmpty() -> madeAt = now
          now - madeAt > EMPTY_FOR_MS -> letGo("no one is in it")
        }
      } else if (theirs != null) {
        when {
          lan.linkedTo(theirs) -> joinedAt = now
          group == null && now - joinedAt > SETTLE_MS -> {
            rest(theirs)
            forget("not in the group")
          }
          now - joinedAt > NO_LINK_FOR_MS -> {
            rest(theirs)
            letGo("no link through it")
          }
        }
      }
    }
  }

  private fun letGo(why: String) {
    val wifi = manager
    val open = channel
    if (wifi != null && open != null) wifi.removeGroup(open, quietly(null))
    forget(why)
  }

  private fun forget(why: String) {
    made = null
    joined = null
    say(null)
    onLog("Wi-Fi Direct: let go, $why")
  }

  private fun rest(theirs: String) {
    val now = System.currentTimeMillis()
    resting.entries.removeIf { it.value < now }
    resting[theirs] = now + REST_MS
  }

  private fun hex(bytes: Int): String = ByteArray(bytes).also { random.nextBytes(it) }.joinToString("") { "%02x".format(it) }

  private fun quietly(what: String?) = object : WifiP2pManager.ActionListener {
    override fun onSuccess() = Unit

    override fun onFailure(reason: Int) {
      if (what != null) onLog("$what ($reason)")
    }
  }

  companion object {
    private const val SERVICE_TYPE = "_erevos._tcp"
    private const val TICK_MS = 10_000L
    private const val LOOK_MS = 30_000L
    private const val QUIET_LOOK_MS = 10 * 60_000L
    private const val REOPEN_MS = 5_000L
    // How long a group may take to come up, stay with no one in it, or stay joined with no link.
    private const val SETTLE_MS = 20_000L
    private const val EMPTY_FOR_MS = 90_000L
    private const val NO_LINK_FOR_MS = 60_000L
    private const val REST_MS = 5 * 60_000L
    private val NONCE = Regex("[0-9a-f]{16}")
    private val GROUP_NAME = Regex("DIRECT-ev-[0-9a-f]{6}")
    private val PASSPHRASE = Regex("[0-9a-f]{24}")
  }
}
