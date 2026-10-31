import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/models/me_response.dart';
import '../../../core/models/setup_status.dart';
import '../../../core/providers.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/offline_banner.dart';
import '../../../core/ui/components/section_header.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/status_pill.dart';
import '../../../core/ui/formatters.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final me = ref.watch(meProvider);
    final setup = ref.watch(setupStatusProvider);
    final health = ref.watch(healthProvider);
    final interfaceOffline = ref.watch(interfaceOfflineProvider);

    final healthFailed = health.hasError && !health.isLoading;
    final bannerMessage = interfaceOffline
        ? 'You are offline. This build shows the last known server state '
              'until the API is reachable again.'
        : healthFailed
        ? 'The API is unreachable. Check the connection and the configured '
              'API address.'
        : null;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const StackBaseAppBar(title: 'Home'),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (bannerMessage != null)
              OfflineBanner(
                message: bannerMessage,
                onRetry: () {
                  ref.invalidate(healthProvider);
                  ref.invalidate(meProvider);
                  ref.invalidate(setupStatusProvider);
                },
              ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _refresh(ref),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(
                        Space.x4,
                        Space.x4,
                        Space.x4,
                        Space.x8,
                      ),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 960),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _Greeting(me: me),
                              const SizedBox(height: Space.x5),
                              _BentoGrid(
                                width: constraints.maxWidth,
                                children: [
                                  _LibraryCard(setup: setup),
                                  _StorageCard(setup: setup),
                                  _EncryptionCard(setup: setup),
                                  _ServerCard(health: health),
                                ],
                              ),
                              const SizedBox(height: Space.x4),
                              AppCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SectionHeader(
                                      title: 'Quick actions',
                                      subtitle:
                                          'Open a workspace. Filled actions '
                                          'always navigate to a real screen.',
                                    ),
                                    const SizedBox(height: Space.x3),
                                    Wrap(
                                      spacing: Space.x2,
                                      runSpacing: Space.x2,
                                      children: [
                                        FilledButton.icon(
                                          onPressed: () => context.go('/cloud'),
                                          icon: const Icon(
                                            Icons.cloud_outlined,
                                            size: 18,
                                          ),
                                          label: const Text('Cloud files'),
                                        ),
                                        OutlinedButton.icon(
                                          onPressed: () => context.go('/local'),
                                          icon: const Icon(
                                            Icons.folder_outlined,
                                            size: 18,
                                          ),
                                          label: const Text('Local files'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(meProvider);
    ref.invalidate(setupStatusProvider);
    ref.invalidate(healthProvider);
    try {
      await Future.wait([
        ref.read(meProvider.future),
        ref.read(setupStatusProvider.future),
        ref.read(healthProvider.future),
      ]);
    } catch (_) {
      // Each card renders its own failure; the indicator just completes.
    }
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.me});

  final AsyncValue<MeResponse> me;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final user = me.value?.user;
    final name = user?.displayName?.trim();
    final email = user?.email;
    final title = switch (DateTime.now().hour) {
      < 12 => 'Good morning',
      < 18 => 'Good afternoon',
      _ => 'Good evening',
    };
    final subtitle = me.isLoading
        ? 'Loading your account…'
        : me.hasError
        ? 'Account details are unavailable'
        : name?.isNotEmpty == true
        ? name!
        : email ?? 'Signed in';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: Space.x1),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              if (email != null && name?.isNotEmpty == true) ...[
                const SizedBox(height: Space.x1),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: Space.x3),
        Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: colors.primary.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(Radii.control),
            border: Border.all(color: colors.primary.withValues(alpha: 0.32)),
          ),
          child: Text(
            initialsFor(name, email),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: colors.primaryInk,
            ),
          ),
        ),
      ],
    );
  }
}

class _BentoGrid extends StatelessWidget {
  const _BentoGrid({required this.width, required this.children});

  final double width;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final columns = width >= 640 ? 2 : 1;
    if (columns == 1) {
      return Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(height: Space.x3),
            children[i],
          ],
        ],
      );
    }
    return Column(
      children: [
        for (var i = 0; i < children.length; i += 2) ...[
          if (i > 0) const SizedBox(height: Space.x3),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: children[i]),
              const SizedBox(width: Space.x3),
              Expanded(
                child: i + 1 < children.length
                    ? children[i + 1]
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: colors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(Radii.chipSmall),
                ),
                child: Icon(icon, size: 18, color: colors.primaryInk),
              ),
              const SizedBox(width: Space.x2),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.x3),
          child,
        ],
      ),
    );
  }
}

class _LibraryCard extends StatelessWidget {
  const _LibraryCard({required this.setup});

