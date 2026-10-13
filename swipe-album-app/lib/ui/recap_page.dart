import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../logic/formatters.dart';
import '../state/app_state.dart';

/// "Spotify Wrapped" style 9:16 card, sized for IG / LINE stories.
class RecapPage extends StatefulWidget {
  const RecapPage({super.key});

  @override
  State<RecapPage> createState() => _RecapPageState();
}

class _RecapPageState extends State<RecapPage> {
  final GlobalKey _cardKey = GlobalKey();
  int _year = DateTime.now().year;
  bool _sharing = false;

  Future<void> _share() async {
    setState(() => _sharing = true);
    try {
      final RenderRepaintBoundary boundary =
          _cardKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      // 360 logical px wide × 3 = 1080 px, the native story width.
      final ui.Image image = await boundary.toImage(pixelRatio: 3);
      final ByteData? png = await image.toByteData(format: ui.ImageByteFormat.png);
      if (png == null) return;
      final Directory dir = await getTemporaryDirectory();
      final File file = File('${dir.path}/swipealbum_recap_$_year.png');
      await file.writeAsBytes(png.buffer.asUint8List());
      await SharePlus.instance.share(ShareParams(
        files: <XFile>[XFile(file.path, mimeType: 'image/png')],
        text: '#滑滑相簿 #SwipeAlbum',
      ));
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final AppState state = AppScope.of(context).state;
    final int thisYear = DateTime.now().year;
    return Scaffold(
      appBar: AppBar(
        title: Text(s.recapTitle),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => setState(() => _year--),
          ),
          Center(child: Text('$_year')),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _year < thisYear ? () => setState(() => _year++) : null,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(children: <Widget>[
          Expanded(
            child: Center(
              child: FittedBox(
                child: RepaintBoundary(
                  key: _cardKey,
                  child: _RecapCard(year: _year, stats: state.statsFor(_year), state: state),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                icon: _sharing
                    ? const SizedBox(
                        width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.ios_share),
                label: Text(s.recapShare),
                onPressed: _sharing ? null : _share,
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _RecapCard extends StatelessWidget {
  const _RecapCard({required this.year, required this.stats, required this.state});
  final int year;
  final YearStats stats;
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    Widget stat(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 14)),
            Text(value,
                style: const TextStyle(
                    color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800, height: 1.15)),
          ]),
        );
    return Container(
      width: 360,
      height: 640,
      padding: const EdgeInsets.fromLTRB(28, 40, 28, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF6A5AE0), Color(0xFFE0569B), Color(0xFFFFA24C)],
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        const Text('🧹✨', style: TextStyle(fontSize: 40)),
        const SizedBox(height: 8),
        Text(s.recapHeadline(year),
            style: const TextStyle(
                color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.2)),
        const SizedBox(height: 18),
        stat(s.recapDeleted, s.photos(stats.deleted)),
        stat(s.recapFreed, formatBytes(stats.bytesFreed)),
        stat(s.recapKept, s.photos(stats.kept)),
        stat(s.recapSwipes, '${stats.swipes}'),
        stat(s.recapStreak, s.days(state.bestStreak)),
        const Spacer(),
        Row(children: <Widget>[
          const Icon(Icons.swipe, color: Colors.white),
          const SizedBox(width: 8),
          Text(s.recapFooter, style: const TextStyle(color: Colors.white, fontSize: 14)),
        ]),
      ]),
    );
  }
}
