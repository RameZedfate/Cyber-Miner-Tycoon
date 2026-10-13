import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../state/app_state.dart';
import 'swipe_page.dart';
import 'widgets/asset_thumb.dart';

/// The "swipe up" pile: compare two side by side, re-swipe, or bulk decide.
class MaybePage extends StatefulWidget {
  const MaybePage({super.key});

  @override
  State<MaybePage> createState() => _MaybePageState();
}

class _MaybePageState extends State<MaybePage> {
  late final AppServices _s = AppScope.of(context);
  final List<AssetEntity> _selected = <AssetEntity>[];

  List<AssetEntity> get _items {
    final Set<String> ids = _s.state.idsWith(Decision.maybe).toSet();
    return _s.library.all.where((AssetEntity a) => ids.contains(a.id)).toList();
  }

  void _toggle(AssetEntity a) {
    setState(() {
      if (_selected.contains(a)) {
        _selected.remove(a);
      } else {
        if (_selected.length == 2) _selected.removeAt(0);
        _selected.add(a);
      }
    });
  }

  void _setAll(Decision d) {
    for (final AssetEntity a in _items) {
      _s.state.setDecision(a.id, d);
    }
    setState(_selected.clear);
  }

  Future<void> _compare() async {
    if (_selected.length != 2) return;
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => ComparePage(a: _selected[0], b: _selected[1]),
    ));
    setState(_selected.clear);
  }

  Future<void> _reSwipe(List<AssetEntity> items) async {
    final S s = S.of(context);
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => SwipePage(
        title: s.maybeTitle,
        assets: items,
        include: const <Decision>{Decision.maybe},
      ),
    ));
    if (mounted) setState(_selected.clear);
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final List<AssetEntity> items = _items;
    return Scaffold(
      appBar: AppBar(
        title: Text(s.maybeTitle),
        actions: <Widget>[
          if (items.isNotEmpty)
            PopupMenuButton<Decision>(
              onSelected: _setAll,
              itemBuilder: (_) => <PopupMenuEntry<Decision>>[
                PopupMenuItem<Decision>(value: Decision.keep, child: Text(s.keepAll)),
                PopupMenuItem<Decision>(
                    value: Decision.pendingDelete, child: Text(s.deleteAll)),
              ],
            ),
        ],
      ),
      body: items.isEmpty
          ? Center(child: Text(s.maybeEmpty))
          : Column(children: <Widget>[
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(s.maybeHint, style: Theme.of(context).textTheme.bodySmall),
              ),
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 4,
                    crossAxisSpacing: 4,
                  ),
                  itemCount: items.length,
                  itemBuilder: (_, int i) {
                    final AssetEntity a = items[i];
                    final int order = _selected.indexOf(a);
                    return GestureDetector(
                      onTap: () => _toggle(a),
                      child: Stack(fit: StackFit.expand, children: <Widget>[
                        AssetThumb(a),
                        if (order >= 0)
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(
                                  color: Theme.of(context).colorScheme.primary, width: 4),
                            ),
                            alignment: Alignment.topRight,
                            padding: const EdgeInsets.all(4),
                            child: CircleAvatar(
                              radius: 12,
                              child: Text('${order + 1}', style: const TextStyle(fontSize: 12)),
                            ),
                          ),
                      ]),
                    );
                  },
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(children: <Widget>[
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.swipe),
                        label: Text(s.swipeAgain),
                        onPressed: () => _reSwipe(items),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        icon: const Icon(Icons.compare),
                        label: Text(s.compare),
                        onPressed: _selected.length == 2 ? _compare : null,
                      ),
                    ),
                  ]),
                ),
              ),
            ]),
    );
  }
}

/// Two photos side by side (stacked in portrait), each zoomable,
/// each with its own keep / delete buttons.
class ComparePage extends StatefulWidget {
  const ComparePage({super.key, required this.a, required this.b});
  final AssetEntity a;
  final AssetEntity b;

  @override
  State<ComparePage> createState() => _ComparePageState();
}

class _ComparePageState extends State<ComparePage> {
  final Map<String, Decision> _picked = <String, Decision>{};

  void _decide(AssetEntity asset, Decision d) {
    AppScope.of(context).state.setDecision(asset.id, d);
    setState(() => _picked[asset.id] = d);
    if (_picked.length == 2) Navigator.of(context).pop();
  }

  Widget _pane(AssetEntity asset) {
    final S s = S.of(context);
    final Decision? d = _picked[asset.id];
    return Expanded(
      child: Column(children: <Widget>[
        Expanded(
          child: InteractiveViewer(
            maxScale: 5,
            child: Image(image: AssetThumbProvider.large(asset), fit: BoxFit.contain),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: <Widget>[
            FilledButton.tonalIcon(
              icon: const Icon(Icons.close),
              label: Text(s.delete),
              style: FilledButton.styleFrom(
                backgroundColor: d == Decision.pendingDelete ? Colors.red : null,
              ),
              onPressed: () => _decide(asset, Decision.pendingDelete),
            ),
            const SizedBox(width: 12),
            FilledButton.tonalIcon(
              icon: const Icon(Icons.check),
              label: Text(s.keep),
              style: FilledButton.styleFrom(
                backgroundColor: d == Decision.keep ? Colors.green : null,
              ),
              onPressed: () => _decide(asset, Decision.keep),
            ),
          ]),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool landscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final List<Widget> panes = <Widget>[_pane(widget.a), const Divider(height: 1), _pane(widget.b)];
    return Scaffold(
      appBar: AppBar(title: Text(S.of(context).compare)),
      body: SafeArea(
        child: landscape
            ? Row(children: <Widget>[_pane(widget.a), const VerticalDivider(width: 1), _pane(widget.b)])
            : Column(children: panes),
      ),
    );
  }
}
