import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../services/media_library.dart';
import 'home_page.dart';

/// Permission → first load → home.
class RootGate extends StatefulWidget {
  const RootGate({super.key});

  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  late final AppServices _s = AppScope.of(context);
  bool _checked = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_checked) return;
    _checked = true;
    _s.library.checkPermission().then((PermissionState p) {
      if (_s.library.hasAccess) _load();
    });
  }

  Future<void> _request() async {
    await _s.library.requestPermission();
    if (_s.library.hasAccess) await _load();
  }

  Future<void> _load() async {
    await _s.library.load();
    _s.state.pruneMissing(_s.library.byId.keys.toSet());
  }

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final MediaLibrary lib = _s.library;
    return ListenableBuilder(
      listenable: lib,
      builder: (BuildContext context, _) {
        if (lib.permission == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (!lib.hasAccess) return _PermissionView(onGrant: _request);
        if (lib.loading && lib.all.isEmpty) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[
                  LinearProgressIndicator(
                    value: lib.totalCount == 0 ? null : lib.loadedCount / lib.totalCount,
                  ),
                  const SizedBox(height: 16),
                  Text(t.loadingLibrary(lib.loadedCount, lib.totalCount)),
                ]),
              ),
            ),
          );
        }
        return HomePage(
          onPickMore: lib.permission == PermissionState.limited
              ? () async {
                  await lib.pickMoreLimited();
                  await _load();
                }
              : null,
        );
      },
    );
  }
}

class _PermissionView extends StatelessWidget {
  const _PermissionView({required this.onGrant});
  final VoidCallback onGrant;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final AppServices s = AppScope.of(context);
    final bool denied = s.library.permission == PermissionState.denied ||
        s.library.permission == PermissionState.restricted;
    Widget point(String text) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(children: <Widget>[
            const Icon(Icons.check_circle, color: Colors.green, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(text)),
          ]),
        );
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Spacer(),
              const Text('👈 🖼️ 👉', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 16),
              Text(t.permTitle,
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(t.permBody),
              const SizedBox(height: 20),
              point(t.permPrivacy1),
              point(t.permPrivacy2),
              point(t.permPrivacy3),
              const Spacer(),
              if (denied)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(t.permDenied, style: const TextStyle(color: Colors.red)),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  onPressed: denied ? s.library.openSystemSettings : onGrant,
                  child: Text(denied ? t.openSettings : t.permGrant),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
