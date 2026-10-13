import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:photo_manager/photo_manager.dart';

import '../logic/album_rules.dart';
import '../logic/formatters.dart';

/// Read/write access to the phone's photo library (iOS PhotoKit /
/// Android MediaStore) through photo_manager. Only metadata is kept in
/// memory; pixels are loaded lazily as thumbnails.
class MediaLibrary extends ChangeNotifier {
  PermissionState? permission;

  bool loading = false;
  int loadedCount = 0;
  int totalCount = 0;

  /// Every photo & video, newest first.
  List<AssetEntity> all = <AssetEntity>[];
  final Map<String, AssetEntity> byId = <String, AssetEntity>{};
  Map<MonthKey, List<AssetEntity>> byMonth = <MonthKey, List<AssetEntity>>{};

  /// Months newest first.
  List<MonthKey> months = <MonthKey>[];

  Set<String> screenshotIds = <String>{};
  Set<String> lineIds = <String>{};

  final Map<String, int> _sizes = <String, int>{};
  int? _androidSdk;

  static const PermissionRequestOption _permissionOption =
      PermissionRequestOption(
    androidPermission:
        AndroidPermission(type: RequestType.common, mediaLocation: false),
  );

  bool get hasAccess =>
      permission == PermissionState.authorized ||
      permission == PermissionState.limited;

  Future<PermissionState> requestPermission() async {
    permission =
        await PhotoManager.requestPermissionExtend(requestOption: _permissionOption);
    notifyListeners();
    return permission!;
  }

  Future<PermissionState> checkPermission() async {
    permission =
        await PhotoManager.getPermissionState(requestOption: _permissionOption);
    notifyListeners();
    return permission!;
  }

  Future<void> openSystemSettings() => PhotoManager.openSetting();

  /// iOS "limited" access: let the user pick more photos.
  Future<void> pickMoreLimited() => PhotoManager.presentLimited();

  Future<int> androidSdk() async {
    if (!Platform.isAndroid) return 0;
    return _androidSdk ??=
        int.tryParse(await PhotoManager.systemVersion()) ?? 0;
  }

