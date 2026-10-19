package expo.modules.erevosphone

import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.CallEndpoint
import android.telecom.InCallService
import java.util.IdentityHashMap

/**
 * What Telecom binds while Erevos is the phone app and a call is on: it hands every call here, and
 * Erevos shows it (CallActivity, CallNotices). Telecom plays the ringtone itself, each contact's
 * own, and keeps Erevos's process running for as long as the service is bound. A call made shows
 * its screen at once; one that comes shows its notice, which Android turns into the screen over
 * the lock screen or while the screen is off. Not compiled or run yet.
 */
class CallService : InCallService() {
  private val callbacks = IdentityHashMap<Call, Call.Callback>()

  override fun onCreate() {
    super.onCreate()
    Calls.service = this
  }

  override fun onDestroy() {
    if (Calls.service === this) Calls.service = null
    CallNotices.update(this)
    super.onDestroy()
  }

  override fun onCallAdded(call: Call) {
    val callback = object : Call.Callback() {
      override fun onStateChanged(call: Call, state: Int) = Calls.changed()
      override fun onDetailsChanged(call: Call, details: Call.Details) = Calls.changed()
      override fun onParentChanged(call: Call, parent: Call?) = Calls.changed()
      override fun onChildrenChanged(call: Call, children: List<Call>) = Calls.changed()
      override fun onConferenceableCallsChanged(call: Call, conferenceableCalls: List<Call>) = Calls.changed()
      override fun onCannedTextResponsesLoaded(call: Call, cannedTextResponses: List<String>) = Calls.changed()

      // A number with a pause in it ("123,4"): the rest of its tones go on without asking.
      override fun onPostDialWait(call: Call, remainingPostDialSequence: String) {
        call.postDialContinue(true)
      }
    }
    callbacks[call] = callback
    call.registerCallback(callback)
    Calls.add(call)
    if (!Calls.isRinging(call) && call.parent == null) CallActivity.show(this)
  }

  override fun onCallRemoved(call: Call) {
    callbacks.remove(call)?.let { call.unregisterCallback(it) }
    Callers.forget(call)
    Calls.remove(call)
  }

  // Android 14 and later tell where the sound goes with call endpoints too (below); the phones
  // before only with this.
  @Suppress("OVERRIDE_DEPRECATION")
  override fun onCallAudioStateChanged(audioState: CallAudioState) {
    Calls.audioState(audioState)
  }

  override fun onAvailableCallEndpointsChanged(availableEndpoints: List<CallEndpoint>) {
    Calls.endpoints(availableEndpoints)
  }

  override fun onCallEndpointChanged(callEndpoint: CallEndpoint) {
    Calls.endpoint(callEndpoint)
  }

  override fun onMuteStateChanged(isMuted: Boolean) {
    Calls.muteChanged(isMuted)
  }

  override fun onCanAddCallChanged(canAddCall: Boolean) {
    Calls.canAdd = canAddCall
    Calls.changed()
  }

  // The phone asks for the call screen again: the status bar's call chip, or a second press of
  // the phone's call button.
  override fun onBringToForeground(showDialpad: Boolean) {
    CallActivity.show(this)
  }
}
