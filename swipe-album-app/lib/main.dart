import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:path_provider/path_provider.dart';

import 'app_scope.dart';
import 'config.dart';
import 'l10n/strings.dart';
import 'logic/ad_gate.dart';
import 'services/ads_service.dart';
import 'services/analysis_service.dart';
import 'services/media_library.dart';
import 'services/notification_service.dart';
import 'services/purchase_service.dart';
import 'services/video_service.dart';
import 'state/app_state.dart';
import 'ui/root_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final Directory dir = await getApplicationSupportDirectory();

  final AppState state = AppState(FileStateStorage(File('${dir.path}/state.json')));
  await state.load();
  final AnalysisService analysis = AnalysisService(File('${dir.path}/analysis.json'));
  await analysis.loadCache();

  final AdsService ads = AdsService();
  final PurchaseService purchases = PurchaseService(onEntitlement: (bool owned) {
    if (!owned) return;
    state.setAdsRemoved(true);
    ads.disable();
  });

  final AppServices services = AppServices(
    state: state,
    library: MediaLibrary(),
    analysis: analysis,
    ads: ads,
    adGate: const AdGate(swipesPerAd: AppConfig.swipesPerAd),
    purchases: purchases,
    notifications: NotificationService(),
    video: VideoService(),
  );

  runApp(SwipeAlbumApp(services: services));

  // Non-blocking start-up work after the first frame.
  purchases.init().catchError((Object _) {});
  ads.init(adsRemoved: state.adsRemoved).catchError((Object _) {});
}

class SwipeAlbumApp extends StatefulWidget {
  const SwipeAlbumApp({super.key, required this.services});
  final AppServices services;

  @override
  State<SwipeAlbumApp> createState() => _SwipeAlbumAppState();
}

class _SwipeAlbumAppState extends State<SwipeAlbumApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.paused || s == AppLifecycleState.detached) {
      widget.services.state.flush();
    }
  }

  ThemeData _theme(Brightness b) => ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6A5AE0), brightness: b),
        useMaterial3: true,
      );

  @override
  Widget build(BuildContext context) {
    return AppScope(
      services: widget.services,
      child: MaterialApp(
        onGenerateTitle: (_) => 'SwipeAlbum',
        debugShowCheckedModeBanner: false,
        theme: _theme(Brightness.light),
        darkTheme: _theme(Brightness.dark),
        localizationsDelegates: const <LocalizationsDelegate<Object>>[
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const <Locale>[
          Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hant', countryCode: 'TW'),
          Locale('en'),
        ],
        localeResolutionCallback: (Locale? device, Iterable<Locale> supported) =>
            device?.languageCode == 'zh' ? supported.first : const Locale('en'),
        home: const _ReminderBootstrap(child: RootGate()),
      ),
    );
  }
}

/// Re-arms the daily reminder with localized text once a context exists.
class _ReminderBootstrap extends StatefulWidget {
  const _ReminderBootstrap({required this.child});
  final Widget child;

  @override
  State<_ReminderBootstrap> createState() => _ReminderBootstrapState();
}

class _ReminderBootstrapState extends State<_ReminderBootstrap> {
  bool _done = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_done) return;
    _done = true;
    final AppServices s = AppScope.of(context);
    if (!s.state.reminderOn) return;
    final S t = S.of(context);
    s.notifications
        .scheduleDaily(title: t.reminderTitle, body: t.reminderBody)
        .catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