  // ------------------------------------------------------------- loading
  Future<void> load() async {
    if (loading) return;
    loading = true;
    loadedCount = 0;
    notifyListeners();
    try {
      final List<AssetPathEntity> roots = await PhotoManager.getAssetPathList(
        onlyAll: true,
        type: RequestType.common,
        filterOption: FilterOptionGroup(
          orders: <OrderOption>[
            const OrderOption(type: OrderOptionType.createDate, asc: false),
          ],
        ),
      );
      final List<AssetEntity> assets = <AssetEntity>[];
      if (roots.isNotEmpty) {
        final AssetPathEntity root = roots.first;
        totalCount = await root.assetCountAsync;
        const int page = 500;
        for (int start = 0; start < totalCount; start += page) {
          final List<AssetEntity> chunk = await root.getAssetListRange(
            start: start,
            end: math.min(start + page, totalCount),
          );
          assets.addAll(chunk);
          loadedCount = assets.length;
          notifyListeners();
        }
      }
      _index(assets);
      await _loadSpecialAlbums();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void _index(List<AssetEntity> assets) {
    all = assets;
    byId
      ..clear()
      ..addEntries(assets.map((AssetEntity a) => MapEntry<String, AssetEntity>(a.id, a)));
    final Map<MonthKey, List<AssetEntity>> grouped =
        <MonthKey, List<AssetEntity>>{};
    for (final AssetEntity a in assets) {
      grouped.putIfAbsent(MonthKey.of(a.createDateTime), () => <AssetEntity>[]).add(a);
    }
    byMonth = grouped;
    months = grouped.keys.toList()..sort((MonthKey a, MonthKey b) => b.compareTo(a));
  }

  Future<void> _loadSpecialAlbums() async {
    final Set<String> shots = <String>{};
    final Set<String> line = <String>{};
    final List<AssetPathEntity> albums = await PhotoManager.getAssetPathList(
      hasAll: false,
      type: RequestType.common,
    );
    for (final AssetPathEntity album in albums) {
      final bool isShot = Platform.isIOS
          ? album.albumTypeEx?.darwin?.subtype ==
              PMDarwinAssetCollectionSubtype.smartAlbumScreenshots
          : isScreenshotAlbumName(album.name);
      final bool isLine = isLineAlbumName(album.name);
      if (!isShot && !isLine) continue;
      final List<String> ids = await _idsIn(album);
      if (isShot) shots.addAll(ids);
      if (isLine) line.addAll(ids);
    }
    screenshotIds = shots;
    lineIds = line;
  }

  Future<List<String>> _idsIn(AssetPathEntity album) async {
    final int count = await album.assetCountAsync;
    final List<String> ids = <String>[];
    const int page = 500;
    for (int start = 0; start < count; start += page) {
      final List<AssetEntity> chunk = await album.getAssetListRange(
        start: start,
        end: math.min(start + page, count),
      );
      ids.addAll(chunk.map((AssetEntity a) => a.id));
    }
    return ids;
  }

  // ------------------------------------------------------------- queries
  List<AssetEntity> onThisDay(DateTime today) => all
      .where((AssetEntity a) {
        final DateTime t = a.createDateTime;
        return t.month == today.month &&
            t.day == today.day &&
            t.year < today.year;
      })
      .toList();

  List<AssetEntity> screenshots({Duration? olderThan}) {
    final DateTime? cutoff =
        olderThan == null ? null : DateTime.now().subtract(olderThan);
    return all
        .where((AssetEntity a) =>
            screenshotIds.contains(a.id) &&
            (cutoff == null || a.createDateTime.isBefore(cutoff)))
        .toList();
  }

  List<AssetEntity> lineImages() =>
      all.where((AssetEntity a) => lineIds.contains(a.id)).toList();

  List<AssetEntity> videos() =>
      all.where((AssetEntity a) => a.type == AssetType.video).toList();

  List<AssetEntity> images() =>
      all.where((AssetEntity a) => a.type == AssetType.image).toList();

  // --------------------------------------------------------------- sizes
  int? cachedSize(String id) => _sizes[id];

  Future<int> fileSize(AssetEntity a) async {
    final int? cached = _sizes[a.id];
    if (cached != null) return cached;
    int size = 0;
    try {
      size = await a.fileSize;
    } catch (_) {
      size = 0;
    }
    _sizes[a.id] = size;
    return size;
  }

  /// Sizes for many assets, a few at a time so the platform channel and
  /// iCloud metadata lookups don't get flooded.
  Future<int> totalSize(Iterable<AssetEntity> assets,
      {void Function(int done)? onProgress}) async {
    int total = 0;
    int done = 0;
    final List<AssetEntity> list = assets.toList();
    const int batch = 16;
    for (int i = 0; i < list.length; i += batch) {
      final List<int> sizes = await Future.wait(
          list.skip(i).take(batch).map(fileSize));
      for (final int s in sizes) {
        total += s;
      }
      done += sizes.length;
      onProgress?.call(done);
    }
    return total;
  }

  /// Videos sorted largest first.
  Future<List<AssetEntity>> videosBySize() async {
    final List<AssetEntity> vids = videos();
    await totalSize(vids);
    vids.sort((AssetEntity a, AssetEntity b) =>
        (_sizes[b.id] ?? 0).compareTo(_sizes[a.id] ?? 0));
    return vids;
  }

  /// True when the original lives only in iCloud (iOS). Always false on Android.
  Future<bool> isCloudOnly(AssetEntity a) async {
    if (!Platform.isIOS) return false;
    try {
      return !(await a.isLocallyAvailable());
    } catch (_) {
      return false;
    }
  }

  // ------------------------------------------------------------ editing
  /// Deletes with ONE system confirmation per batch. Android 11+ moves items
  /// to the system trash (restorable for 30 days); iOS moves them to
  /// "Recently Deleted". Returns the ids that were actually removed.
  Future<List<String>> delete(List<AssetEntity> assets) async {
    if (assets.isEmpty) return <String>[];
    final List<String> removed = <String>[];
    const int chunk = 1000;
    for (int i = 0; i < assets.length; i += chunk) {
      final List<AssetEntity> part = assets.skip(i).take(chunk).toList();
      if (Platform.isAndroid && await androidSdk() >= 30) {
        removed.addAll(await PhotoManager.editor.android.moveToTrash(part));
      } else {
        removed.addAll(await PhotoManager.editor
            .deleteWithIds(part.map((AssetEntity a) => a.id).toList()));
      }
    }
    forget(removed);
    return removed;
  }

  /// Removes ids from the in-memory index (after delete/replace).
  void forget(Iterable<String> ids) {
    final Set<String> gone = ids.toSet();
    if (gone.isEmpty) return;
    _index(all.where((AssetEntity a) => !gone.contains(a.id)).toList());
    screenshotIds.removeAll(gone);
    lineIds.removeAll(gone);
    notifyListeners();
  }

  /// Adds a freshly saved asset (e.g. a compressed video) to the index.
  void remember(AssetEntity a) {
    final List<AssetEntity> next = List<AssetEntity>.of(all)..add(a);
    next.sort((AssetEntity x, AssetEntity y) =>
        y.createDateTime.compareTo(x.createDateTime));
    _index(next);
    notifyListeners();
  }

  Future<bool> setFavorite(AssetEntity a, bool favorite) async {
    try {
      if (Platform.isIOS) {
        await PhotoManager.editor.darwin
            .favoriteAsset(entity: a, favorite: favorite);
      } else {
        await PhotoManager.editor.android
            .favoriteAsset(entity: a, favorite: favorite);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Android 12+: "media management" special access lets favorite/trash run
  /// without a system dialog for every single photo.
  Future<bool> canManageMedia() async =>
      Platform.isAndroid && await androidSdk() >= 31 && await PhotoManager.canManageMedia();

  Future<bool> requestManageMedia() => PhotoManager.requestManageMedia();

  /// Albums the user can add photos into.
  Future<List<AssetPathEntity>> userAlbums() async {
    final List<AssetPathEntity> albums = await PhotoManager.getAssetPathList(
      hasAll: false,
      type: RequestType.common,
    );
    if (Platform.isIOS) {
      return albums
          .where((AssetPathEntity p) =>
              p.albumTypeEx?.darwin?.subtype == PMDarwinAssetCollectionSubtype.albumRegular)
          .toList();
    }
    return albums;
  }

  Future<AssetPathEntity?> createAlbum(String name) async {
    if (!Platform.isIOS) return null; // Android folders appear when first used.
    return PhotoManager.editor.darwin.createAlbum(name);
  }

  Future<bool> addToAlbum(AssetEntity a, AssetPathEntity album) async {
    try {
      await PhotoManager.editor.copyAssetToPath(asset: a, pathEntity: album);
      return true;
    } catch (_) {
      return false;
    }
  }
}
