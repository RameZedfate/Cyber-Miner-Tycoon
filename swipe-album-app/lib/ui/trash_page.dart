import 'dart:io';

import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../logic/formatters.dart';
import '../state/app_state.dart';
import 'widgets/asset_thumb.dart';

/// Everything swiped to "delete" waits here. Nothing leaves the phone's
/// library until the user presses the button and confirms the system dialog
/// once for the whole batch.
class TrashPage extends StatefulWidget {
  const TrashPage({super.key});

  @override
  State<TrashPage> createState() => _TrashPageState();
}

class _TrashPageState extends State<TrashPage> {
  late final AppServices _s = AppScope.of(context);
  List<AssetEntity> _items = <AssetEntity>[];
  Future<int>? _total;
  bool _deleting = false;
  bool _initialised = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialised) return;
    _initialised = true;
    _refresh();
  }

  void _refresh() {
    final Set<String> ids = _s.state.idsWith(Decision.pendingDelete).toSet();
    _items = _s.library.all.where((AssetEntity a) => ids.contains(a.id)).toList();
    _total = _s.library.totalSize(_items);
  }

  void _putBack(AssetEntity a) {
    _s.state.setDecision(a.id, null);
    setState(_refresh);
  }

  Future<bool> _confirmCloudWarning() async {
    if (_s.state.cloudWarningAcked) return true;
    final S s = S.of(context);
    bool dontShow = false;
    final bool? go = await showDialog<bool>(
      context: context,
      builder: (BuildContext c) => StatefulBuilder(
        builder: (BuildContext c, StateSetter set) => AlertDialog(
          title: Text(s.cloudWarnTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(Platform.isIOS ? s.cloudWarnIos : s.cloudWarnAndroid),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: dontShow,
                onChanged: (bool? v) => set(() => dontShow = v ?? false),
                title: Text(s.dontShowAgain),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ],
          ),
          actions: <Widget>[
            TextButton(onPressed: () => Navigator.pop(c, false), child: Text(s.cancel)),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () => Navigator.pop(c, true),
              child: Text(s.continueDelete),
            ),
          ],
        ),
      ),
    );
    if (go == true && dontShow) _s.state.ackCloudWarning();
    return go == true;
  }

  Future<void> _deleteAll() async {
    if (_items.isEmpty || _deleting) return;
    if (!await _confirmCloudWarning() || !mounted) return;
    final S s = S.of(context);
    setState(() => _deleting = true);
    // Sizes must be read before the files disappear.
    await _s.library.totalSize(_items);
    final Map<String, int> sizes = <String, int>{
      for (final AssetEntity a in _items) a.id: _s.library.cachedSize(a.id) ?? 0,
    };
    List<String> removed = <String>[];
    try {
      removed = await _s.library.delete(_items);
    } catch (_) {
      removed = <String>[];
    }
    final int bytes = removed.fold<int>(0, (int sum, String id) => sum + (sizes[id] ?? 0));
    if (removed.isNotEmpty) _s.state.recordDeleted(removed, bytes);
    if (!mounted) return;
    setState(() {
      _deleting = false;
      _refresh();
    });
    final ScaffoldMessengerState messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(SnackBar(
      content: Text(removed.isEmpty
          ? s.deleteCancelled
          : s.deletedDone(removed.length, formatBytes(bytes))),
    ));
    for (final String id in _s.state.takeFreshAchievements()) {
      messenger.showSnackBar(
          SnackBar(content: Text(s.achievementUnlocked(s.achievementName(id)))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.trashTitle)),
      body: _items.isEmpty
          ? Center(child: Text(s.trashEmpty))
          : Column(
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(s.trashHint, style: Theme.of(context).textTheme.bodySmall),
                ),
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 4,
                      crossAxisSpacing: 4,
                    ),
                    itemCount: _items.length,
                    itemBuilder: (BuildContext c, int i) {
                      final AssetEntity a = _items[i];
                      return GestureDetector(
                        onTap: () => _putBack(a),
                        child: Stack(fit: StackFit.expand, children: <Widget>[
                          AssetThumb(a),
                          const Positioned(
                            top: 4,
                            right: 4,
                            child: CircleAvatar(
                              radius: 12,
                              backgroundColor: Colors.black54,
                              child: Icon(Icons.undo, size: 14, color: Colors.white),
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
                    child: SizedBox(
                      width: double.infinity,
                      child: FutureBuilder<int>(
                        future: _total,
                        builder: (_, AsyncSnapshot<int> snap) => FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.red,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          icon: _deleting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.delete_forever),
                          label: Text(s.trashDeleteAll(
                            _items.length,
                            snap.hasData ? formatBytes(snap.data!) : s.calculating,
                          )),
                          onPressed: _deleting ? null : _deleteAll,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
