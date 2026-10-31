import 'package:freezed_annotation/freezed_annotation.dart';

part 'library.freezed.dart';
part 'library.g.dart';

/// Canonical server categories, in the fixed order the API returns. The order
/// is preserved here so filter chips never reshuffle between loads.
enum LibraryCategory {
  @JsonValue('images')
  images,
  @JsonValue('videos')
  videos,
  @JsonValue('audio')
  audio,
  @JsonValue('documents')
  documents,
  @JsonValue('apks')
  apks,
  @JsonValue('archives')
  archives,
  @JsonValue('apps')
  apps,
  @JsonValue('downloads')
  downloads,
  @JsonValue('other')
  other,
}

/// `pending` means the record exists but no encrypted version has been
/// finalized. Milestone 2 never claims a pending file is downloadable.
enum FileContentStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('ready')
  ready,
}

@freezed
abstract class TagSummary with _$TagSummary {
  const factory TagSummary({
    required String id,
    required String name,
    required String? colorToken,
  }) = _TagSummary;

  factory TagSummary.fromJson(Map<String, dynamic> json) =>
      _$TagSummaryFromJson(json);
}

@freezed
abstract class FileSummary with _$FileSummary {
  const factory FileSummary({
    required String id,
    required String name,
    required String? extension,
    required String mimeType,
    required int sizeBytes,
    required LibraryCategory category,
    required bool favorite,
    required String? description,
    required String? folderId,
    required String? folderName,
    required FileContentStatus contentStatus,
    required List<TagSummary> tags,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _FileSummary;

  factory FileSummary.fromJson(Map<String, dynamic> json) =>
      _$FileSummaryFromJson(json);
}

@freezed
abstract class FileListResponse with _$FileListResponse {
  const factory FileListResponse({
    required List<FileSummary> items,
    required int total,
    required int limit,
    required int offset,
    required bool hasMore,
  }) = _FileListResponse;

  factory FileListResponse.fromJson(Map<String, dynamic> json) =>
      _$FileListResponseFromJson(json);
}

@freezed
abstract class FolderSummary with _$FolderSummary {
  const factory FolderSummary({
    required String id,
    required String name,
    required String? parentFolderId,
    required int fileCount,
    required int folderCount,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _FolderSummary;

  factory FolderSummary.fromJson(Map<String, dynamic> json) =>
      _$FolderSummaryFromJson(json);
}

@freezed
abstract class FolderListResponse with _$FolderListResponse {
  const factory FolderListResponse({required List<FolderSummary> items}) =
      _FolderListResponse;

  factory FolderListResponse.fromJson(Map<String, dynamic> json) =>
      _$FolderListResponseFromJson(json);
}

@freezed
abstract class TagListItem with _$TagListItem {
  const factory TagListItem({
    required String id,
    required String name,
    required String? colorToken,
    required int fileCount,
    required DateTime createdAt,
  }) = _TagListItem;

  factory TagListItem.fromJson(Map<String, dynamic> json) =>
      _$TagListItemFromJson(json);
}

@freezed
abstract class TagListResponse with _$TagListResponse {
  const factory TagListResponse({required List<TagListItem> items}) =
      _TagListResponse;

  factory TagListResponse.fromJson(Map<String, dynamic> json) =>
      _$TagListResponseFromJson(json);
}

@freezed
abstract class CategorySummary with _$CategorySummary {
  const factory CategorySummary({
    required LibraryCategory category,
    required int files,
    required int bytes,
  }) = _CategorySummary;

  factory CategorySummary.fromJson(Map<String, dynamic> json) =>
      _$CategorySummaryFromJson(json);
}

@freezed
abstract class LibraryTotals with _$LibraryTotals {
  const factory LibraryTotals({
    required int files,
    required int folders,
    required int bytes,
    required int tags,
    required int trashedFiles,
    required int trashedFolders,
  }) = _LibraryTotals;

  factory LibraryTotals.fromJson(Map<String, dynamic> json) =>
      _$LibraryTotalsFromJson(json);
}

@freezed
abstract class LibrarySummaryResponse with _$LibrarySummaryResponse {
  const factory LibrarySummaryResponse({
    required LibraryTotals totals,
    required List<CategorySummary> categories,
    required List<FileSummary> recent,
    required List<FileSummary> largest,
  }) = _LibrarySummaryResponse;

  factory LibrarySummaryResponse.fromJson(Map<String, dynamic> json) =>
      _$LibrarySummaryResponseFromJson(json);
}

@freezed
abstract class FolderUsage with _$FolderUsage {
  const factory FolderUsage({
    required String id,
    required String name,
    required int files,
    required int bytes,
  }) = _FolderUsage;

  factory FolderUsage.fromJson(Map<String, dynamic> json) =>
      _$FolderUsageFromJson(json);
}

@freezed
abstract class InsightFile with _$InsightFile {
  const factory InsightFile({
    required String id,
    required String name,
    required LibraryCategory? category,
    required int sizeBytes,
    required DateTime updatedAt,
  }) = _InsightFile;

  factory InsightFile.fromJson(Map<String, dynamic> json) =>
      _$InsightFileFromJson(json);
}

@freezed
abstract class DuplicateGroup with _$DuplicateGroup {
  const factory DuplicateGroup({
    required String fingerprint,
    required int sizeBytes,
    required int wastedBytes,
    required List<InsightFile> files,
  }) = _DuplicateGroup;

  factory DuplicateGroup.fromJson(Map<String, dynamic> json) =>
      _$DuplicateGroupFromJson(json);
}

@freezed
abstract class InsightTotals with _$InsightTotals {
  const factory InsightTotals({
    required int files,
    required int folders,
    required int bytes,
    required int trashedFiles,
    required int trashedFolders,
    required int trashedBytes,
    required int versions,
    required int versionBytes,
    required int tags,
  }) = _InsightTotals;

  factory InsightTotals.fromJson(Map<String, dynamic> json) =>
      _$InsightTotalsFromJson(json);
}

@freezed
abstract class StorageInsightsResponse with _$StorageInsightsResponse {
  const factory StorageInsightsResponse({
    required InsightTotals totals,
    required List<CategorySummary> categories,
    required List<InsightFile> largestFiles,
    required List<FolderUsage> largestFolders,
    required List<DuplicateGroup> duplicateGroups,
    required DateTime generatedAt,
  }) = _StorageInsightsResponse;

  factory StorageInsightsResponse.fromJson(Map<String, dynamic> json) =>
      _$StorageInsightsResponseFromJson(json);
}

extension LibraryCategoryWire on LibraryCategory {
  String get wireValue => switch (this) {
    LibraryCategory.images => 'images',
    LibraryCategory.videos => 'videos',
    LibraryCategory.audio => 'audio',
    LibraryCategory.documents => 'documents',
    LibraryCategory.apks => 'apks',
    LibraryCategory.archives => 'archives',
    LibraryCategory.apps => 'apps',
    LibraryCategory.downloads => 'downloads',
    LibraryCategory.other => 'other',
  };

  String get label => switch (this) {
    LibraryCategory.images => 'Images',
    LibraryCategory.videos => 'Videos',
    LibraryCategory.audio => 'Audio',
    LibraryCategory.documents => 'Documents',
    LibraryCategory.apks => 'APKs',
    LibraryCategory.archives => 'Archives',
    LibraryCategory.apps => 'Apps',
    LibraryCategory.downloads => 'Downloads',
    LibraryCategory.other => 'Other',
  };
}

/// A lookup that tolerates servers of a different minor version: an unknown
/// category is a parse failure, never a silently fabricated bucket.
LibraryCategory libraryCategoryFromWire(String value) {
  for (final category in LibraryCategory.values) {
    if (category.wireValue == value) return category;
  }
  throw FormatException('Unknown library category: $value');
}
