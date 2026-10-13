import 'dart:io';

import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../l10n/strings.dart';
import '../services/purchase_service.dart';
import '../state/app_state.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final AppServices _s = AppScope.of(context);
  bool? _manageMedia;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (Platform.isAndroid && _manageMedia == null) {
      _s.library.canManageMedia().then((bool v) {
        if (mounted) setState(() => _manageMedia = v);
      });
    }
  }

  Future<void> _setReminder(bool on) async {
    final S s = S.of(context);
    _s.state.setReminderOn(on);
    if (on) {
      await _s.notifications.requestPermission();
      await _s.notifications.scheduleDaily(title: s.reminderTitle, body: s.reminderBody);
    } else {
      await _s.notifications.cancelDaily();
    }
  }

  @override
  Widget build(BuildContext context) {
    final S s = S.of(context);
    final AppState state = _s.state;
    final PurchaseService iap = _s.purchases;
    return Scaffold(
      appBar: AppBar(title: Text(s.settingsTitle)),
      body: ListenableBuilder(
        listenable: Listenable.merge(<Listenable>[state, iap]),
        builder: (BuildContext context, _) => ListView(children: <Widget>[
          _Header(s.swipeDirection),
          RadioGroup<bool>(
            groupValue: state.rightIsKeep,
            onChanged: (bool? v) => state.setRightIsKeep(v ?? true),
            child: Column(children: <Widget>[
              RadioListTile<bool>(value: true, title: Text(s.dirRightKeep)),
              RadioListTile<bool>(value: false, title: Text(s.dirLeftKeep)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(s.dirHint, style: Theme.of(context).textTheme.bodySmall),
          ),
          _Header(s.dailyGoal),
          ListTile(
            title: Slider(
              value: state.dailyGoal.toDouble(),
              min: 10,
              max: 200,
              divisions: 19,
              label: '${state.dailyGoal}',
              onChanged: (double v) => state.setDailyGoal(v.round()),
            ),
            trailing: Text('${state.dailyGoal}'),
          ),
          SwitchListTile(
            title: Text(s.dailyReminder),
            value: state.reminderOn,
            onChanged: _setReminder,
          ),
          if (Platform.isAndroid && _manageMedia != null)
            SwitchListTile(
              title: Text(s.manageMedia),
              subtitle: Text(s.manageMediaBody),
              value: _manageMedia!,
              onChanged: _manageMedia!
                  ? null
                  : (_) async {
                      await _s.library.requestManageMedia();
                      final bool v = await _s.library.canManageMedia();
                      if (mounted) setState(() => _manageMedia = v);
                    },
            ),
          _Header(s.removeAds),
          if (state.adsRemoved)
            ListTile(leading: const Icon(Icons.verified, color: Colors.green), title: Text(s.purchased))
          else ...<Widget>[
            ListTile(
              title: Text(s.removeAds),
              subtitle: Text('${s.removeAdsDesc}\n${s.adsNote}'),
              isThreeLine: true,
              trailing: FilledButton(
                onPressed: iap.product == null || iap.busy ? null : iap.buy,
                child: iap.busy
                    ? const SizedBox(
                        width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(iap.priceLabel ?? 'US\$5'),
              ),
            ),
            if (!iap.available || iap.product == null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(s.storeUnavailable, style: Theme.of(context).textTheme.bodySmall),
              ),
            if (iap.lastError != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(iap.lastError!, style: const TextStyle(color: Colors.red)),
              ),
          ],
          ListTile(
            leading: const Icon(Icons.restore),
            title: Text(s.restore),
            onTap: iap.busy ? null : iap.restore,
          ),
          _Header(s.privacy),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            child: Text(s.privacyBody),
          ),
        ]),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
        child: Text(text,
            style: TextStyle(
                color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
      );
}
