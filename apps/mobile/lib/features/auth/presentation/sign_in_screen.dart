import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/app_config.dart';
import '../../../core/models/setup_status.dart';
import '../../../core/providers.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/stackbase_mark.dart';
import '../../../core/ui/components/status_pill.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final config = ref.watch(appConfigProvider);
    final auth = ref.watch(authControllerProvider).value;
    final busy = auth?.busy ?? false;
    final expired = auth?.status == AuthStatus.expired;
    final message = auth?.message;

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Space.x5),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: StackBaseMark(size: 52),
                  ),
                  const SizedBox(height: Space.x5),
                  Text(
                    'StackBase',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: Space.x1),
                  Text(
                    'Your encrypted drive, on the go.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: Space.x6),
                  AppCard(
                    padding: const EdgeInsets.all(Space.x5),
                    child: Form(
                      key: _formKey,
                      child: AutofillGroup(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Sign in',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: Space.x1),
                            Text(
                              config.resolvedAuthMode == AuthMode.dev
                                  ? 'This development build talks to a local '
                                        'StackBase API.'
                                  : 'Use your StackBase account.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: colors.mutedForeground),
                            ),
                            if (message != null) ...[
                              const SizedBox(height: Space.x4),
                              _MessageBanner(
                                message: message,
                                isExpired: expired,
                              ),
                            ],
                            const SizedBox(height: Space.x4),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.email],
                              autocorrect: false,
                              enabled: !busy,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                hintText: 'you@example.com',
                                prefixIcon: Icon(Icons.mail_outline_rounded),
                              ),
                              validator: _validateEmail,
                            ),
                            if (config.resolvedAuthMode ==
                                AuthMode.supabase) ...[
                              const SizedBox(height: Space.x3),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.done,
                                autofillHints: const [AutofillHints.password],
                                enabled: !busy,
                                onFieldSubmitted: (_) => _signIn(),
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(
                                    Icons.lock_outline_rounded,
                                  ),
                                  suffixIcon: IconButton(
                                    onPressed: () {
                                      setState(() {
                                        _obscurePassword = !_obscurePassword;
                                      });
                                    },
                                    tooltip: _obscurePassword
                                        ? 'Show password'
                                        : 'Hide password',
                                    icon: Icon(
                                      _obscurePassword
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                    ),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Enter your password.';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: Space.x5),
                              FilledButton(
                                onPressed: busy ? null : _signIn,
                                child: busy
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text('Sign in'),
                              ),
                            ],
                            if (config.devAuthEnabled) ...[
                              const SizedBox(height: Space.x5),
                              Row(
                                children: [
                                  Expanded(
                                    child: Divider(color: colors.border),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: Space.x2,
                                    ),
                                    child: Text(
                                      'LOCAL DEVELOPMENT',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: colors.mutedForeground,
                                            letterSpacing: 0.6,
                                          ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Divider(color: colors.border),
                                  ),
                                ],
                              ),
                              const SizedBox(height: Space.x3),
                              Text(
                                'Issues a real session from the local API in '
                                'AUTH_MODE=dev. Disabled in release builds.',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: colors.mutedForeground),
                              ),
                              const SizedBox(height: Space.x3),
                              OutlinedButton.icon(
                                onPressed: busy ? null : _signInDev,
                                icon: const Icon(
                                  Icons.terminal_rounded,
                                  size: 18,
                                ),
                                label: const Text('Use development session'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.x4),
                  _ServerStatus(config: config),
                  const SizedBox(height: Space.x3),
                  Text(
                    'Tokens are stored in the platform keystore, never in '
                    'shared preferences. File keys never leave the device.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'Enter your email address.';
    if (!email.contains('@') || email.startsWith('@') || email.endsWith('@')) {
      return 'Enter a valid email address.';
    }
    return null;
  }

  Future<void> _signIn() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;
    TextInput.finishAutofillContext();
    final password = _passwordController.text;
    await ref
        .read(authControllerProvider.notifier)
        .signInWithPassword(
          email: _emailController.text.trim(),
          password: password,
        );
    _passwordController.clear();
  }

  Future<void> _signInDev() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;
    await ref
        .read(authControllerProvider.notifier)
        .signInWithDevSession(_emailController.text.trim());
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message, required this.isExpired});

  final String message;
  final bool isExpired;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final color = isExpired ? colors.primaryInk : colors.error;
    return Container(
      padding: const EdgeInsets.all(Space.x3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(Radii.control),
        border: Border.all(color: color.withValues(alpha: 0.32)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isExpired ? Icons.lock_clock_outlined : Icons.error_outline_rounded,
            color: color,
            size: 18,
          ),
          const SizedBox(width: Space.x2),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServerStatus extends ConsumerWidget {
  const _ServerStatus({required this.config});

  final AppConfig config;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final health = ref.watch(healthProvider);
    final api = config.apiBaseUrl?.toString() ?? 'not configured';

    final (label, tone) = health.when(
      loading: () => ('Checking API', StatusTone.neutral),
      error: (error, _) => (
        'API unreachable',
        StatusTone.danger,
      ),
      data: (value) => (
        value.status == HealthStatus.ok ? 'API reachable' : 'API degraded',
        value.status == HealthStatus.ok
            ? StatusTone.success
            : StatusTone.warning,
      ),
    );

    return AppCard(
      padding: const EdgeInsets.all(Space.x3),
      child: Row(
        children: [
          StatusPill(label: label, tone: tone),
          const SizedBox(width: Space.x2),
          Expanded(
            child: Text(
              api,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: colors.mutedForeground),
            ),
          ),
          IconButton(
            onPressed: () => ref.invalidate(healthProvider),
            tooltip: 'Check API again',
            icon: const Icon(Icons.refresh_rounded, size: 20),
          ),
        ],
      ),
    );
  }
}
