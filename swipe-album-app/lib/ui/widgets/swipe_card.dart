import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../logic/swipe_logic.dart';

typedef SwipeLabelBuilder = Widget? Function(SwipeDir dir, double strength);

/// A Tinder-style card that can be dragged in four directions.
///
/// Drag past a threshold (or fling) to commit; otherwise it springs back.
/// [SwipeCardState.fling] lets buttons trigger the same animation.
class SwipeCard extends StatefulWidget {
  const SwipeCard({
    super.key,
    required this.child,
    required this.onSwiped,
    required this.labelBuilder,
    this.enabled = true,
  });

  final Widget child;
  final ValueChanged<SwipeDir> onSwiped;
  final SwipeLabelBuilder labelBuilder;
  final bool enabled;

  @override
  State<SwipeCard> createState() => SwipeCardState();
}

class SwipeCardState extends State<SwipeCard> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  Offset _offset = Offset.zero;
  Animation<Offset>? _animation;
  bool _committed = false;
  Size _size = Size.zero;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (_animation != null) setState(() => _offset = _animation!.value);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Offset _exitOffset(SwipeDir dir) {
    final double w = _size.width == 0 ? 400 : _size.width;
    final double h = _size.height == 0 ? 700 : _size.height;
    return switch (dir) {
      SwipeDir.left => Offset(-w * 1.6, _offset.dy),
      SwipeDir.right => Offset(w * 1.6, _offset.dy),
      SwipeDir.up => Offset(_offset.dx, -h * 1.4),
      SwipeDir.down => Offset(_offset.dx, h * 1.4),
    };
  }

  Future<void> _animateTo(Offset target, {Curve curve = Curves.easeOut}) async {
    _animation = Tween<Offset>(begin: _offset, end: target)
        .animate(CurvedAnimation(parent: _controller, curve: curve));
    _controller.reset();
    await _controller.forward();
  }

  /// Animate the card out programmatically (action buttons).
  Future<void> fling(SwipeDir dir) async {
    if (_committed || !mounted) return;
    _committed = true;
    HapticFeedback.lightImpact();
    await _animateTo(_exitOffset(dir), curve: Curves.easeIn);
    widget.onSwiped(dir);
  }

  void _onPanUpdate(DragUpdateDetails d) {
    if (_committed || !widget.enabled) return;
    setState(() => _offset += d.delta);
  }

  Future<void> _onPanEnd(DragEndDetails d) async {
    if (_committed || !widget.enabled) return;
    final SwipeDir? dir = resolveSwipe(
      delta: _offset,
      velocity: d.velocity.pixelsPerSecond,
      cardSize: _size,
    );
    if (dir == null) {
      await _animateTo(Offset.zero, curve: Curves.elasticOut);
      return;
    }
    await fling(dir);
  }

  SwipeDir? get _dragDir {
    if (_offset == Offset.zero) return null;
    if (_offset.dx.abs() >= _offset.dy.abs()) {
      return _offset.dx > 0 ? SwipeDir.right : SwipeDir.left;
    }
    return _offset.dy < 0 ? SwipeDir.up : SwipeDir.down;
  }

  double get _strength {
    final SwipeDir? dir = _dragDir;
    if (dir == null || _size == Size.zero) return 0;
    final double dist = (dir == SwipeDir.left || dir == SwipeDir.right)
        ? _offset.dx.abs() / (_size.width * 0.25)
        : _offset.dy.abs() / (_size.height * 0.18);
    return dist.clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (BuildContext context, BoxConstraints c) {
      _size = Size(c.maxWidth, c.maxHeight);
      final double angle = (_offset.dx / math.max(1, _size.width)) * 0.35;
      final SwipeDir? dir = _dragDir;
      final Widget? label = dir == null ? null : widget.labelBuilder(dir, _strength);
      return GestureDetector(
        onPanUpdate: _onPanUpdate,
        onPanEnd: _onPanEnd,
        child: Transform.translate(
          offset: _offset,
          child: Transform.rotate(
            angle: angle,
            child: Stack(
              fit: StackFit.expand,
              children: <Widget>[
                widget.child,
                if (label != null) IgnorePointer(child: label),
              ],
            ),
          ),
        ),
      );
    });
  }
}
