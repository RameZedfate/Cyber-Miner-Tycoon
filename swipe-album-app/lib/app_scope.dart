import 'package:flutter/widgets.dart';

import 'logic/ad_gate.dart';
import 'services/ads_service.dart';
import 'services/analysis_service.dart';
import 'services/media_library.dart';
import 'services/notification_service.dart';
import 'services/purchase_service.dart';
import 'services/video_service.dart';
import 'state/app_state.dart';

/// Hands the app's long-lived services to every page.
class AppServices {
  AppServices({
    required this.state,
    required this.library,
    required this.analysis,
    required this.ads,
    required this.adGate,
    required this.purchases,
    required this.notifications,
    required this.video,
  });

  final AppState state;
  final MediaLibrary library;
  final AnalysisService analysis;
  final AdsService ads;
  final AdGate adGate;
  final PurchaseService purchases;
  final NotificationService notifications;
  final VideoService video;
}

class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.services, required super.child});

  final AppServices services;

  static AppServices of(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!.services;

  @override
  bool updateShouldNotify(AppScope oldWidget) => services != oldWidget.services;
}
