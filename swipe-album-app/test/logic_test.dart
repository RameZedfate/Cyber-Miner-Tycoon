import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' show Offset, Size;

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:swipe_album/logic/ad_gate.dart';
import 'package:swipe_album/logic/album_rules.dart';
import 'package:swipe_album/logic/achievements.dart';
import 'package:swipe_album/logic/formatters.dart';
import 'package:swipe_album/logic/similarity.dart';
import 'package:swipe_album/logic/swipe_logic.dart';

img.Image _checkerboard({int size = 128}) {
  final img.Image im = img.Image(width: size, height: size);
  for (int y = 0; y < size; y++) {
    for (int x = 0; x < size; x++) {
      final int v = ((x ~/ 8) + (y ~/ 8)).isEven ? 255 : 0;
      im.setPixelRgb(x, y, v, v, v);
    }
  }
  return im;
}

/// A random "scene" of overlapping grey rectangles; different seeds give
/// unrelated pictures, like two different photos.
img.Image _scene(int seed, {int size = 128}) {
  final math.Random r = math.Random(seed);
  final img.Image im = img.Image(width: size, height: size);
  img.fill(im, color: img.ColorRgb8(128, 128, 128));
  for (int i = 0; i < 12; i++) {
    final int v = r.nextInt(256);
    final int x = r.nextInt(size - 20);
    final int y = r.nextInt(size - 20);
    img.fillRect(im,
        x1: x, y1: y, x2: x + 20 + r.nextInt(60), y2: y + 20 + r.nextInt(60),
        color: img.ColorRgb8(v, v, v));
  }
  return im;
}

Uint8List _jpg(img.Image im) => Uint8List.fromList(img.encodeJpg(im, quality: 95));

