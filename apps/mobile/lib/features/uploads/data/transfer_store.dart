import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/models/transfers.dart';

/// App-private storage for the exact ciphertext stream. Only the `.part` file
/// and its manifest record live here; no plaintext, passphrase or key does.
class TransferStore {
  TransferStore({required this.accountId});

  final String accountId;

  Future<Directory> _directory() async {
    final support = await getApplicationSupportDirectory();
    final directory = Directory(
      p.join(support.path, 'stackbase', 'account-$accountId', 'staging'),
    );
    await directory.create(recursive: true);
    return directory;
  }

  Future<File> createStagingFile(String localId) async {
    final directory = await _directory();
    final file = File(p.join(directory.path, '$localId.part'));
    await file.parent.create(recursive: true);
    return file;
  }

  Future<void> save(StagedUpload record) async {
    final directory = await _directory();
    final recordFile = File(p.join(directory.path, '${record.localId}.json'));
    final temporary = File('${recordFile.path}.tmp');
    await temporary.writeAsString(
      jsonEncode(record.toJson()),
      flush: true,
    );
    await temporary.rename(recordFile.path);
  }

  Future<List<StagedUpload>> load() async {
    final directory = await _directory();
    final records = <StagedUpload>[];
    await for (final entity in directory.list()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      try {
        final raw = jsonDecode(await entity.readAsString());
        if (raw is! Map) continue;
        final record = StagedUpload.fromJson(
          Map<String, dynamic>.from(raw),
        );
        final part = File(p.join(directory.path, record.stagingFileName));
        if (!await part.exists()) {
          await entity.delete();
          continue;
        }
        records.add(record);
      } catch (_) {
        // A half-written or older record is discarded, never guessed at.
        try {
          await entity.delete();
        } catch (_) {
          // Best effort.
        }
      }
    }
    records.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return records;
  }

  Future<File> stagingFile(StagedUpload record) async {
    final directory = await _directory();
    return File(p.join(directory.path, record.stagingFileName));
  }

  Future<void> delete(String localId, String stagingFileName) async {
    final directory = await _directory();
    for (final file in <File>[
      File(p.join(directory.path, stagingFileName)),
      File(p.join(directory.path, '$localId.json')),
      File(p.join(directory.path, '$localId.json.tmp')),
    ]) {
      try {
        if (await file.exists()) await file.delete();
      } catch (_) {
        // Cancellation must still update the UI if the OS refuses a delete.
      }
    }
  }
}
