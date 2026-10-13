import 'dart:typed_data';

import 'package:image/image.dart' as img;

/// On-device image fingerprints. Everything here is pure Dart so it can run
/// inside an isolate via `compute` and be unit tested without a device.
/// No photo ever leaves the phone.

class ImageFeatures {
  const ImageFeatures({required this.hash, required this.sharpness});

  /// 64-bit difference hash (dHash). Similar pictures → small Hamming distance.
  final int hash;

  /// Variance of the Laplacian on a downscaled grayscale copy.
  /// Higher = more edges = sharper. Blurry photos score low.
  final double sharpness;

  List<num> toJson() => <num>[hash, sharpness];

  static ImageFeatures fromJson(List<dynamic> json) => ImageFeatures(
        hash: (json[0] as num).toInt(),
        sharpness: (json[1] as num).toDouble(),
      );
}

/// Below this Laplacian variance a photo is offered in the "可能模糊" deck.
const double blurryThreshold = 35;

/// Two photos are "similar" when their dHashes differ in at most this many bits.
const int similarMaxDistance = 10;

double _luma(img.Pixel p) => 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;

/// Decodes an encoded thumbnail (JPEG/PNG) and computes its features.
/// Returns null when the bytes can't be decoded.
ImageFeatures? computeFeatures(Uint8List encoded) {
  final img.Image? decoded = img.decodeImage(encoded);
  if (decoded == null) return null;
  return ImageFeatures(
    hash: differenceHash(decoded),
    sharpness: laplacianVariance(decoded),
  );
}

/// Batch entry point for `compute`: one thumbnail per entry, null on failure.
List<List<num>?> computeFeaturesBatch(List<Uint8List> thumbnails) {
  return thumbnails
      .map((Uint8List bytes) => computeFeatures(bytes)?.toJson())
      .toList();
}

int differenceHash(img.Image source) {
  final img.Image small = img.copyResize(
    source,
    width: 9,
    height: 8,
    interpolation: img.Interpolation.average,
  );
  int hash = 0;
  for (int y = 0; y < 8; y++) {
    for (int x = 0; x < 8; x++) {
      hash <<= 1;
      if (_luma(small.getPixel(x, y)) > _luma(small.getPixel(x + 1, y))) {
        hash |= 1;
      }
    }
  }
  return hash;
}

double laplacianVariance(img.Image source, {int maxSide = 256}) {
  img.Image work = source;
  final int longest = source.width > source.height ? source.width : source.height;
  if (longest > maxSide) {
    work = source.width >= source.height
        ? img.copyResize(source, width: maxSide)
        : img.copyResize(source, height: maxSide);
  }
  final int w = work.width;
  final int h = work.height;
  if (w < 3 || h < 3) return 0;

  final Float64List gray = Float64List(w * h);
  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      gray[y * w + x] = _luma(work.getPixel(x, y)).toDouble();
    }
  }

  double sum = 0;
  double sumSq = 0;
  int n = 0;
  for (int y = 1; y < h - 1; y++) {
    for (int x = 1; x < w - 1; x++) {
      final int i = y * w + x;
      final double lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] -
          4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  final double mean = sum / n;
  return sumSq / n - mean * mean;
}

int hammingDistance(int a, int b) {
  int x = a ^ b;
  int count = 0;
  while (x != 0) {
    x &= x - 1; // clear lowest set bit; works for negative ints too
    count++;
  }
  return count;
}

/// Minimal data the grouping step needs about one photo.
class FeatureItem {
  const FeatureItem({
    required this.id,
    required this.taken,
    required this.features,
    this.pixels = 0,
  });

  final String id;
  final DateTime taken;
  final ImageFeatures features;
  final int pixels;
}

/// Groups bursts / near-duplicates.
///
/// Photos are walked in time order. A photo joins the open group when it was
/// taken within [window] of the group's last photo AND looks like one of the
/// group's last few photos. Only groups with 2+ photos are returned, newest
/// group first.
List<List<FeatureItem>> groupSimilar(
  List<FeatureItem> items, {
  Duration window = const Duration(minutes: 10),
  int maxDistance = similarMaxDistance,
}) {
  final List<FeatureItem> sorted = List<FeatureItem>.of(items)
    ..sort((FeatureItem a, FeatureItem b) => a.taken.compareTo(b.taken));

  final List<List<FeatureItem>> groups = <List<FeatureItem>>[];
  List<FeatureItem> current = <FeatureItem>[];

  bool fits(FeatureItem item) {
    if (current.isEmpty) return false;
    final FeatureItem last = current.last;
    if (item.taken.difference(last.taken).abs() > window) return false;
    final int from = current.length > 3 ? current.length - 3 : 0;
    for (int i = current.length - 1; i >= from; i--) {
      if (hammingDistance(item.features.hash, current[i].features.hash) <=
          maxDistance) {
        return true;
      }
    }
    return false;
  }

  for (final FeatureItem item in sorted) {
    if (fits(item)) {
      current.add(item);
    } else {
      if (current.length >= 2) groups.add(current);
      current = <FeatureItem>[item];
    }
  }
  if (current.length >= 2) groups.add(current);

  return groups.reversed.toList();
}

/// The photo to keep from a similar group: sharpest, then highest resolution.
FeatureItem bestOf(List<FeatureItem> group) {
  FeatureItem best = group.first;
  for (final FeatureItem item in group.skip(1)) {
    final double a = item.features.sharpness;
    final double b = best.features.sharpness;
    if (a > b || (a == b && item.pixels > best.pixels)) best = item;
  }
  return best;
}
