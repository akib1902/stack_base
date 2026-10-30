import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/state_message.dart';

class LocalScreen extends StatelessWidget {
  const LocalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.stackColors.background,
      appBar: const StackBaseAppBar(title: 'Local files'),
      body: Center(
        child: SingleChildScrollView(
          child: StateMessage(
            icon: Icons.folder_open_rounded,
            title: 'Device browsing is not enabled yet',
            message:
                'Android MediaStore/SAF and iOS document-picker access arrive '
                'with the local file manager milestone. StackBase will only '
                'show media and folders you explicitly grant, never claim '
                'unrestricted filesystem access, and never delete without '
                'confirmation.',
            actionLabel: 'Back to Home',
            onAction: () => context.go('/home'),
          ),
        ),
      ),
    );
  }
}
