// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'library.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_TagSummary _$TagSummaryFromJson(Map<String, dynamic> json) => _TagSummary(
  id: json['id'] as String,
  name: json['name'] as String,
  colorToken: json['colorToken'] as String?,
);

Map<String, dynamic> _$TagSummaryToJson(_TagSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'colorToken': instance.colorToken,
    };

_FileSummary _$FileSummaryFromJson(Map<String, dynamic> json) => _FileSummary(
  id: json['id'] as String,
  name: json['name'] as String,
  extension: json['extension'] as String?,
  mimeType: json['mimeType'] as String,
  sizeBytes: (json['sizeBytes'] as num).toInt(),
  category: $enumDecode(_$LibraryCategoryEnumMap, json['category']),
  favorite: json['favorite'] as bool,
  description: json['description'] as String?,
  folderId: json['folderId'] as String?,
  folderName: json['folderName'] as String?,
  contentStatus: $enumDecode(_$FileContentStatusEnumMap, json['contentStatus']),
  tags: (json['tags'] as List<dynamic>)
      .map((e) => TagSummary.fromJson(e as Map<String, dynamic>))
      .toList(),
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$FileSummaryToJson(_FileSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'extension': instance.extension,
      'mimeType': instance.mimeType,
      'sizeBytes': instance.sizeBytes,
      'category': _$LibraryCategoryEnumMap[instance.category]!,
      'favorite': instance.favorite,
      'description': instance.description,
      'folderId': instance.folderId,
      'folderName': instance.folderName,
      'contentStatus': _$FileContentStatusEnumMap[instance.contentStatus]!,
      'tags': instance.tags,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$LibraryCategoryEnumMap = {
  LibraryCategory.images: 'images',
  LibraryCategory.videos: 'videos',
  LibraryCategory.audio: 'audio',
  LibraryCategory.documents: 'documents',
  LibraryCategory.apks: 'apks',
  LibraryCategory.archives: 'archives',
  LibraryCategory.apps: 'apps',
  LibraryCategory.downloads: 'downloads',
  LibraryCategory.other: 'other',
};

const _$FileContentStatusEnumMap = {
  FileContentStatus.pending: 'pending',
  FileContentStatus.ready: 'ready',
};

_FileListResponse _$FileListResponseFromJson(Map<String, dynamic> json) =>
    _FileListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => FileSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      offset: (json['offset'] as num).toInt(),
      hasMore: json['hasMore'] as bool,
    );

Map<String, dynamic> _$FileListResponseToJson(_FileListResponse instance) =>
    <String, dynamic>{
      'items': instance.items,
      'total': instance.total,
      'limit': instance.limit,
      'offset': instance.offset,
      'hasMore': instance.hasMore,
    };

_FolderSummary _$FolderSummaryFromJson(Map<String, dynamic> json) =>
    _FolderSummary(
      id: json['id'] as String,
      name: json['name'] as String,
      parentFolderId: json['parentFolderId'] as String?,
      fileCount: (json['fileCount'] as num).toInt(),
      folderCount: (json['folderCount'] as num).toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$FolderSummaryToJson(_FolderSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'parentFolderId': instance.parentFolderId,
      'fileCount': instance.fileCount,
      'folderCount': instance.folderCount,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

_FolderListResponse _$FolderListResponseFromJson(Map<String, dynamic> json) =>
    _FolderListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => FolderSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$FolderListResponseToJson(_FolderListResponse instance) =>
    <String, dynamic>{'items': instance.items};

_TagListItem _$TagListItemFromJson(Map<String, dynamic> json) => _TagListItem(
  id: json['id'] as String,
  name: json['name'] as String,
  colorToken: json['colorToken'] as String?,
  fileCount: (json['fileCount'] as num).toInt(),
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$TagListItemToJson(_TagListItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'colorToken': instance.colorToken,
      'fileCount': instance.fileCount,
      'createdAt': instance.createdAt.toIso8601String(),
    };

_TagListResponse _$TagListResponseFromJson(Map<String, dynamic> json) =>
    _TagListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => TagListItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$TagListResponseToJson(_TagListResponse instance) =>
    <String, dynamic>{'items': instance.items};

_CategorySummary _$CategorySummaryFromJson(Map<String, dynamic> json) =>
    _CategorySummary(
      category: $enumDecode(_$LibraryCategoryEnumMap, json['category']),
      files: (json['files'] as num).toInt(),
      bytes: (json['bytes'] as num).toInt(),
    );

Map<String, dynamic> _$CategorySummaryToJson(_CategorySummary instance) =>
    <String, dynamic>{
      'category': _$LibraryCategoryEnumMap[instance.category]!,
      'files': instance.files,
      'bytes': instance.bytes,
    };

_LibraryTotals _$LibraryTotalsFromJson(Map<String, dynamic> json) =>
    _LibraryTotals(
      files: (json['files'] as num).toInt(),
      folders: (json['folders'] as num).toInt(),
      bytes: (json['bytes'] as num).toInt(),
      tags: (json['tags'] as num).toInt(),
      trashedFiles: (json['trashedFiles'] as num).toInt(),
      trashedFolders: (json['trashedFolders'] as num).toInt(),
    );

Map<String, dynamic> _$LibraryTotalsToJson(_LibraryTotals instance) =>
    <String, dynamic>{
      'files': instance.files,
      'folders': instance.folders,
      'bytes': instance.bytes,
      'tags': instance.tags,
      'trashedFiles': instance.trashedFiles,
      'trashedFolders': instance.trashedFolders,
    };

_LibrarySummaryResponse _$LibrarySummaryResponseFromJson(
  Map<String, dynamic> json,
) => _LibrarySummaryResponse(
  totals: LibraryTotals.fromJson(json['totals'] as Map<String, dynamic>),
  categories: (json['categories'] as List<dynamic>)
      .map((e) => CategorySummary.fromJson(e as Map<String, dynamic>))
      .toList(),
  recent: (json['recent'] as List<dynamic>)
      .map((e) => FileSummary.fromJson(e as Map<String, dynamic>))
      .toList(),
  largest: (json['largest'] as List<dynamic>)
      .map((e) => FileSummary.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$LibrarySummaryResponseToJson(
  _LibrarySummaryResponse instance,
) => <String, dynamic>{
  'totals': instance.totals,
  'categories': instance.categories,
  'recent': instance.recent,
  'largest': instance.largest,
};

_FolderUsage _$FolderUsageFromJson(Map<String, dynamic> json) => _FolderUsage(
  id: json['id'] as String,
  name: json['name'] as String,
  files: (json['files'] as num).toInt(),
  bytes: (json['bytes'] as num).toInt(),
);

Map<String, dynamic> _$FolderUsageToJson(_FolderUsage instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'files': instance.files,
      'bytes': instance.bytes,
    };

_InsightFile _$InsightFileFromJson(Map<String, dynamic> json) => _InsightFile(
  id: json['id'] as String,
  name: json['name'] as String,
  category: $enumDecodeNullable(_$LibraryCategoryEnumMap, json['category']),
  sizeBytes: (json['sizeBytes'] as num).toInt(),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$InsightFileToJson(_InsightFile instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'category': _$LibraryCategoryEnumMap[instance.category],
      'sizeBytes': instance.sizeBytes,
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

_DuplicateGroup _$DuplicateGroupFromJson(Map<String, dynamic> json) =>
    _DuplicateGroup(
      fingerprint: json['fingerprint'] as String,
      sizeBytes: (json['sizeBytes'] as num).toInt(),
      wastedBytes: (json['wastedBytes'] as num).toInt(),
      files: (json['files'] as List<dynamic>)
          .map((e) => InsightFile.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$DuplicateGroupToJson(_DuplicateGroup instance) =>
    <String, dynamic>{
      'fingerprint': instance.fingerprint,
      'sizeBytes': instance.sizeBytes,
      'wastedBytes': instance.wastedBytes,
      'files': instance.files,
    };

_InsightTotals _$InsightTotalsFromJson(Map<String, dynamic> json) =>
    _InsightTotals(
      files: (json['files'] as num).toInt(),
      folders: (json['folders'] as num).toInt(),
      bytes: (json['bytes'] as num).toInt(),
      trashedFiles: (json['trashedFiles'] as num).toInt(),
      trashedFolders: (json['trashedFolders'] as num).toInt(),
      trashedBytes: (json['trashedBytes'] as num).toInt(),
      versions: (json['versions'] as num).toInt(),
      versionBytes: (json['versionBytes'] as num).toInt(),
      tags: (json['tags'] as num).toInt(),
    );

Map<String, dynamic> _$InsightTotalsToJson(_InsightTotals instance) =>
    <String, dynamic>{
      'files': instance.files,
      'folders': instance.folders,
      'bytes': instance.bytes,
      'trashedFiles': instance.trashedFiles,
      'trashedFolders': instance.trashedFolders,
      'trashedBytes': instance.trashedBytes,
      'versions': instance.versions,
      'versionBytes': instance.versionBytes,
      'tags': instance.tags,
    };

_StorageInsightsResponse _$StorageInsightsResponseFromJson(
  Map<String, dynamic> json,
) => _StorageInsightsResponse(
  totals: InsightTotals.fromJson(json['totals'] as Map<String, dynamic>),
  categories: (json['categories'] as List<dynamic>)
      .map((e) => CategorySummary.fromJson(e as Map<String, dynamic>))
      .toList(),
  largestFiles: (json['largestFiles'] as List<dynamic>)
      .map((e) => InsightFile.fromJson(e as Map<String, dynamic>))
      .toList(),
  largestFolders: (json['largestFolders'] as List<dynamic>)
      .map((e) => FolderUsage.fromJson(e as Map<String, dynamic>))
      .toList(),
  duplicateGroups: (json['duplicateGroups'] as List<dynamic>)
      .map((e) => DuplicateGroup.fromJson(e as Map<String, dynamic>))
      .toList(),
  generatedAt: DateTime.parse(json['generatedAt'] as String),
);

Map<String, dynamic> _$StorageInsightsResponseToJson(
  _StorageInsightsResponse instance,
) => <String, dynamic>{
  'totals': instance.totals,
  'categories': instance.categories,
  'largestFiles': instance.largestFiles,
  'largestFolders': instance.largestFolders,
  'duplicateGroups': instance.duplicateGroups,
  'generatedAt': instance.generatedAt.toIso8601String(),
};
