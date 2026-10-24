package expo.modules.erevosviews

import android.util.Log
import android.view.View
import android.view.ViewGroup
import com.facebook.react.ReactPackage
import com.facebook.react.ViewManagerOnDemandReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

// React Native's plain views (View), with one change: a view moved into one of them leaves its
// old place for good. A screen going away (react-native-screens) keeps everything in it drawn
// until its animation ends, even what React Native takes out of it, so Android still counted such
// a view as its old parent's; put in its new parent, Erevos stopped with "The specified child
// already has a parent". Here the old parent lets it go first. Put before React Native's own
// views in MainApplication (plugins/with-movable-views.js), so this is the View that is used.
class MovableViewsPackage : ReactPackage, ViewManagerOnDemandReactPackage {
  override fun getViewManagerNames(reactContext: ReactApplicationContext): Collection<String> =
    listOf(ReactViewManager.REACT_CLASS)

  override fun createViewManager(reactContext: ReactApplicationContext, viewManagerName: String): ViewManager<in Nothing, in Nothing>? =
    if (viewManagerName == ReactViewManager.REACT_CLASS) MovableViewManager() else null

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> =
    listOf(MovableViewManager())
}

class MovableViewManager : ReactViewManager() {
  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    // React Native has already taken it out of its old parent; one that still has it is keeping
    // it for a screen's animation.
    val old = child.parent as? ViewGroup
    if (old != null) {
      Log.w(TAG, "View ${child.id} moved into ${parent.id} while kept by ${old.id} for a screen's animation")
      old.endViewTransition(child)
      letGo(child)
    }
    super.addView(parent, child, index)
  }
}

/**
 * What the screen keeps in the moved view goes where the view goes: what React Native takes out
 * of it from now on is gone at once, and can be put elsewhere.
 */
private fun letGo(view: View) {
  if (view !is ViewGroup) return
  for (i in 0 until view.childCount) {
    val child = view.getChildAt(i)
    view.endViewTransition(child)
    letGo(child)
  }
}

private const val TAG = "ErevosViews"