  final AsyncValue<SetupStatusResponse> setup;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return _CardShell(
      icon: Icons.inventory_2_outlined,
      title: 'Library',
      child: setup.when(
        loading: () => const _CardLoading(label: 'Reading library totals'),
        error: (error, _) => _InlineError(
          message: error is ApiException
              ? error.userMessage
              : 'Library totals are unavailable.',
        ),
        data: (value) {
          final library = value.library;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${library.files}',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(width: Space.x2),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      library.files == 1 ? 'file' : 'files',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Space.x1),
              Text(
                '${library.folders} '
                '${library.folders == 1 ? 'folder' : 'folders'} · '
                '${formatBytes(library.bytes)}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (library.files == 0) ...[
                const SizedBox(height: Space.x2),
                Text(
                  'Your library is empty. Uploads are enabled in a later '
                  'milestone; nothing is hidden here.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _StorageCard extends StatelessWidget {
  const _StorageCard({required this.setup});

  final AsyncValue<SetupStatusResponse> setup;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return _CardShell(
      icon: Icons.cloud_outlined,
      title: 'Storage',
      child: setup.when(
        loading: () => const _CardLoading(label: 'Checking storage'),
        error: (error, _) => _InlineError(
          message: error is ApiException
              ? error.userMessage
              : 'Storage status is unavailable.',
        ),
        data: (value) {
          final storage = value.storage;
          final (label, tone) = switch (storage.status) {
            StorageConnectionStatus.connected => (
              'Connected',
              StatusTone.success,
            ),
            StorageConnectionStatus.notConfigured => (
              'Not configured',
              StatusTone.warning,
            ),
            StorageConnectionStatus.error => ('Error', StatusTone.danger),
            StorageConnectionStatus.expired => ('Expired', StatusTone.danger),
            StorageConnectionStatus.disconnected => (
              'Disconnected',
              StatusTone.warning,
            ),
          };
          final provider = switch (storage.provider) {
            StorageProvider.telegram => 'Telegram Saved Messages',
            StorageProvider.local => 'Local development storage',
          };
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StatusPill(label: label, tone: tone),
              const SizedBox(height: Space.x2),
              Text(provider, style: Theme.of(context).textTheme.bodyMedium),
              if (storage.accountIdentifier != null) ...[
                const SizedBox(height: Space.x1),
                Text(
                  storage.accountIdentifier!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.mutedForeground,
                  ),
                ),
              ],
              if (storage.status != StorageConnectionStatus.connected) ...[
                const SizedBox(height: Space.x2),
                Text(
                  'Reconnect or finish storage setup on the web app. Uploads '
                  'stay blocked until the server reports a connection.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.mutedForeground,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _EncryptionCard extends StatelessWidget {
  const _EncryptionCard({required this.setup});

  final AsyncValue<SetupStatusResponse> setup;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return _CardShell(
      icon: Icons.lock_outline_rounded,
      title: 'Encryption',
      child: setup.when(
        loading: () => const _CardLoading(label: 'Checking vault'),
        error: (error, _) => _InlineError(
          message: error is ApiException
              ? error.userMessage
              : 'Vault status is unavailable.',
        ),
        data: (value) {
          final configured =
              value.encryption.vault == EncryptionVaultStatus.configured;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StatusPill(
                label: configured ? 'Vault configured' : 'No vault yet',
                tone: configured ? StatusTone.success : StatusTone.warning,
              ),
              const SizedBox(height: Space.x2),
              Text(
                configured
                    ? 'Your vault exists. Unlock it in Settings to use '
                          'encryption on this device; the passphrase and key '
                          'stay in memory for the session only.'
                    : 'Create the vault in Settings before encrypted uploads '
                          'can start. No plaintext or key leaves the device.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.mutedForeground,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ServerCard extends ConsumerWidget {
  const _ServerCard({required this.health});

  final AsyncValue<HealthResponse> health;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    return _CardShell(
      icon: Icons.dns_outlined,
      title: 'Server',
      child: health.when(
        loading: () => const _CardLoading(label: 'Pinging the API'),
        error: (error, _) => _InlineError(
          message: error is ApiException
              ? error.userMessage
              : 'The API health check failed.',
          onRetry: () => ref.invalidate(healthProvider),
        ),
        data: (value) {
          final healthy = value.status == HealthStatus.ok;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StatusPill(
                label: healthy ? 'API healthy' : 'API degraded',
                tone: healthy ? StatusTone.success : StatusTone.warning,
              ),
              const SizedBox(height: Space.x2),
              Text(
                'Version ${value.version}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: Space.x1),
              Text(
                'Database ${switch (value.database) {
                  DatabaseHealth.ok => 'online',
                  DatabaseHealth.unavailable => 'unavailable',
                  DatabaseHealth.notChecked => 'not checked',
                }}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.mutedForeground,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CardLoading extends StatelessWidget {
  const _CardLoading({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const LinearProgressIndicator(minHeight: 3),
        const SizedBox(height: Space.x2),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          message,
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: colors.error),
        ),
        if (onRetry != null) ...[
          const SizedBox(height: Space.x2),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 36),
              padding: EdgeInsets.zero,
            ),
            child: const Text('Retry'),
          ),
        ],
      ],
    );
  }
}
