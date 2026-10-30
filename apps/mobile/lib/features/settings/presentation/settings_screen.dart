import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../app/theme/tokens.dart';
import '../../../app/theme/theme_controller.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/config/app_config.dart';
import '../../../core/models/me_response.dart';
import '../../../core/models/setup_status.dart';
import '../../../core/models/user_settings.dart';
import '../../../core/providers.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/section_header.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/status_pill.dart';
import '../../../core/ui/formatters.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final me = ref.watch(meProvider);
    final setup = ref.watch(setupStatusProvider);
    final health = ref.watch(healthProvider);
    final packageInfo = ref.watch(packageInfoProvider);
    final auth = ref.watch(authControllerProvider).value;
    final config = ref.watch(appConfigProvider);
    final themeMode = ref.watch(themeModeProvider).value ?? ThemeMode.system;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: const StackBaseAppBar(title: 'Settings', showTransfers: false),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(meProvider);
          ref.invalidate(setupStatusProvider);
          ref.invalidate(healthProvider);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            Space.x4,
            Space.x4,
            Space.x4,
            Space.x8,
          ),
          children: [
            _AccountCard(
              me: me,
              auth: auth,
              config: config,
              onRetry: () => ref.invalidate(meProvider),
            ),
            const SizedBox(height: Space.x5),
            const SectionHeader(
              title: 'Appearance',
              subtitle:
                  'The device choice applies immediately. The account default '
                  'is saved to the shared backend.',
            ),
            const SizedBox(height: Space.x3),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SegmentedButton<ThemeMode>(
                    showSelectedIcon: false,
                    segments: const [
                      ButtonSegment(
                        value: ThemeMode.system,
                        label: Text('System'),
                        icon: Icon(Icons.brightness_auto_rounded, size: 18),
                      ),
                      ButtonSegment(
                        value: ThemeMode.light,
                        label: Text('Light'),
                        icon: Icon(Icons.light_mode_outlined, size: 18),
                      ),
                      ButtonSegment(
                        value: ThemeMode.dark,
                        label: Text('Dark'),
                        icon: Icon(Icons.dark_mode_outlined, size: 18),
                      ),
                    ],
                    selected: {themeMode},
                    onSelectionChanged: (selection) {
                      _applyTheme(
                        context,
                        ref,
                        selection.first,
                      );
                    },
                  ),
                  const SizedBox(height: Space.x3),
                  Text(
                    themeMode == ThemeMode.system
                        ? 'Following the device appearance.'
                        : themeMode == ThemeMode.light
                        ? 'Amber Minimal is active.'
                        : 'Graphite Terminal is active.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.x5),
            const SectionHeader(title: 'Server and storage'),
            const SizedBox(height: Space.x3),
            _ServerCard(health: health),
            const SizedBox(height: Space.x3),
            _SetupCard(setup: setup),
            const SizedBox(height: Space.x5),
            const SectionHeader(title: 'About'),
            const SizedBox(height: Space.x3),
            _AboutCard(
              packageInfo: packageInfo,
              config: config,
              auth: auth,
            ),
            const SizedBox(height: Space.x5),
            OutlinedButton.icon(
              onPressed: (auth?.busy ?? false) ? null : () => _signOut(context, ref),
              style: OutlinedButton.styleFrom(
                foregroundColor: colors.error,
                side: BorderSide(color: colors.error.withValues(alpha: 0.5)),
              ),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: Text(auth?.busy == true ? 'Signing out…' : 'Sign out'),
            ),
            const SizedBox(height: Space.x3),
            Text(
              'Signing out clears the access token, the vault key and '
              'device-scoped account data. It does not delete anything from '
              'your StackBase account.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _applyTheme(
    BuildContext context,
    WidgetRef ref,
    ThemeMode mode,
  ) async {
    final isDark = switch (mode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system =>
        MediaQuery.platformBrightnessOf(context) == Brightness.dark,
    };
    await ref.read(themeModeProvider.notifier).setMode(mode);
    try {
      await ref
          .read(apiClientProvider)
          .updateSettings(
            UserSettingsUpdate(theme: isDark ? ServerTheme.graphite : ServerTheme.amber),
          );
    } on ApiException catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Theme applied on this device, but the account default was not '
            'saved: ${error.userMessage}',
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Theme applied on this device, but the account default was not '
            'saved.',
          ),
        ),
      );
    }
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Sign out?'),
          content: const Text(
            'The session, vault key and device-scoped account data are removed '
            'from this device. Your files remain in your StackBase account.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Sign out'),
            ),
          ],
        );
      },
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).signOut();
    }
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({
    required this.me,
    required this.auth,
    required this.config,
    required this.onRetry,
  });

  final AsyncValue<MeResponse> me;
  final AuthState? auth;
  final AppConfig config;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final user = me.value?.user;
    final session = auth?.session;
    final email = user?.email ?? session?.email;
    final name = user?.displayName?.trim();
    final source = switch (session?.source) {
      AuthSource.supabase => 'Supabase Auth',
      AuthSource.dev => 'Development session',
      null => null,
    };

    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
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
          const SizedBox(width: Space.x3),
          Expanded(
            child: me.when(
              loading: () => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Loading account…', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: Space.x2),
                  const LinearProgressIndicator(minHeight: 3),
                ],
              ),
              error: (error, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    email ?? 'Account details unavailable',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: Space.x1),
                  Text(
                    'Could not refresh /me. The session is still active.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colors.error,
                    ),
                  ),
                  TextButton(
                    onPressed: onRetry,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(48, 36),
                      padding: EdgeInsets.zero,
                    ),
                    child: const Text('Retry'),
                  ),
                ],
              ),
              data: (value) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name?.isNotEmpty == true ? name! : (email ?? 'Signed in'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (email != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      email,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                  const SizedBox(height: Space.x2),
                  Wrap(
                    spacing: Space.x2,
                    runSpacing: Space.x2,
                    children: [
                      if (source != null) StatusPill(label: source),
                      StatusPill(
                        label: config.isDebug ? 'Debug build' : 'Release build',
                        tone: config.isDebug
                            ? StatusTone.warning
                            : StatusTone.neutral,
                      ),
                      if (user != null)
                        StatusPill(
                          label: 'Member since ${formatDate(user.createdAt)}',
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
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
    final config = ref.watch(appConfigProvider);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.dns_outlined, size: 20, color: colors.primaryInk),
              const SizedBox(width: Space.x2),
              Expanded(
                child: Text(
                  'StackBase API',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              IconButton(
                onPressed: () => ref.invalidate(healthProvider),
                tooltip: 'Check API again',
                icon: const Icon(Icons.refresh_rounded, size: 20),
              ),
            ],
          ),
          Text(
            config.apiBaseUrl?.toString() ?? 'Not configured',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colors.mutedForeground,
            ),
          ),
          const SizedBox(height: Space.x3),
          health.when(
            loading: () => const LinearProgressIndicator(minHeight: 3),
            error: (error, _) => Text(
              error is ApiException
                  ? error.userMessage
                  : 'The health check failed.',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: colors.error),
            ),
            data: (value) {
              final healthy = value.status == HealthStatus.ok;
              return Row(
                children: [
                  StatusPill(
                    label: healthy ? 'Healthy' : 'Degraded',
                    tone: healthy ? StatusTone.success : StatusTone.warning,
                  ),
                  const SizedBox(width: Space.x2),
                  Text(
                    'v${value.version}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _SetupCard extends StatelessWidget {
  const _SetupCard({required this.setup});

  final AsyncValue<SetupStatusResponse> setup;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return AppCard(
      child: setup.when(
        loading: () => const LinearProgressIndicator(minHeight: 3),
        error: (error, _) => Text(
          error is ApiException
              ? error.userMessage
              : 'Setup status is unavailable.',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: colors.error),
        ),
        data: (value) {
          final storage = value.storage;
          final vaultConfigured =
              value.encryption.vault == EncryptionVaultStatus.configured;
          final (storageLabel, storageTone) = switch (storage.status) {
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
            StorageProvider.telegram => 'Telegram',
            StorageProvider.local => 'Local development storage',
          };
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Storage · $provider',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  StatusPill(label: storageLabel, tone: storageTone),
                ],
              ),
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
              const Divider(height: Space.x5),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Encryption vault',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  StatusPill(
                    label: vaultConfigured ? 'Configured' : 'Not configured',
                    tone: vaultConfigured
                        ? StatusTone.success
                        : StatusTone.warning,
                  ),
                ],
              ),
              const SizedBox(height: Space.x2),
              Text(
                'Vault unlock and key handling stay on the device and are '
                'added with the crypto milestone. This screen never asks for '
                'a passphrase.',
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

class _AboutCard extends StatelessWidget {
  const _AboutCard({
    required this.packageInfo,
    required this.config,
    required this.auth,
  });

  final AsyncValue<PackageInfo> packageInfo;
  final AppConfig config;
  final AuthState? auth;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final info = packageInfo.value;
    final authLabel = switch (config.resolvedAuthMode) {
      AuthMode.supabase => 'Supabase Auth',
      AuthMode.dev => 'Development sessions',
      null => 'Not configured',
    };
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AboutRow(label: 'Application', value: 'StackBase Mobile'),
          _AboutRow(
            label: 'Version',
            value: info == null ? 'Loading…' : '${info.version} (${info.buildNumber})',
          ),
          _AboutRow(
            label: 'Package',
            value: info?.packageName ?? 'app.stackbase.stackbase_mobile',
          ),
          _AboutRow(label: 'Authentication', value: authLabel),
          _AboutRow(
            label: 'Session',
            value: auth?.isSignedIn == true
                ? 'Signed in'
                : auth?.isExpired == true
                ? 'Expired'
                : 'Signed out',
          ),
          const SizedBox(height: Space.x2),
          Text(
            'Client-side encryption is not enabled in this build. No file '
            'content or key material is sent to the API.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _AboutRow extends StatelessWidget {
  const _AboutRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.x1),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}
