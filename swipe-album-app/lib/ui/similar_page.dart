import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import 'swipe_page.dart';
import 'widgets/asset_thumb.dart';

/// Burst / near-duplicate groups ("keep the best one") and blurry photos.
/// Analysis runs on-device and is cached, so re-opening is instant.
class SimilarPage extends StatefulWidget {
  const SimilarPage({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  State<SimilarPage> createState() => _SimilarPageState();
}

class _SimilarPageState extends State<SimilarPage> {
  late final AppServices _s = AppScope.of(context);
  static const int _step = 2000;
  int _scopeSize = _step;
  final Map<int, String> _chosen = <int, String>{}; // group hash → kept id
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _run();
  }

  List<AssetEntity> get _scope {
    return _s.library
        .images()
        .take(_scopeSize)
        .where((AssetEntity a) => _s.state.decisionOf(a.id) != Decision.pendingDelete)
        .toList();
  }

  Future<void> _run() async {
    await _s.analysis.analyze(_scope);
    if (mounted) setState(() {});
  }

  void _analyzeMore() {
    _scopeSize += _step;
    _run();
  }

  int _groupKey(List<AssetEntity> g) => Object.hashAll(g.map((AssetEntity a) => a.id));

  void _keepBest(List<AssetEntity> group, String keepId) {
    for (final AssetEntity a in group) {
      _s.state.setDecision(a.id, a.id == keepId ? Decision.keep : Decision.pendingDelete);
    }
    _s.state.unlock('similar_cleaned');
    final S s = S.of(context);
    for (final String id in _s.state.takeFreshAchievements()) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(s.achievementUnlocked(s.achievementName(id)))));
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    return DefaultTabController(
      length: 2,
      initialIndex: widget.initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: Text(s.similarTitle),
          bottom: TabBar(tabs: <Widget>[Tab(text: s.deckSimilar), Tab(text: s.deckBlurry)]),
        ),
        body: ListenableBuilder(
          listenable: _s.analysis,
          builder: (BuildContext context, _) {
            if (_s.analysis.running) {
              final int total = _s.analysis.total;
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[
                    LinearProgressIndicator(
                        value: total == 0 ? null : _s.analysis.done / total),
                    const SizedBox(height: 16),
                    Text(s.analyzing(_s.analysis.done, total)),
                  ]),
                ),
              );
            }
            final List<AssetEntity> scope = _scope;
            return TabBarView(children: <Widget>[
              _similarTab(s, scope),
              _blurryTab(s, scope),
            ]);
          },
        ),
      ),
    );
  }

  Widget _footer(S s, int analysed) {
    final bool more = _s.library.images().length > _scopeSize;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: <Widget>[
        Text(s.scopeNote(analysed), style: Theme.of(context).textTheme.bodySmall),
        if (more)
          TextButton.icon(
            icon: const Icon(Icons.manage_search),
            label: Text(s.analyzeMore),
            onPressed: _analyzeMore,
          ),
      ]),
    );
  }

  Widget _similarTab(S s, List<AssetEntity> scope) {
    final List<List<AssetEntity>> groups = _s.analysis.similarGroups(scope);
    if (groups.isEmpty) {
      return ListView(children: <Widget>[
        const SizedBox(height: 80),
        Center(child: Text(s.noSimilar)),
        _footer(s, scope.length),
      ]);
    }
    return ListView.builder(
      itemCount: groups.length + 2,
      itemBuilder: (BuildContext context, int i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text('${s.groupCount(groups.length)} · ${s.groupHint}',
                style: Theme.of(context).textTheme.bodySmall),
          );
        }
        if (i == groups.length + 1) return _footer(s, scope.length);
        final List<AssetEntity> g = groups[i - 1];
        final int key = _groupKey(g);
        final String best = _s.analysis.bestIdOf(g);
        final String keepId = _chosen[key] ?? best;
        return Card(
          margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: <Widget>[
              SizedBox(
                height: 120,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: g.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 6),
                  itemBuilder: (_, int j) {
                    final AssetEntity a = g[j];
                    final bool kept = a.id == keepId;
                    return GestureDetector(
                      onTap: () => setState(() => _chosen[key] = a.id),
                      child: SizedBox(
                        width: 100,
                        child: Stack(fit: StackFit.expand, children: <Widget>[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Opacity(opacity: kept ? 1 : 0.55, child: AssetThumb(a)),
                          ),
                          if (kept)
                            Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green, width: 3),
                              ),
                            ),
                          if (a.id == best)
                            Positioned(
                              left: 4,
                              top: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.amber,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text('👑 ${s.best}', style: const TextStyle(fontSize: 11)),
                              ),
                            ),
                        ]),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              FilledButton.tonalIcon(
                icon: const Icon(Icons.auto_fix_high),
                label: Text('${s.keepBest} (${g.length - 1})'),
                onPressed: () => _keepBest(g, keepId),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _blurryTab(S s, List<AssetEntity> scope) {
    final List<AssetEntity> blurry = _s.analysis
        .blurry(scope)
        .where((AssetEntity a) => _s.state.isUndecided(a.id))
        .toList();
    if (blurry.isEmpty) {
      return ListView(children: <Widget>[
        const SizedBox(height: 80),
        Center(child: Text(s.noBlurry)),
        _footer(s, scope.length),
      ]);
    }
    return Column(children: <Widget>[
      Expanded(
        child: GridView.builder(
          padding: const EdgeInsets.all(4),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
          ),
          itemCount: blurry.length,
          itemBuilder: (_, int i) => AssetThumb(blurry[i], size: 200),
        ),
      ),
      _footer(s, scope.length),
      SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              icon: const Icon(Icons.swipe),
              label: Text(s.blurryStart(blurry.length)),
              onPressed: () async {
                await Navigator.of(context).push(MaterialPageRoute<void>(
                  builder: (_) => SwipePage(title: s.deckBlurry, assets: blurry),
                ));
                if (mounted) setState(() {});
              },
            ),
          ),
        ),
      ),
    ]);
  }
}
