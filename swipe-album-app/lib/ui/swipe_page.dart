import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:video_player/video_player.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../logic/formatters.dart';
import '../logic/swipe_logic.dart';
import '../services/video_service.dart';
import '../state/app_state.dart';
import 'trash_page.dart';
import 'widgets/asset_thumb.dart';
import 'widgets/swipe_card.dart';

/// The core experience: one card at a time, swipe to decide.
class SwipePage extends StatefulWidget {
  const SwipePage({
    super.key,
    required this.title,
    required this.assets,
    this.include = const <Decision>{},
    this.month,
  });

  final String title;
  final List<AssetEntity> assets;

  /// Besides undecided items, also show items with these decisions
  /// (e.g. {Decision.maybe} when re-swiping the maybe pile).
  final Set<Decision> include;

  /// Set when sorting a month, to award "month_done" on completion.
  final MonthKey? month;

  @override
  State<SwipePage> createState() => _SwipePageState();
}

class _SwipePageState extends State<SwipePage> {
  late final AppServices _s = AppScope.of(context);
  late final List<AssetEntity> _deck;
  int _index = 0;
  final List<SwipeRecord> _history = <SwipeRecord>[];
  int _kept = 0;
  int _deleted = 0;
  bool _busy = false;
  bool _askedManageMedia = false;
  GlobalKey<SwipeCardState> _cardKey = GlobalKey<SwipeCardState>();
  bool _initialised = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialised) return;
    _initialised = true;
    final AppState state = _s.state;
    _deck = widget.assets.where((AssetEntity a) {
      final Decision? d = state.decisionOf(a.id);
      return d == null || widget.include.contains(d);
    }).toList();
    _precacheAhead();
  }

  AssetEntity? get _current => _index < _deck.length ? _deck[_index] : null;

  void _precacheAhead() {
    for (int i = _index + 1; i <= _index + 2 && i < _deck.length; i++) {
      // A missing thumbnail just shows the placeholder later; don't log it.
      precacheImage(AssetThumbProvider.large(_deck[i]), context,
          onError: (Object _, StackTrace? _) {});
    }
  }

  // ------------------------------------------------------------- actions
  Future<void> _onSwiped(SwipeDir dir) async {
    final AssetEntity? asset = _current;
    if (asset == null) return;
    final S s = S.of(context);
    final AppState state = _s.state;
    final SwipeAction action = actionFor(dir, rightIsKeep: state.rightIsKeep);
    if (action == SwipeAction.delete) HapticFeedback.mediumImpact();

    final SwipeRecord record = state.applySwipe(asset.id, action);
    _history.add(record);
    setState(() {
      if (action == SwipeAction.keep || action == SwipeAction.favorite) _kept++;
      if (action == SwipeAction.delete) _deleted++;
      _index++;
      _cardKey = GlobalKey<SwipeCardState>();
    });
    _precacheAhead();

    if (action == SwipeAction.favorite) {
      await _maybeAskManageMedia();
      final bool ok = await _s.library.setFavorite(asset, true);
      if (!ok && mounted) _toast(s.favoriteFailed);
    }

    _showFreshAchievements();
    if (_current == null) _onDeckFinished();
    await _maybeShowAd();
  }

  Future<void> _maybeShowAd() async {
    final AppState state = _s.state;
    if (!_s.adGate.isDue(
        swipesSinceAd: state.swipesSinceAd, adsRemoved: state.adsRemoved)) {
      return;
    }
    setState(() => _busy = true);
    final bool shown = await _s.ads.show();
    if (shown) state.markAdShown();
    if (mounted) setState(() => _busy = false);
  }

  void _undo() {
    if (_history.isEmpty || _busy) return;
    final SwipeRecord r = _history.removeLast();
    _s.state.undo(r);
    final AssetEntity asset = _deck[_index - 1];
    if (r.action == SwipeAction.favorite) _s.library.setFavorite(asset, false);
    setState(() {
      if (r.action == SwipeAction.keep || r.action == SwipeAction.favorite) _kept--;
      if (r.action == SwipeAction.delete) _deleted--;
      _index--;
      _cardKey = GlobalKey<SwipeCardState>();
    });
  }

  void _tap(SwipeAction action) {
    if (_busy) return;
    _cardKey.currentState
        ?.fling(dirFor(action, rightIsKeep: _s.state.rightIsKeep));
  }

  Future<void> _maybeAskManageMedia() async {
    if (_askedManageMedia || !Platform.isAndroid) return;
    _askedManageMedia = true;
    if (await _s.library.androidSdk() < 31 || await _s.library.canManageMedia()) {
      return;
    }
    if (!mounted) return;
    final S s = S.of(context);
    final bool? grant = await showDialog<bool>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: Text(s.manageMediaTitle),
        content: Text(s.manageMediaBody),
        actions: <Widget>[
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(s.notNow)),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(s.grant)),
        ],
      ),
    );
    if (grant == true) await _s.library.requestManageMedia();
  }

  void _showFreshAchievements() {
    final S s = S.of(context);
    for (final String id in _s.state.takeFreshAchievements()) {
      _toast(s.achievementUnlocked(s.achievementName(id)));
    }
  }

  void _onDeckFinished() {
    _armReminder();
    final MonthKey? month = widget.month;
    if (month == null) return;
    final List<AssetEntity> all = _s.library.byMonth[month] ?? <AssetEntity>[];
    final bool done = all.every((AssetEntity a) => _s.state.decisionOf(a.id) != null);
    if (done) {
      _s.state.unlock('month_done');
      _showFreshAchievements();
    }
  }

  /// Ask for notification permission at a happy moment (a finished deck),
  /// not on first launch.
  Future<void> _armReminder() async {
    if (!_s.state.reminderOn) return;
    final S s = S.of(context);
    try {
      await _s.notifications.requestPermission();
      await _s.notifications.scheduleDaily(title: s.reminderTitle, body: s.reminderBody);
    } catch (_) {
      // Reminders are optional; never block the flow.
    }
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(text),
        duration: const Duration(seconds: 2),
        // Float above the action buttons so Undo/Keep/Delete stay tappable.
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 150),
      ));
  }

  // ------------------------------------------------------------- album
  Future<void> _addToAlbum() async {
    final AssetEntity? asset = _current;
    if (asset == null) return;
    final S s = S.of(context);
    final List<AssetPathEntity> albums = await _s.library.userAlbums();
    if (!mounted) return;
    final Object? picked = await showModalBottomSheet<Object>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext c) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: <Widget>[
            if (Platform.isIOS)
              ListTile(
                leading: const Icon(Icons.add),
                title: Text(s.newAlbum),
                onTap: () => Navigator.pop(c, 'new'),
              ),
            for (final AssetPathEntity a in albums)
              ListTile(
                leading: const Icon(Icons.photo_album_outlined),
                title: Text(a.name),
                onTap: () => Navigator.pop(c, a),
              ),
          ],
        ),
      ),
    );
    AssetPathEntity? target;
    if (picked == 'new') {
      final String? name = await _askAlbumName();
      if (name == null || name.isEmpty) return;
      target = await _s.library.createAlbum(name);
    } else if (picked is AssetPathEntity) {
      target = picked;
    }
    if (target == null || !mounted) return;
    final bool ok = await _s.library.addToAlbum(asset, target);
    if (mounted) _toast(ok ? s.addedToAlbum(target.name) : s.addFailed);
  }

  Future<String?> _askAlbumName() {
    final S s = S.of(context);
    final TextEditingController ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (BuildContext c) => AlertDialog(
        title: Text(s.newAlbum),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: InputDecoration(hintText: s.albumName),
        ),
        actions: <Widget>[
          TextButton(onPressed: () => Navigator.pop(c), child: Text(s.cancel)),
          FilledButton(
              onPressed: () => Navigator.pop(c, ctrl.text.trim()),
              child: Text(s.create)),
        ],
      ),
    );
  }

  // ---------------------------------------------------------- compress
  Future<void> _compress() async {
    final AssetEntity? asset = _current;
    if (asset == null || asset.type != AssetType.video || _busy) return;
    final S s = S.of(context);
    setState(() => _busy = true);
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext c) => AlertDialog(
        content: Row(children: <Widget>[
          const CircularProgressIndicator(),
          const SizedBox(width: 20),
          Expanded(child: Text(s.compressing)),
        ]),
      ),
    );
    CompressResult? result;
    try {
      result = await _s.video.compressAndSave(asset);
    } catch (_) {
      result = null;
    }
    if (!mounted) return;
    Navigator.of(context).pop();
    if (result == null) {
      _toast(s.compressFailed);
    } else if (result.bytesSaved <= 0) {
      _toast(s.compressNoGain);
    } else {
      _s.library.remember(result.saved);
      _s.state.setDecision(result.saved.id, Decision.keep);
      _s.state.setDecision(asset.id, Decision.pendingDelete);
      _history.clear(); // the saved copy can't be "un-swiped"
      _toast(s.compressDone(formatBytes(result.bytesSaved)));
      setState(() {
        _deleted++;
        _index++;
        _cardKey = GlobalKey<SwipeCardState>();
      });
      if (_current == null) _onDeckFinished();
    }
    setState(() => _busy = false);
  }

  // ------------------------------------------------------------------ UI
  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final AssetEntity? current = _current;
    final AssetEntity? next = _index + 1 < _deck.length ? _deck[_index + 1] : null;
    final bool rightIsKeep = _s.state.rightIsKeep;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(widget.title, style: const TextStyle(fontSize: 17)),
            if (_deck.isNotEmpty)
              Text('${(_index + 1).clamp(1, _deck.length)} / ${_deck.length}',
                  style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: <Widget>[
          if (current?.type == AssetType.video)
            IconButton(
              tooltip: s.compressKeep,
              icon: const Icon(Icons.compress),
              onPressed: _busy ? null : _compress,
            ),
          if (current != null)
            IconButton(
              tooltip: s.addToAlbum,
              icon: const Icon(Icons.playlist_add),
              onPressed: _busy ? null : _addToAlbum,
            ),
        ],
      ),
      body: SafeArea(
        child: current == null
            ? _DoneView(kept: _kept, deleted: _deleted, empty: _deck.isEmpty)
            : Column(
                children: <Widget>[
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                      child: Stack(
                        fit: StackFit.expand,
                        children: <Widget>[
                          if (next != null)
                            Transform.scale(
                              scale: 0.94,
                              child: _AssetCard(asset: next, interactive: false),
                            ),
                          SwipeCard(
                            key: _cardKey,
                            enabled: !_busy,
                            onSwiped: _onSwiped,
                            labelBuilder: (SwipeDir dir, double strength) => _StampLabel(
                              action: actionFor(dir, rightIsKeep: rightIsKeep),
                              strength: strength,
                            ),
                            child: _AssetCard(
                                key: ValueKey<String>(current.id), asset: current),
                          ),
                        ],
                      ),
                    ),
                  ),
                  _ActionBar(
                    rightIsKeep: rightIsKeep,
                    canUndo: _history.isNotEmpty,
                    onUndo: _undo,
                    onAction: _tap,
                  ),
                  if (!_s.state.adsRemoved)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        s.adIn(_s.adGate.remaining(swipesSinceAd: _s.state.swipesSinceAd)),
                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

/// Full photo/video card with date, size and iCloud badges.
class _AssetCard extends StatefulWidget {
  const _AssetCard({super.key, required this.asset, this.interactive = true});

  final AssetEntity asset;
  final bool interactive;

  @override
  State<_AssetCard> createState() => _AssetCardState();
}

class _AssetCardState extends State<_AssetCard> {
  VideoPlayerController? _video;
  bool _loadingVideo = false;
  Future<int>? _size;
  Future<bool>? _cloud;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.interactive && _size == null) {
      final AppServices s = AppScope.of(context);
      _size = s.library.fileSize(widget.asset);
      _cloud = s.library.isCloudOnly(widget.asset);
    }
  }

  @override
  void dispose() {
    _video?.dispose();
    super.dispose();
  }

  Future<void> _toggleVideo() async {
    final VideoPlayerController? v = _video;
    if (v != null) {
      v.value.isPlaying ? await v.pause() : await v.play();
      setState(() {});
      return;
    }
    setState(() => _loadingVideo = true);
    final File? file = await widget.asset.file;
    if (file == null || !mounted) {
      setState(() => _loadingVideo = false);
      return;
    }
    final VideoPlayerController c = VideoPlayerController.file(file);
    await c.initialize();
    await c.setLooping(true);
    if (!mounted) {
      await c.dispose();
      return;
    }
    setState(() {
      _video = c;
      _loadingVideo = false;
    });
    await c.play();
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final AssetEntity a = widget.asset;
    final VideoPlayerController? v = _video;
    final bool isVideo = a.type == AssetType.video;
    final String date = DateFormat.yMMMEd(s.locale).add_Hm().format(a.createDateTime);

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: ColoredBox(
        color: const Color(0xFF151515),
        child: Stack(
          fit: StackFit.expand,
          children: <Widget>[
            if (v != null && v.value.isInitialized)
              Center(
                child: AspectRatio(aspectRatio: v.value.aspectRatio, child: VideoPlayer(v)),
              )
            else
              Image(
                image: AssetThumbProvider.large(a),
                fit: BoxFit.contain,
                gaplessPlayback: true,
                errorBuilder: (_, _, _) =>
                    const Icon(Icons.broken_image_outlined, color: Colors.white38, size: 64),
              ),
            if (isVideo && widget.interactive)
              Center(
                child: _loadingVideo
                    ? const CircularProgressIndicator()
                    : IconButton(
                        iconSize: 64,
                        color: Colors.white.withValues(alpha: 0.85),
                        icon: Icon(v != null && v.value.isPlaying
                            ? Icons.pause_circle_filled
                            : Icons.play_circle_fill),
                        onPressed: _toggleVideo,
                      ),
              ),
            if (widget.interactive)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(16, 32, 16, 14),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: <Color>[Colors.transparent, Colors.black87],
                    ),
                  ),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: <Widget>[
                      Text(date, style: const TextStyle(color: Colors.white, fontSize: 15)),
                      if (isVideo) _Badge(formatDuration(a.videoDuration), Icons.videocam),
                      FutureBuilder<int>(
                        future: _size,
                        builder: (_, AsyncSnapshot<int> snap) =>
                            (snap.data ?? 0) > 0
                                ? _Badge(formatBytes(snap.data!), Icons.sd_storage_outlined)
                                : const SizedBox.shrink(),
                      ),
                      FutureBuilder<bool>(
                        future: _cloud,
                        builder: (_, AsyncSnapshot<bool> snap) => snap.data == true
                            ? const _Badge('iCloud', Icons.cloud_outlined)
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.text, this.icon);
  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white24,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: <Widget>[
        Icon(icon, size: 14, color: Colors.white),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ]),
    );
  }
}