void main() {
  group('swipe mapping', () {
    test('default layout: right keeps, left deletes', () {
      expect(actionFor(SwipeDir.right, rightIsKeep: true), SwipeAction.keep);
      expect(actionFor(SwipeDir.left, rightIsKeep: true), SwipeAction.delete);
      expect(actionFor(SwipeDir.up, rightIsKeep: true), SwipeAction.maybe);
      expect(actionFor(SwipeDir.down, rightIsKeep: true), SwipeAction.favorite);
    });

    test('flipped layout swaps only left/right', () {
      expect(actionFor(SwipeDir.right, rightIsKeep: false), SwipeAction.delete);
      expect(actionFor(SwipeDir.left, rightIsKeep: false), SwipeAction.keep);
      expect(actionFor(SwipeDir.up, rightIsKeep: false), SwipeAction.maybe);
    });

    test('dirFor is the inverse of actionFor', () {
      for (final bool layout in <bool>[true, false]) {
        for (final SwipeAction a in SwipeAction.values) {
          expect(actionFor(dirFor(a, rightIsKeep: layout), rightIsKeep: layout), a);
        }
      }
    });
  });

  group('resolveSwipe', () {
    const Size card = Size(400, 700);

    test('short drag springs back', () {
      expect(
          resolveSwipe(delta: const Offset(40, 10), velocity: Offset.zero, cardSize: card),
          isNull);
    });

    test('far drags commit in the dominant direction', () {
      expect(resolveSwipe(delta: const Offset(150, 30), velocity: Offset.zero, cardSize: card),
          SwipeDir.right);
      expect(resolveSwipe(delta: const Offset(-150, 60), velocity: Offset.zero, cardSize: card),
          SwipeDir.left);
      expect(resolveSwipe(delta: const Offset(20, -160), velocity: Offset.zero, cardSize: card),
          SwipeDir.up);
      expect(resolveSwipe(delta: const Offset(10, 160), velocity: Offset.zero, cardSize: card),
          SwipeDir.down);
    });

    test('a quick fling commits even when short', () {
      expect(
          resolveSwipe(
              delta: const Offset(30, 5), velocity: const Offset(1500, 0), cardSize: card),
          SwipeDir.right);
    });

    test('fling against the drag direction does not commit', () {
      expect(
          resolveSwipe(
              delta: const Offset(30, 5), velocity: const Offset(-1500, 0), cardSize: card),
          isNull);
    });
  });

  group('AdGate', () {
    const AdGate gate = AdGate(swipesPerAd: 100);

    test('due exactly at 100 swipes, not before', () {
      expect(gate.isDue(swipesSinceAd: 99, adsRemoved: false), isFalse);
      expect(gate.isDue(swipesSinceAd: 100, adsRemoved: false), isTrue);
    });

    test('stays due until shown', () {
      expect(gate.isDue(swipesSinceAd: 140, adsRemoved: false), isTrue);
    });

    test('never due after purchase', () {
      expect(gate.isDue(swipesSinceAd: 1000, adsRemoved: true), isFalse);
    });

    test('remaining counter never negative', () {
      expect(gate.remaining(swipesSinceAd: 30), 70);
      expect(gate.remaining(swipesSinceAd: 130), 0);
    });
  });

  group('album name rules', () {
    test('screenshot folders in several languages', () {
      for (final String n in <String>['Screenshots', 'screenshot', '螢幕截圖', '截图', 'スクリーンショット', '스크린샷']) {
        expect(isScreenshotAlbumName(n), isTrue, reason: n);
      }
      expect(isScreenshotAlbumName('Camera'), isFalse);
    });

    test('LINE album but not words containing "line"', () {
      expect(isLineAlbumName('LINE'), isTrue);
      expect(isLineAlbumName('line'), isTrue);
      expect(isLineAlbumName('LINE Album'), isTrue);
      expect(isLineAlbumName('LINE_Downloads'), isTrue);
      expect(isLineAlbumName('Timeline'), isFalse);
      expect(isLineAlbumName('Lines of Code'), isFalse);
      expect(isLineAlbumName('Online'), isFalse);
    });
  });

  group('formatters', () {
    test('formatBytes', () {
      expect(formatBytes(512), '512 B');
      expect(formatBytes(1536), '1.5 KB');
      expect(formatBytes(5 * 1024 * 1024), '5.0 MB');
      expect(formatBytes(3 * 1024 * 1024 * 1024), '3.0 GB');
      expect(formatBytes(250 * 1024 * 1024), '250 MB');
    });

    test('MonthKey ordering and equality', () {
      final List<MonthKey> ms = <MonthKey>[
        const MonthKey(2024, 5),
        const MonthKey(2023, 12),
        const MonthKey(2024, 1),
      ]..sort();
      expect(ms.map((MonthKey m) => m.toString()), <String>['2023-12', '2024-01', '2024-05']);
      expect(MonthKey.of(DateTime(2024, 5, 31, 23)), const MonthKey(2024, 5));
      expect(const MonthKey(2024, 12).end, DateTime(2025, 1));
    });
  });

  group('similarity', () {
    test('hamming distance', () {
      expect(hammingDistance(0, 0), 0);
      expect(hammingDistance(0, 7), 3);
      expect(hammingDistance(-1, 0), 64); // all 64 bits set
    });

    test('same picture → same hash; re-encoded copy → tiny distance', () {
      final img.Image a = _scene(1);
      final ImageFeatures? f1 = computeFeatures(_jpg(a));
      final ImageFeatures? f2 =
          computeFeatures(Uint8List.fromList(img.encodeJpg(a, quality: 60)));
      expect(f1, isNotNull);
      expect(hammingDistance(f1!.hash, f2!.hash), lessThanOrEqualTo(similarMaxDistance));
    });

    test('different pictures → large distance', () {
      final ImageFeatures base = computeFeatures(_jpg(_scene(1)))!;
      for (int seed = 2; seed < 12; seed++) {
        final ImageFeatures other = computeFeatures(_jpg(_scene(seed)))!;
        expect(hammingDistance(base.hash, other.hash), greaterThan(similarMaxDistance),
            reason: 'seed $seed');
      }
    });

    test('blurred copy is less sharp and flagged blurry', () {
      final img.Image sharp = _checkerboard();
      final img.Image blurred = img.gaussianBlur(img.Image.from(sharp), radius: 12);
      final ImageFeatures fs = computeFeatures(_jpg(sharp))!;
      final ImageFeatures fb = computeFeatures(_jpg(blurred))!;
      expect(fs.sharpness, greaterThan(fb.sharpness * 5));
      expect(fs.sharpness, greaterThan(blurryThreshold));
      expect(fb.sharpness, lessThan(blurryThreshold));
    });

    test('undecodable bytes return null instead of throwing', () {
      expect(computeFeatures(Uint8List.fromList(<int>[1, 2, 3])), isNull);
      expect(computeFeaturesBatch(<Uint8List>[Uint8List(3)]), <List<num>?>[null]);
    });

    test('features JSON round trip keeps 64-bit hash', () {
      const ImageFeatures f = ImageFeatures(hash: -6148914691236517206, sharpness: 12.5);
      final ImageFeatures back = ImageFeatures.fromJson(f.toJson());
      expect(back.hash, f.hash);
      expect(back.sharpness, f.sharpness);
    });

    test('groupSimilar: bursts grouped, time gap and different scenes split', () {
      final DateTime t0 = DateTime(2024, 5, 1, 12);
      FeatureItem item(String id, int minutes, int hash, double sharp) => FeatureItem(
            id: id,
            taken: t0.add(Duration(minutes: minutes)),
            features: ImageFeatures(hash: hash, sharpness: sharp),
          );
      final List<List<FeatureItem>> groups = groupSimilar(<FeatureItem>[
        item('a1', 0, 0x0F0F, 50),
        item('a2', 1, 0x0F0E, 90), // 1 bit off, burst
        item('a3', 2, 0x0F0C, 20),
        item('b1', 3, 0x7FFFFFFFFFFF0000, 50), // different scene
        item('c1', 120, 0x0F0F, 50), // same look as a1 but 2h later
        item('d1', 200, 0x1234, 50),
        item('d2', 201, 0x1234, 70),
      ]);
      expect(groups.length, 2);
      // newest group first
      expect(groups[0].map((FeatureItem i) => i.id), <String>['d1', 'd2']);
      expect(groups[1].map((FeatureItem i) => i.id), <String>['a1', 'a2', 'a3']);
      expect(bestOf(groups[1]).id, 'a2');
    });

    test('bestOf breaks sharpness ties by resolution', () {
      final DateTime t = DateTime(2024);
      final FeatureItem small = FeatureItem(
          id: 's', taken: t, pixels: 100, features: const ImageFeatures(hash: 0, sharpness: 10));
      final FeatureItem big = FeatureItem(
          id: 'b', taken: t, pixels: 900, features: const ImageFeatures(hash: 0, sharpness: 10));
      expect(bestOf(<FeatureItem>[small, big]).id, 'b');
    });
  });

  group('achievements', () {
    test('counter thresholds', () {
      final Set<String> none = earnedFromCounters(
          const AchievementInput(totalSwipes: 0, bytesFreed: 0, bestStreak: 0));
      expect(none, isEmpty);
      final Set<String> some = earnedFromCounters(const AchievementInput(
          totalSwipes: 150, bytesFreed: 2 * 1024 * 1024 * 1024, bestStreak: 7));
      expect(some, containsAll(<String>['first_swipe', 'swipes_100', 'freed_100mb', 'freed_1gb', 'streak_3', 'streak_7']));
      expect(some, isNot(contains('swipes_1000')));
      expect(some, isNot(contains('streak_30')));
    });

    test('every achievement id is unique', () {
      final List<String> ids = allAchievements.map((Achievement a) => a.id).toList();
      expect(ids.toSet().length, ids.length);
    });
  });
}
