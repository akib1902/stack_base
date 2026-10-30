import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/providers.dart';
import '../../../core/ui/components/offline_banner.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _Destination(
      label: 'Home',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard_rounded,
    ),
    _Destination(
      label: 'Local',
      icon: Icons.folder_outlined,
      selectedIcon: Icons.folder_rounded,
    ),
    _Destination(
      label: 'Cloud',
      icon: Icons.cloud_outlined,
      selectedIcon: Icons.cloud_rounded,
    ),
    _Destination(
      label: 'Settings',
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final offline = ref.watch(interfaceOfflineProvider);
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 720;

    void go(int index) {
      navigationShell.goBranch(
        index,
        initialLocation: index == navigationShell.currentIndex,
      );
    }

    final banner = offline
        ? const OfflineBanner(
            message:
                'No network interface is connected. Cached screens remain '
                'readable; changes wait until you are back online.',
          )
        : null;

    if (wide) {
      return Scaffold(
        backgroundColor: colors.background,
        body: Column(
          children: [
            if (banner != null) SafeArea(bottom: false, child: banner),
            Expanded(
              child: Row(
                children: [
                  SafeArea(
                    right: false,
                    child: NavigationRail(
                      extended: width >= 1080,
                      selectedIndex: navigationShell.currentIndex,
                      onDestinationSelected: go,
                      destinations: [
                        for (final destination in _destinations)
                          NavigationRailDestination(
                            icon: Icon(destination.icon),
                            selectedIcon: Icon(destination.selectedIcon),
                            label: Text(destination.label),
                          ),
                      ],
                    ),
                  ),
                  VerticalDivider(width: 1, color: colors.border),
                  Expanded(child: navigationShell),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: colors.background,
      body: Column(
        children: [
          if (banner != null) SafeArea(bottom: false, child: banner),
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: go,
        destinations: [
          for (final destination in _destinations)
            NavigationDestination(
              icon: Icon(destination.icon),
              selectedIcon: Icon(destination.selectedIcon),
              label: destination.label,
            ),
        ],
      ),
    );
  }
}

class _Destination {
  const _Destination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
