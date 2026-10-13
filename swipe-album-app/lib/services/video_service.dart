import 'dart:io';

import 'package:photo_manager/photo_manager.dart';
import 'package:video_compress/video_compress.dart';

class CompressResult {
  const CompressResult({
    required this.saved,
    required this.originalBytes,
    required this.newBytes,
  });

  /// The new, smaller video now in the library.
  final AssetEntity saved;
  final int originalBytes;
  final int newBytes;

  int get bytesSaved => originalBytes - newBytes;
}

/// "Compress & keep": re-encode a video to 720p, save it as a new item with
/// the original date, and leave the original for the user to delete (it goes
/// to the pending-delete tray, never deleted silently).
class VideoService {
  Future<CompressResult?> compressAndSave(AssetEntity video) async {
    final File? source = await video.originFile;
    if (source == null) return null;
    final int originalBytes = await source.length();

    final MediaInfo? info = await VideoCompress.compressVideo(
      source.path,
      quality: VideoQuality.Res1280x720Quality,
      includeAudio: true,
    );
    final String? path = info?.path;
    if (info == null || path == null || info.isCancel == true) return null;

    final File out = File(path);
    final int newBytes = await out.length();
    if (newBytes >= originalBytes) {
      await VideoCompress.deleteAllCache();
      return null; // already small; nothing to gain
    }

    final AssetEntity saved = await PhotoManager.editor.saveVideo(
      out,
      title: video.title,
      creationDate: video.createDateTime,
      latitude: video.latitude,
      longitude: video.longitude,
    );
    await VideoCompress.deleteAllCache();
    return CompressResult(
      saved: saved,
      originalBytes: originalBytes,
      newBytes: newBytes,
    );
  }

  Future<void> cancel() => VideoCompress.cancelCompression();
}
