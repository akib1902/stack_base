import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/state_message.dart';

class CloudScreen extends StatelessWidget {
  const CloudScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.stackColors.background,
      appBar: const StackBaseAppBar(title: 'Cloud files'),
      body: Center(
        child: SingleChildScrollView(
          child: StateMessage(
            icon: Icons.cloud_queue_rounded,
            title: 'Cloud browsing arrives next',
            message:
                'This milestone connects the app to the shared backend and '
                'verifies the session. The next milestone adds the real '
                'StackBase namespace, cached metadata and offline reads. No '
                'placeholder files are shown.',
            actionLabel: 'Back to Home',
            onAction: () => context.go('/home'),
          ),
        ),
      ),
    );
  }
}
