import 'dart:io';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/section_header.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/state_message.dart';
import '../../../core/ui/formatters.dart';
import '../../encryption/presentation/vault_unlock.dart';
import '../../uploads/presentation/transfer_controller.dart';
import '../../uploads/presentation/transfers_sheet.dart';

/// Files this app created or decrypted, under its own Documents directory.
/// This is deliberately not a claim of device-wide storage: Android SAF /
/// MediaStore and iOS security-scoped locations are separate grants.
class LocalScreen extends ConsumerStatefulWidget {
  const LocalScreen({super.key});

  @override
  ConsumerState<LocalScreen> createState() => _LocalScreenState();
}

class _LocalScreenState extends ConsumerState<LocalScreen> {
  List<File> _files = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final documents = await getApplicationDocumentsDirectory();
      final directory = Directory(p.join(documents.path, 'StackBase'));
      if (!await directory.exists()) {
        if (mounted) {
          setState(() {
            _files = const [];
            _loading = false;
          });
        }
        return;
      }
      final entries = <File>[];
      await for (final entity in directory.list()) {
        if (entity is File) entries.add(entity);
      }
      entries.sort((a, b) => b.path.compareTo(a.path));
      if (!mounted) return;
      setState(() {
        _files = entries;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'The app-managed files could not be read on this device.';
      });
    }
  }

  Future<void> _pickAndUpload() async {
    final file = await openFile();
    if (file == null || !mounted) return;
    final unlocked = await ensureVaultUnlocked(context, ref);
    if (!unlocked || !mounted) return;
    try {
      await ref.read(transferControllerProvider.notifier).enqueue(file);
      if (!mounted) return;
      await showTransfersSheet(context);
    } on TransferException catch (error) {
      if (!mounted) return;
      _show(error.message);
    } catch (_) {
      if (!mounted) return;
      _show('The selected file could not be queued.');
    }
  }

  Future<void> _share(File file) async {
    await SharePlus.instance.share(ShareParams(files: [XFile(file.path)]));
  }

  Future<void> _delete(File file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete local copy?'),
        content: Text(
          '${p.basename(file.path)} is removed from this device only. The '
          'encrypted file in your StackBase account is not affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await file.delete();
      await _load();
    } catch (_) {
      if (!mounted) return;
      _show('The local copy could not be deleted.');
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Scaffold(
      backgroundColor: colors.background,
      appBar: StackBaseAppBar(
        title: 'Local files',
        actions: [
          IconButton(
            onPressed: _pickAndUpload,
            tooltip: 'Encrypt and upload a file',
            icon: const Icon(Icons.upload_file_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            Space.x4,
            Space.x4,
            Space.x4,
            Space.x8,
          ),
          children: [
            const SectionHeader(
              title: 'This app',
              subtitle:
                  'Decrypted downloads are saved here. Only files StackBase '
                  'created are shown; device-wide albums and folders require a '
                  'separate SAF, MediaStore or Files grant.',
            ),
            const SizedBox(height: Space.x3),
            AppCard(
              child: Row(
                children: [
                  Icon(
                    Icons.folder_special_outlined,
                    color: colors.primaryInk,
                  ),
                  const SizedBox(width: Space.x3),
                  Expanded(
                    child: Text(
                      '${_files.length} '
                      '${_files.length == 1 ? 'file' : 'files'} in '
                      'Documents/StackBase',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  const SizedBox(width: Space.x2),
                  OutlinedButton.icon(
                    onPressed: _pickAndUpload,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Upload'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.x5),
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(Space.x8),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_error != null)
              StateMessage(
                icon: Icons.folder_off_outlined,
                title: 'Local files are unavailable',
                message: _error!,
                actionLabel: 'Retry',
                onAction: _load,
                tone: StateMessageTone.error,
              )
            else if (_files.isEmpty)
              StateMessage(
                icon: Icons.folder_open_rounded,
                title: 'No local files yet',
                message:
                    'Upload a file to encrypt it before it leaves this device. '
                    'Files you download and decrypt from Cloud are saved here.',
                actionLabel: 'Upload a file',
                onAction: _pickAndUpload,
              )
            else
              AppCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    for (var index = 0; index < _files.length; index++) ...[
                      if (index > 0)
                        Divider(height: 1, color: colors.border),
                      _LocalFileRow(
                        file: _files[index],
                        onShare: () => _share(_files[index]),
                        onDelete: () => _delete(_files[index]),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: Space.x5),
            Text(
              'Deleting a local copy never deletes the encrypted cloud file. '
              'Nothing here is uploaded automatically.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocalFileRow extends StatelessWidget {
  const _LocalFileRow({
    required this.file,
    required this.onShare,
    required this.onDelete,
  });

  final File file;
  final VoidCallback onShare;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final stat = file.statSync();
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: colors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(Radii.chipSmall),
        ),
        child: Icon(
          Icons.description_outlined,
          size: 18,
          color: colors.primaryInk,
        ),
      ),
      title: Text(
        p.basename(file.path),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${formatBytes(stat.size)} · ${formatRelativeTime(stat.modified)}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: PopupMenuButton<String>(
        tooltip: 'File actions',
        onSelected: (action) {
          if (action == 'share') onShare();
          if (action == 'delete') onDelete();
        },
        itemBuilder: (context) => const [
          PopupMenuItem(
            value: 'share',
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.ios_share_rounded),
              title: Text('Share or export'),
            ),
          ),
          PopupMenuItem(
            value: 'delete',
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.delete_outline_rounded),
              title: Text('Delete local copy'),
            ),
          ),
        ],
      ),
    );
  }
}
