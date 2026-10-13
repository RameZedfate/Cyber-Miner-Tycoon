import 'dart:ui' show Offset, Size;

enum SwipeDir { left, right, up, down }

/// What a swipe means. [favorite] keeps the item and also hearts it.
enum SwipeAction { keep, delete, maybe, favorite }

/// Maps a swipe direction to an action.
///
/// Default layout follows dating apps and most competitors:
/// right = keep, left = delete. Users can flip it in Settings.
SwipeAction actionFor(SwipeDir dir, {required bool rightIsKeep}) {
  switch (dir) {
    case SwipeDir.up:
      return SwipeAction.maybe;
    case SwipeDir.down:
      return SwipeAction.favorite;
    case SwipeDir.right:
      return rightIsKeep ? SwipeAction.keep : SwipeAction.delete;
    case SwipeDir.left:
      return rightIsKeep ? SwipeAction.delete : SwipeAction.keep;
  }
}

/// Inverse of [actionFor], used to animate a card when a button is tapped.
SwipeDir dirFor(SwipeAction action, {required bool rightIsKeep}) {
  switch (action) {
    case SwipeAction.maybe:
      return SwipeDir.up;
    case SwipeAction.favorite:
      return SwipeDir.down;
    case SwipeAction.keep:
      return rightIsKeep ? SwipeDir.right : SwipeDir.left;
    case SwipeAction.delete:
      return rightIsKeep ? SwipeDir.left : SwipeDir.right;
  }
}

/// Decides whether a finished drag counts as a swipe.
///
/// A drag commits when it travels far enough (a fraction of the card size)
/// or is flung fast enough. The dominant axis wins so diagonal drags are
/// never ambiguous. Returns null when the card should spring back.
SwipeDir? resolveSwipe({
  required Offset delta,
  required Offset velocity,
  required Size cardSize,
  double horizontalFraction = 0.25,
  double verticalFraction = 0.18,
  double flingVelocity = 900,
}) {
  final double dx = delta.dx;
  final double dy = delta.dy;
  final bool horizontal = dx.abs() >= dy.abs();

  if (horizontal) {
    final bool far = dx.abs() > cardSize.width * horizontalFraction;
    final bool fling =
        velocity.dx.abs() > flingVelocity && velocity.dx.sign == dx.sign;
    if (dx != 0 && (far || fling)) {
      return dx > 0 ? SwipeDir.right : SwipeDir.left;
    }
  } else {
    final bool far = dy.abs() > cardSize.height * verticalFraction;
    final bool fling =
        velocity.dy.abs() > flingVelocity && velocity.dy.sign == dy.sign;
    if (dy != 0 && (far || fling)) {
      return dy < 0 ? SwipeDir.up : SwipeDir.down;
    }
  }
  return null;
}