Color colorFor(SwipeAction a) => switch (a) {
      SwipeAction.keep => const Color(0xFF2ECC71),
      SwipeAction.delete => const Color(0xFFFF4D4F),
      SwipeAction.maybe => const Color(0xFFFFB020),
      SwipeAction.favorite => const Color(0xFFFF5FA2),
    };

String labelFor(S s, SwipeAction a) => switch (a) {
      SwipeAction.keep => s.keep,
      SwipeAction.delete => s.delete,
      SwipeAction.maybe => s.maybe,
      SwipeAction.favorite => s.favorite,
    };

/// The "KEEP / DELETE" stamp that fades in while dragging.
class _StampLabel extends StatelessWidget {
  const _StampLabel({required this.action, required this.strength});
  final SwipeAction action;
  final double strength;

  @override
  Widget build(BuildContext context) {
    final Color color = colorFor(action);
    return Opacity(
      opacity: strength,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color, width: 6),
          color: color.withValues(alpha: 0.12),
        ),
        alignment: Alignment.center,
        child: Transform.rotate(
          angle: -0.2,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(color: color, width: 4),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              labelFor(S.of(context), action),
              style: TextStyle(
                  color: color, fontSize: 40, fontWeight: FontWeight.w900, letterSpacing: 2),
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.rightIsKeep,
    required this.canUndo,
    required this.onUndo,
    required this.onAction,
  });

  final bool rightIsKeep;
  final bool canUndo;
  final VoidCallback onUndo;
  final ValueChanged<SwipeAction> onAction;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    // Buttons sit on the same side as their swipe direction.
    final SwipeAction leftAction = rightIsKeep ? SwipeAction.delete : SwipeAction.keep;
    final SwipeAction rightAction = rightIsKeep ? SwipeAction.keep : SwipeAction.delete;
    IconData iconFor(SwipeAction a) => switch (a) {
          SwipeAction.keep => Icons.check_rounded,
          SwipeAction.delete => Icons.close_rounded,
          SwipeAction.maybe => Icons.help_outline_rounded,
          SwipeAction.favorite => Icons.favorite_rounded,
        };
    Widget button(SwipeAction a, {double size = 58}) => _RoundButton(
          icon: iconFor(a),
          color: colorFor(a),
          size: size,
          tooltip: labelFor(s, a),
          onTap: () => onAction(a),
        );
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: <Widget>[
          _RoundButton(
            icon: Icons.undo_rounded,
            color: Colors.white70,
            size: 44,
            tooltip: s.undo,
            onTap: canUndo ? onUndo : null,
          ),
          button(leftAction, size: 64),
          button(SwipeAction.maybe, size: 50),
          button(SwipeAction.favorite, size: 50),
          button(rightAction, size: 64),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.color,
    required this.size,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final double size;
  final String tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final bool enabled = onTap != null;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: const Color(0xFF1E1E1E),
        shape: CircleBorder(side: BorderSide(color: color.withValues(alpha: enabled ? 0.8 : 0.2), width: 2)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(icon, color: enabled ? color : color.withValues(alpha: 0.3), size: size * 0.5),
          ),
        ),
      ),
    );
  }
}

class _DoneView extends StatelessWidget {
  const _DoneView({required this.kept, required this.deleted, required this.empty});
  final int kept;
  final int deleted;
  final bool empty;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final AppServices services = AppScope.of(context);
    final int pending = services.state.countWith(Decision.pendingDelete);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(empty ? '🗂️' : '🎉', style: const TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            Text(empty ? s.emptyDeck : s.deckDone,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            if (!empty) ...<Widget>[
              const SizedBox(height: 8),
              Text(s.deckDoneBody(kept, deleted),
                  style: const TextStyle(color: Colors.white70, fontSize: 15)),
            ],
            const SizedBox(height: 28),
            if (pending > 0)
              FilledButton.icon(
                icon: const Icon(Icons.delete_outline),
                label: Text('${s.pendingAction} (${s.items(pending)})'),
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute<void>(builder: (_) => const TrashPage()),
                ),
              ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(s.backHome, style: const TextStyle(color: Colors.white70)),
            ),
          ],
        ),
      ),
    );
  }
}
