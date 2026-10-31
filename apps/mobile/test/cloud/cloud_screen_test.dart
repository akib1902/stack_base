import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/app/theme/theme.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/models/library.dart';
import 'package:stackbase_mobile/core/providers.dart';
import 'package:stackbase_mobile/features/cloud_files/presentation/cloud_controller.dart';
import 'package:stackbase_mobile/features/cloud_files/presentation/cloud_screen.dart';

import '../support/fixtures.dart';
import '../support/library_fixtures.dart';

void main() {
  Future<void> pumpCloud(
    WidgetTester tester,
    FakeCloudLibraryRepository repository, {
    Size size = const Size(390, 844),
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(testConfig()),
          cloudLibraryRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          theme: StackBaseTheme.light(),
          home: const CloudScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('a failed refresh shows the saved copy with its age', (
    tester,
  ) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(
        files: [
          fileFixture(),
          fileFixture(id: 'file-2', name: 'notes.txt'),
        ],
        syncedAt: DateTime.now().toUtc().subtract(const Duration(minutes: 9)),
      ),
      refreshError: const ApiException(
        code: 'NETWORK_UNAVAILABLE',
        message: 'The API is unreachable.',
      ),
    );

    await pumpCloud(tester, repository);

    expect(find.textContaining('Saved copy'), findsOneWidget);
    expect(find.textContaining('Showing the saved copy'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const Key('cloud-file-grid')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byKey(const Key('cloud-file-grid')), findsOneWidget);
    expect(find.text('notes.txt'), findsWidgets);
    expect(repository.refreshCalls, greaterThan(0));
  });

  testWidgets('an empty library states it is empty instead of inventing files', (
    tester,
  ) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(files: [], folders: [], tags: []),
    );

    await pumpCloud(tester, repository);

    expect(find.text('Your cloud library is empty'), findsOneWidget);
    expect(find.byKey(const Key('cloud-file-grid')), findsNothing);
  });

  testWidgets('grid and list views both render the same real files', (
    tester,
  ) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(files: [fileFixture()]),
    );

    await pumpCloud(tester, repository);
    expect(find.byKey(const Key('cloud-file-grid')), findsOneWidget);

    await tester.tap(find.byTooltip('Switch to list view'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('cloud-file-list')), findsOneWidget);
    expect(find.byKey(const Key('cloud-file-grid')), findsNothing);
    expect(find.text('report.pdf'), findsWidgets);
  });

  testWidgets('tapping a folder filters to its direct files', (tester) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(
        files: [
          fileFixture(id: 'root', name: 'root.pdf'),
          fileFixture(
            id: 'in-folder',
            name: 'receipt.pdf',
            folderId: 'folder-1',
            folderName: 'Receipts',
          ),
        ],
        folders: [folderFixture()],
      ),
    );

    await pumpCloud(tester, repository);
    expect(find.text('root.pdf'), findsWidgets);

    await tester.tap(find.textContaining('Receipts · 1'));
    await tester.pumpAndSettle();

    expect(find.text('root.pdf'), findsNothing);
    expect(find.text('receipt.pdf'), findsWidgets);
    expect(find.text('All files'), findsOneWidget);
  });

  testWidgets('search is debounced and clearing filters restores the list', (
    tester,
  ) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(files: [fileFixture()]),
    );

    await pumpCloud(tester, repository);
    await tester.tap(find.byTooltip('Search cloud files'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'nothing-matches');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('report.pdf'), findsWidgets);

    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();
    expect(find.text('No files match these filters'), findsOneWidget);

    await tester.tap(find.text('Clear filters'));
    await tester.pumpAndSettle();
    expect(find.text('report.pdf'), findsWidgets);
  });

  testWidgets('320 dp layout has no overflow', (tester) async {
    final repository = FakeCloudLibraryRepository(
      cache: libraryCacheFixture(
        files: [
          fileFixture(),
          fileFixture(
            id: 'image-1',
            name: 'A very long sunset photograph name.jpg',
            category: LibraryCategory.images,
            sizeBytes: 1048576,
          ),
        ],
        folders: [folderFixture()],
      ),
    );

    await pumpCloud(tester, repository, size: const Size(320, 640));

    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(
      find.byKey(const Key('cloud-file-grid')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('cloud-file-grid')), findsOneWidget);
  });
}
