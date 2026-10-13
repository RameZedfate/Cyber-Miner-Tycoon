import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

/// ImageProvider for a library asset at a given thumbnail size, so pictures
/// go through Flutter's normal ImageCache (no re-decoding while swiping).
@immutable
class AssetThumbProvider extends ImageProvider<AssetThumbProvider> {
  const AssetThumbProvider(this.asset, {this.width = 300, this.height = 300});

  final AssetEntity asset;
  final int width;
  final int height;

  /// A large thumbnail that keeps the photo's aspect ratio, for full cards.
  factory AssetThumbProvider.large(AssetEntity asset, {int longSide = 1440}) {
    final int w = asset.orientatedWidth;
    final int h = asset.orientatedHeight;
    if (w <= 0 || h <= 0) {
      return AssetThumbProvider(asset, width: longSide, height: longSide);
    }
    return w >= h
        ? AssetThumbProvider(asset,
            width: longSide, height: (longSide * h / w).round().clamp(1, longSide))
        : AssetThumbProvider(asset,
            width: (longSide * w / h).round().clamp(1, longSide), height: longSide);
  }

  @override
  Future<AssetThumbProvider> obtainKey(ImageConfiguration configuration) =>
      SynchronousFuture<AssetThumbProvider>(this);

  @override
  ImageStreamCompleter loadImage(
      AssetThumbProvider key, ImageDecoderCallback decode) {
    return MultiFrameImageStreamCompleter(
      codec: _load(key, decode),
      scale: 1.0,
      debugLabel: 'asset:${key.asset.id}',
    );
  }

  Future<ui.Codec> _load(AssetThumbProvider key, ImageDecoderCallback decode) async {
    final Uint8List? bytes = await key.asset.thumbnailDataWithSize(
      ThumbnailSize(key.width, key.height),
      quality: 90,
    );
    if (bytes == null || bytes.isEmpty) {
      throw StateError('No thumbnail for ${key.asset.id}');
    }
    final ui.ImmutableBuffer buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    return decode(buffer);
  }

  @override
  bool operator ==(Object other) =>
      other is AssetThumbProvider &&
      other.asset.id == asset.id &&
      other.width == width &&
      other.height == height;

  @override
  int get hashCode => Object.hash(asset.id, width, height);
}

/// Square-ish grid thumbnail with a video badge.
class AssetThumb extends StatelessWidget {
  const AssetThumb(this.asset, {super.key, this.size = 300, this.fit = BoxFit.cover});

  final AssetEntity asset;
  final int size;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        Image(
          image: AssetThumbProvider(asset, width: size, height: size),
          fit: fit,
          gaplessPlayback: true,
          errorBuilder: (_, _, _) => const ColoredBox(
            color: Colors.black12,
            child: Icon(Icons.broken_image_outlined),
          ),
          frameBuilder: (_, Widget child, int? frame, bool sync) => sync || frame != null
              ? child
              : const ColoredBox(color: Colors.black12),
        ),
        if (asset.type == AssetType.video)
          const Positioned(
            right: 4,
            bottom: 4,
            child: Icon(Icons.play_circle_fill, color: Colors.white, size: 20,
                shadows: <Shadow>[Shadow(blurRadius: 4)]),
          ),
      ],
    );
  }
}
