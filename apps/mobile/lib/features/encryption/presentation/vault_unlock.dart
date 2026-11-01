import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/tokens.dart';
import 'vault_controller.dart';

/// Ensures the in-memory vault key is available. A locked vault prompts for the
/// passphrase; a missing vault explains where to create one. The passphrase is
/// never stored, logged or sent over the network.
Future<bool> ensureVaultUnlocked(BuildContext context, WidgetRef ref) async {
  final before = ref.read(vaultControllerProvider).value;
  if (before?.isUnlocked == true) return true;

  if (before == null || before.phase == VaultPhase.signedOut) {
    _show(context, 'Sign in before using encrypted files.');
    return false;
  }
  if (before.record == null) {
    _show(
      context,
      before.phase == VaultPhase.unavailable
          ? before.message ?? 'The vault state is unavailable.'
          : 'Create an encryption vault in Settings before continuing.',
    );
    return false;
  }
  if (before.phase == VaultPhase.unavailable) {
    _show(context, before.message ?? 'The vault state is unavailable.');
    return false;
  }

  final controller = TextEditingController();
  final passphrase = await showDialog<String>(
    context: context,
    builder: (context) => _UnlockDialog(controller: controller),
  );
  controller.dispose();
  if (passphrase == null || !context.mounted) return false;

  await ref.read(vaultControllerProvider.notifier).unlock(passphrase);
  if (!context.mounted) return false;
  final after = ref.read(vaultControllerProvider).value;
  if (after?.isUnlocked == true) return true;
  _show(context, after?.message ?? 'The vault could not be unlocked.');
  return false;
}

void _show(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

class _UnlockDialog extends StatefulWidget {
  const _UnlockDialog({required this.controller});

  final TextEditingController controller;

  @override
  State<_UnlockDialog> createState() => _UnlockDialogState();
}

class _UnlockDialogState extends State<_UnlockDialog> {
  bool _obscure = true;
  String? _error;

  void _submit() {
    final value = widget.controller.text;
    if (value.isEmpty) {
      setState(() => _error = 'Enter the vault passphrase.');
      return;
    }
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return AlertDialog(
      title: const Text('Unlock encryption vault'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your passphrase is used on this device to unwrap the vault key. '
              'It is never stored or sent to the server.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: Space.x3),
            TextField(
              controller: widget.controller,
              autofocus: true,
              obscureText: _obscure,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Passphrase',
                errorText: _error,
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _obscure = !_obscure),
                  tooltip: _obscure ? 'Show passphrase' : 'Hide passphrase',
                  icon: Icon(
                    _obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Unlock')),
      ],
    );
  }
}
