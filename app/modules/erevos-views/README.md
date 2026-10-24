# erevos-views

React Native's plain views (`View`, Android's `RCTView`) with one change: a view moved into one of
them leaves its old parent for good.

React Native moves a view to another parent when the view around it starts or stops being drawn on
its own (when it gets or loses a background, a border or an opacity), taking it out of its old
parent first. A screen that is going away (react-native-screens) asks Android to keep everything in
it drawn until its animation ends, even what React Native takes out of it, so Android still counts
such a view as its old parent's, and putting it in its new parent stopped Erevos with
`IllegalStateException: The specified child already has a parent` (in
`ReactClippingViewManager.addView`). Here the old parent lets it go first (`endViewTransition`),
and lets go of what is inside it too, which now goes where the view goes. Each time this happens
it is written to Android's log under `ErevosViews`.

`MovableViewsPackage` gives React Native this `RCTView`. React Native takes each view from the first
package that has it, so `plugins/with-movable-views.js` puts it first in MainApplication, before
React Native's own. There is no JavaScript side. Plain Kotlin on React Native, no other library.
