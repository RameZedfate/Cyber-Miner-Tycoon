import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:photo_manager/photo_manager.dart';

import '../logic/similarity.dart';

/// Finds similar/burst shots and blurry photos fully on-device.
/// Results are cached per asset id so each photo is analysed once.
class AnalysisService extends ChangeNotifier {
  AnalysisService(this._cacheFile);

  final File? _cacheFile;
  final Map<String, ImageFeatures> _features = <String, ImageFeatures>{};

  bool running = false;
  int done = 0;
  int total = 0;

  Future<void> loadCache() async {
    final File? f = _cacheFile;
    if (f == null || !await f.exists()) return;
    try {
      final Map<String, dynamic> j =
          jsonDecode(await f.readAsString()) as Map<String, dynamic>;
      j.forEach((String id, dynamic v) {
        _features[id] = ImageFeatures.fromJson(v as List<dynamic>);
      });
    } on FormatException {
      _features.clear();
    }
  }

  Future<void> _saveCache() async {
    final File? f = _cacheFile;
    if (f == null) return;
    await f.writeAsString(jsonEncode(_features.map(
        (String k, ImageFeatures v) => MapEntry<String, dynamic>(k, v.toJson()))));
  }

  ImageFeatures? featuresOf(String id) => _features[id];

  /// Analyses every image in [scope] that isn't cached yet.
  Future<void> analyze(List<AssetEntity> scope) async {
    if (running) return;
    final List<AssetEntity> todo = scope
        .where((AssetEntity a) =>
            a.type == AssetType.image && !_features.containsKey(a.id))
        .toList();
    running = true;
    done = 0;
    total = todo.length;
    notifyListeners();
    try {
      const int batch = 24;
      for (int i = 0; i < todo.length; i += batch) {
        final List<AssetEntity> part = todo.skip(i).take(batch).toList();
        final List<Uint8List?> thumbs = await Future.wait(part.map(
            (AssetEntity a) => a.thumbnailDataWithSize(
                const ThumbnailSize(256, 256),
                quality: 85)));
        final List<int> idx = <int>[];
        final List<Uint8List> bytes = <Uint8List>[];
        for (int k = 0; k < thumbs.length; k++) {
          final Uint8List? t = thumbs[k];
          if (t != null) {
            idx.add(k);
            bytes.add(t);
          }
        }
        final List<List<num>?> results =
            await compute(computeFeaturesBatch, bytes);
        for (int k = 0; k < results.length; k++) {
          final List<num>? r = results[k];
          if (r != null) {
            _features[part[idx[k]].id] = ImageFeatures.fromJson(r);
          }
        }
        done += part.length;
        notifyListeners();
      }
      await _saveCache();
    } finally {
      running = false;
      notifyListeners();
    }
  }

  /// Similar groups inside [scope] (already analysed), newest first.
  List<List<AssetEntity>> similarGroups(List<AssetEntity> scope) {
    final Map<String, AssetEntity> byId = <String, AssetEntity>{
      for (final AssetEntity a in scope) a.id: a,
    };
    final List<FeatureItem> items = <FeatureItem>[];
    for (final AssetEntity a in scope) {
      final ImageFeatures? f = _features[a.id];
      if (f == null) continue;
      items.add(FeatureItem(
        id: a.id,
        taken: a.createDateTime,
        features: f,
        pixels: a.width * a.height,
      ));
    }
    return groupSimilar(items)
        .map((List<FeatureItem> g) =>
            g.map((FeatureItem i) => byId[i.id]!).toList())
        .toList();
  }

  /// The id of the photo to keep in a group.
  String bestIdOf(List<AssetEntity> group) {
    final List<FeatureItem> items = group
        .where((AssetEntity a) => _features.containsKey(a.id))
        .map((AssetEntity a) => FeatureItem(
              id: a.id,
              taken: a.createDateTime,
              features: _features[a.id]!,
              pixels: a.width * a.height,
            ))
        .toList();
    if (items.isEmpty) return group.first.id;
    return bestOf(items).id;
  }

  List<AssetEntity> blurry(List<AssetEntity> scope) => scope.where((AssetEntity a) {
        final ImageFeatures? f = _features[a.id];
        return f != null && f.sharpness < blurryThreshold;
      }).toList();
}
