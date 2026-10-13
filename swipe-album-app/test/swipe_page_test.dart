import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:swipe_album/app_scope.dart';
import 'package:swipe_album/logic/ad_gate.dart';
import 'package:swipe_album/services/ads_service.dart';
import 'package:swipe_album/services/analysis_service.dart';
import 'package:swipe_album/services/media_library.dart';
import 'package:swipe_album/services/notification_service.dart';
import 'package:swipe_album/services/purchase_service.dart';
import 'package:swipe_album/services/video_service.dart';
import 'package:swipe_album/state/app_state.dart';
import 'package:swipe_album/ui/swipe_page.dart';

/// Drives the real SwipePage with fake photos. The photo library platform
/// channel is mocked (no device in CI): thumbnails come back empty, so cards
/// show the placeholder.
void main() {
  const MethodChannel channel = MethodChannel('com.fluttercandies/photo_manager');
  final List<String> calls = <String>[];

  setUp(() {
    calls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (MethodCall call) async {
      calls.add(call.method);
      return switch (call.method) {
        'getFileSize' => 2048,
        _ => null,
      };
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  AssetEntity photo(String id) => AssetEntity(
        id: id,
        typeInt: AssetType.image.index,
        width: 400,
        height: 300,
        createDateSecond: DateTime(2024, 5, 1).millisecondsSinceEpoch ~/ 1000,
      );

  Future<AppState> pumpPage(WidgetTester tester, List<AssetEntity> assets,
      {int swipesPerAd = 100,
      Locale locale = const Locale('en'),
      Map<String, Decision> preDecided = const <String, Decision>{}}) async {
    final AppState state = AppState(MemoryStateStorage())..setReminderOn(false);
    preDecided.forEach(state.setDecision);
    final AppServices services = AppServices(
      state: state,
      library: MediaLibrary(),
      analysis: AnalysisService(null),
      ads: AdsService(),
      adGate: AdGate(swipesPerAd: swipesPerAd),
      purchases: PurchaseService(onEntitlement: (_) {}),
      notifications: NotificationService(),
      video: VideoService(),
    );
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(AppScope(
      services: services,
      child: MaterialApp(
        locale: locale,
        supportedLocales: const <Locale>[Locale('en'), Locale('zh', 'TW')],
        localizationsDelegates: const <LocalizationsDelegate<Object>>[
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: SwipePage(title: 'May 2024', assets: assets),
      ),
    ));
    await tester.pumpAndSettle();
    return state;
  }

  /// Lets the state's debounced save timer fire before the test ends.
  Future<void> finish(WidgetTester tester) => tester.pump(const Duration(seconds: 1));

  Future<void> swipe(WidgetTester tester, Offset by) async {
    await tester.drag(find.byType(SwipePage), by);
    await tester.pumpAndSettle();
  }

  testWidgets('swipes decide, undo reverts, finishing shows the summary',
      (WidgetTester tester) async {
    final AppState state = await pumpPage(tester, <AssetEntity>[
      photo('a'), photo('b'), photo('c'), photo('d'),
    ]);
    expect(find.text('1 / 4'), findsOneWidget);

    await swipe(tester, const Offset(300, 0)); // right = keep (default)
    await swipe(tester, const Offset(-300, 0)); // left = delete
    expect(state.decisionOf('a'), Decision.keep);
    expect(state.decisionOf('b'), Decision.pendingDelete);
    expect(find.text('3 / 4'), findsOneWidget);

    await tester.tap(find.byTooltip('Undo'));
    await tester.pumpAndSettle();
    expect(state.decisionOf('b'), isNull);
    expect(find.text('2 / 4'), findsOneWidget);

    await swipe(tester, const Offset(0, -350)); // up = maybe
    expect(state.decisionOf('b'), Decision.maybe);

    await tester.tap(find.byTooltip('Favorite')); // button = swipe down
    await tester.pumpAndSettle();
    expect(state.decisionOf('c'), Decision.keep);
    // Tests run on Linux, where photo_manager's iOS/Android editors refuse to
    // run, so this exercises the failure path: decision kept, user told.
    expect(find.text("Couldn't favorite"), findsOneWidget);

    await tester.tap(find.byTooltip('Delete'));
    await tester.pumpAndSettle();
    expect(state.decisionOf('d'), Decision.pendingDelete);

    expect(find.text('All done here!'), findsOneWidget);
    expect(find.text('Kept 2, 1 in the delete tray'), findsOneWidget);
    expect(find.textContaining('Review & delete'), findsOneWidget);
    await finish(tester);
  });

  testWidgets('flipped direction setting: right swipe deletes',
      (WidgetTester tester) async {
    final AppState state = await pumpPage(tester, <AssetEntity>[photo('a'), photo('b')]);
    state.setRightIsKeep(false);
    await swipe(tester, const Offset(300, 0));
    expect(state.decisionOf('a'), Decision.pendingDelete);
    await finish(tester);
  });

  testWidgets('ad becomes due after N swipes; counter shown until then',
      (WidgetTester tester) async {
    final AppState state = await pumpPage(
        tester, <AssetEntity>[photo('a'), photo('b'), photo('c')],
        swipesPerAd: 2);
    expect(find.text('Ad in 2 swipes'), findsOneWidget);
    await swipe(tester, const Offset(300, 0));
    expect(find.text('Ad in 1 swipes'), findsOneWidget);
    await swipe(tester, const Offset(300, 0));
    // No ad could load in tests, so the ad stays due (not silently skipped).
    expect(state.swipesSinceAd, 2);
    expect(find.text('Ad in 0 swipes'), findsOneWidget);
    await finish(tester);
  });

  testWidgets('already-decided photos are not shown again', (WidgetTester tester) async {
    final AppState state = await pumpPage(tester, <AssetEntity>[photo('a'), photo('b')],
        preDecided: <String, Decision>{'a': Decision.keep});
    expect(find.text('1 / 1'), findsOneWidget);
    await swipe(tester, const Offset(-300, 0));
    expect(state.decisionOf('b'), Decision.pendingDelete);
    expect(state.decisionOf('a'), Decision.keep);
    await finish(tester);
  });

  testWidgets('Chinese UI strings', (WidgetTester tester) async {
    await pumpPage(tester, <AssetEntity>[photo('a')], locale: const Locale('zh', 'TW'));
    expect(find.byTooltip('保留'), findsOneWidget);
    expect(find.byTooltip('刪除'), findsOneWidget);
    expect(find.byTooltip('再考慮'), findsOneWidget);
    expect(find.text('再 100 張後播放廣告'), findsOneWidget);
    await finish(tester);
  });
}
