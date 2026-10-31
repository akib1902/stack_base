// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $CachedFilesTable extends CachedFiles
    with TableInfo<$CachedFilesTable, CachedFile> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedFilesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _extensionMeta = const VerificationMeta(
    'extension',
  );
  @override
  late final GeneratedColumn<String> extension = GeneratedColumn<String>(
    'extension',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _mimeTypeMeta = const VerificationMeta(
    'mimeType',
  );
  @override
  late final GeneratedColumn<String> mimeType = GeneratedColumn<String>(
    'mime_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sizeBytesMeta = const VerificationMeta(
    'sizeBytes',
  );
  @override
  late final GeneratedColumn<int> sizeBytes = GeneratedColumn<int>(
    'size_bytes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _favoriteMeta = const VerificationMeta(
    'favorite',
  );
  @override
  late final GeneratedColumn<bool> favorite = GeneratedColumn<bool>(
    'favorite',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("favorite" IN (0, 1))',
    ),
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _folderIdMeta = const VerificationMeta(
    'folderId',
  );
  @override
  late final GeneratedColumn<String> folderId = GeneratedColumn<String>(
    'folder_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _folderNameMeta = const VerificationMeta(
    'folderName',
  );
  @override
  late final GeneratedColumn<String> folderName = GeneratedColumn<String>(
    'folder_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _contentStatusMeta = const VerificationMeta(
    'contentStatus',
  );
  @override
  late final GeneratedColumn<String> contentStatus = GeneratedColumn<String>(
    'content_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tagsJsonMeta = const VerificationMeta(
    'tagsJson',
  );
  @override
  late final GeneratedColumn<String> tagsJson = GeneratedColumn<String>(
    'tags_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    extension,
    mimeType,
    sizeBytes,
    category,
    favorite,
    description,
    folderId,
    folderName,
    contentStatus,
    tagsJson,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_files';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedFile> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('extension')) {
      context.handle(
        _extensionMeta,
        extension.isAcceptableOrUnknown(data['extension']!, _extensionMeta),
      );
    }
    if (data.containsKey('mime_type')) {
      context.handle(
        _mimeTypeMeta,
        mimeType.isAcceptableOrUnknown(data['mime_type']!, _mimeTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_mimeTypeMeta);
    }
    if (data.containsKey('size_bytes')) {
      context.handle(
        _sizeBytesMeta,
        sizeBytes.isAcceptableOrUnknown(data['size_bytes']!, _sizeBytesMeta),
      );
    } else if (isInserting) {
      context.missing(_sizeBytesMeta);
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    } else if (isInserting) {
      context.missing(_categoryMeta);
    }
    if (data.containsKey('favorite')) {
      context.handle(
        _favoriteMeta,
        favorite.isAcceptableOrUnknown(data['favorite']!, _favoriteMeta),
      );
    } else if (isInserting) {
      context.missing(_favoriteMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('folder_id')) {
      context.handle(
        _folderIdMeta,
        folderId.isAcceptableOrUnknown(data['folder_id']!, _folderIdMeta),
      );
    }
    if (data.containsKey('folder_name')) {
      context.handle(
        _folderNameMeta,
        folderName.isAcceptableOrUnknown(data['folder_name']!, _folderNameMeta),
      );
    }
    if (data.containsKey('content_status')) {
      context.handle(
        _contentStatusMeta,
        contentStatus.isAcceptableOrUnknown(
          data['content_status']!,
          _contentStatusMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_contentStatusMeta);
    }
    if (data.containsKey('tags_json')) {
      context.handle(
        _tagsJsonMeta,
        tagsJson.isAcceptableOrUnknown(data['tags_json']!, _tagsJsonMeta),
      );
    } else if (isInserting) {
      context.missing(_tagsJsonMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedFile map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedFile(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      extension: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}extension'],
      ),
      mimeType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}mime_type'],
      )!,
      sizeBytes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}size_bytes'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      )!,
      favorite: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}favorite'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      ),
      folderId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}folder_id'],
      ),
      folderName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}folder_name'],
      ),
      contentStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}content_status'],
      )!,
      tagsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tags_json'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $CachedFilesTable createAlias(String alias) {
    return $CachedFilesTable(attachedDatabase, alias);
  }
}

class CachedFile extends DataClass implements Insertable<CachedFile> {
  final String id;
  final String name;
  final String? extension;
  final String mimeType;
  final int sizeBytes;
  final String category;
  final bool favorite;
  final String? description;
  final String? folderId;
  final String? folderName;
  final String contentStatus;
  final String tagsJson;
  final DateTime createdAt;
  final DateTime updatedAt;
  const CachedFile({
    required this.id,
    required this.name,
    this.extension,
    required this.mimeType,
    required this.sizeBytes,
    required this.category,
    required this.favorite,
    this.description,
    this.folderId,
    this.folderName,
    required this.contentStatus,
    required this.tagsJson,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || extension != null) {
      map['extension'] = Variable<String>(extension);
    }
    map['mime_type'] = Variable<String>(mimeType);
    map['size_bytes'] = Variable<int>(sizeBytes);
    map['category'] = Variable<String>(category);
    map['favorite'] = Variable<bool>(favorite);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    if (!nullToAbsent || folderId != null) {
      map['folder_id'] = Variable<String>(folderId);
    }
    if (!nullToAbsent || folderName != null) {
      map['folder_name'] = Variable<String>(folderName);
    }
    map['content_status'] = Variable<String>(contentStatus);
    map['tags_json'] = Variable<String>(tagsJson);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  CachedFilesCompanion toCompanion(bool nullToAbsent) {
    return CachedFilesCompanion(
      id: Value(id),
      name: Value(name),
      extension: extension == null && nullToAbsent
          ? const Value.absent()
          : Value(extension),
      mimeType: Value(mimeType),
      sizeBytes: Value(sizeBytes),
      category: Value(category),
      favorite: Value(favorite),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      folderId: folderId == null && nullToAbsent
          ? const Value.absent()
          : Value(folderId),
      folderName: folderName == null && nullToAbsent
          ? const Value.absent()
          : Value(folderName),
      contentStatus: Value(contentStatus),
      tagsJson: Value(tagsJson),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory CachedFile.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedFile(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      extension: serializer.fromJson<String?>(json['extension']),
      mimeType: serializer.fromJson<String>(json['mimeType']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      category: serializer.fromJson<String>(json['category']),
      favorite: serializer.fromJson<bool>(json['favorite']),
      description: serializer.fromJson<String?>(json['description']),
      folderId: serializer.fromJson<String?>(json['folderId']),
      folderName: serializer.fromJson<String?>(json['folderName']),
      contentStatus: serializer.fromJson<String>(json['contentStatus']),
      tagsJson: serializer.fromJson<String>(json['tagsJson']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'extension': serializer.toJson<String?>(extension),
      'mimeType': serializer.toJson<String>(mimeType),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'category': serializer.toJson<String>(category),
      'favorite': serializer.toJson<bool>(favorite),
      'description': serializer.toJson<String?>(description),
      'folderId': serializer.toJson<String?>(folderId),
      'folderName': serializer.toJson<String?>(folderName),
      'contentStatus': serializer.toJson<String>(contentStatus),
      'tagsJson': serializer.toJson<String>(tagsJson),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  CachedFile copyWith({
    String? id,
    String? name,
    Value<String?> extension = const Value.absent(),
    String? mimeType,
    int? sizeBytes,
    String? category,
    bool? favorite,
    Value<String?> description = const Value.absent(),
    Value<String?> folderId = const Value.absent(),
    Value<String?> folderName = const Value.absent(),
    String? contentStatus,
    String? tagsJson,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => CachedFile(
    id: id ?? this.id,
    name: name ?? this.name,
    extension: extension.present ? extension.value : this.extension,
    mimeType: mimeType ?? this.mimeType,
    sizeBytes: sizeBytes ?? this.sizeBytes,
    category: category ?? this.category,
    favorite: favorite ?? this.favorite,
    description: description.present ? description.value : this.description,
    folderId: folderId.present ? folderId.value : this.folderId,
    folderName: folderName.present ? folderName.value : this.folderName,
    contentStatus: contentStatus ?? this.contentStatus,
    tagsJson: tagsJson ?? this.tagsJson,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  CachedFile copyWithCompanion(CachedFilesCompanion data) {
    return CachedFile(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      extension: data.extension.present ? data.extension.value : this.extension,
      mimeType: data.mimeType.present ? data.mimeType.value : this.mimeType,
      sizeBytes: data.sizeBytes.present ? data.sizeBytes.value : this.sizeBytes,
      category: data.category.present ? data.category.value : this.category,
      favorite: data.favorite.present ? data.favorite.value : this.favorite,
      description: data.description.present
          ? data.description.value
          : this.description,
      folderId: data.folderId.present ? data.folderId.value : this.folderId,
      folderName: data.folderName.present
          ? data.folderName.value
          : this.folderName,
      contentStatus: data.contentStatus.present
          ? data.contentStatus.value
          : this.contentStatus,
      tagsJson: data.tagsJson.present ? data.tagsJson.value : this.tagsJson,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedFile(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('extension: $extension, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('category: $category, ')
          ..write('favorite: $favorite, ')
          ..write('description: $description, ')
          ..write('folderId: $folderId, ')
          ..write('folderName: $folderName, ')
          ..write('contentStatus: $contentStatus, ')
          ..write('tagsJson: $tagsJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    extension,
    mimeType,
    sizeBytes,
    category,
    favorite,
    description,
    folderId,
    folderName,
    contentStatus,
    tagsJson,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedFile &&
          other.id == this.id &&
          other.name == this.name &&
          other.extension == this.extension &&
          other.mimeType == this.mimeType &&
          other.sizeBytes == this.sizeBytes &&
          other.category == this.category &&
          other.favorite == this.favorite &&
          other.description == this.description &&
          other.folderId == this.folderId &&
          other.folderName == this.folderName &&
          other.contentStatus == this.contentStatus &&
          other.tagsJson == this.tagsJson &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class CachedFilesCompanion extends UpdateCompanion<CachedFile> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> extension;
  final Value<String> mimeType;
  final Value<int> sizeBytes;
  final Value<String> category;
  final Value<bool> favorite;
  final Value<String?> description;
  final Value<String?> folderId;
  final Value<String?> folderName;
  final Value<String> contentStatus;
  final Value<String> tagsJson;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const CachedFilesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.extension = const Value.absent(),
    this.mimeType = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.category = const Value.absent(),
    this.favorite = const Value.absent(),
    this.description = const Value.absent(),
    this.folderId = const Value.absent(),
    this.folderName = const Value.absent(),
    this.contentStatus = const Value.absent(),
    this.tagsJson = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedFilesCompanion.insert({
    required String id,
    required String name,
    this.extension = const Value.absent(),
    required String mimeType,
    required int sizeBytes,
    required String category,
    required bool favorite,
    this.description = const Value.absent(),
    this.folderId = const Value.absent(),
    this.folderName = const Value.absent(),
    required String contentStatus,
    required String tagsJson,
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       mimeType = Value(mimeType),
       sizeBytes = Value(sizeBytes),
       category = Value(category),
       favorite = Value(favorite),
       contentStatus = Value(contentStatus),
       tagsJson = Value(tagsJson),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<CachedFile> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? extension,
    Expression<String>? mimeType,
    Expression<int>? sizeBytes,
    Expression<String>? category,
    Expression<bool>? favorite,
    Expression<String>? description,
    Expression<String>? folderId,
    Expression<String>? folderName,
    Expression<String>? contentStatus,
    Expression<String>? tagsJson,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (extension != null) 'extension': extension,
      if (mimeType != null) 'mime_type': mimeType,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (category != null) 'category': category,
      if (favorite != null) 'favorite': favorite,
      if (description != null) 'description': description,
      if (folderId != null) 'folder_id': folderId,
      if (folderName != null) 'folder_name': folderName,
      if (contentStatus != null) 'content_status': contentStatus,
      if (tagsJson != null) 'tags_json': tagsJson,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedFilesCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? extension,
    Value<String>? mimeType,
    Value<int>? sizeBytes,
    Value<String>? category,
    Value<bool>? favorite,
    Value<String?>? description,
    Value<String?>? folderId,
    Value<String?>? folderName,
    Value<String>? contentStatus,
    Value<String>? tagsJson,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return CachedFilesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      extension: extension ?? this.extension,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      category: category ?? this.category,
      favorite: favorite ?? this.favorite,
      description: description ?? this.description,
      folderId: folderId ?? this.folderId,
      folderName: folderName ?? this.folderName,
      contentStatus: contentStatus ?? this.contentStatus,
      tagsJson: tagsJson ?? this.tagsJson,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (extension.present) {
      map['extension'] = Variable<String>(extension.value);
    }
    if (mimeType.present) {
      map['mime_type'] = Variable<String>(mimeType.value);
    }
    if (sizeBytes.present) {
      map['size_bytes'] = Variable<int>(sizeBytes.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (favorite.present) {
      map['favorite'] = Variable<bool>(favorite.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (folderId.present) {
      map['folder_id'] = Variable<String>(folderId.value);
    }
    if (folderName.present) {
      map['folder_name'] = Variable<String>(folderName.value);
    }
    if (contentStatus.present) {
      map['content_status'] = Variable<String>(contentStatus.value);
    }
    if (tagsJson.present) {
      map['tags_json'] = Variable<String>(tagsJson.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedFilesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('extension: $extension, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('category: $category, ')
          ..write('favorite: $favorite, ')
          ..write('description: $description, ')
          ..write('folderId: $folderId, ')
          ..write('folderName: $folderName, ')
          ..write('contentStatus: $contentStatus, ')
          ..write('tagsJson: $tagsJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedFoldersTable extends CachedFolders
    with TableInfo<$CachedFoldersTable, CachedFolder> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedFoldersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _parentFolderIdMeta = const VerificationMeta(
    'parentFolderId',
  );
  @override
  late final GeneratedColumn<String> parentFolderId = GeneratedColumn<String>(
    'parent_folder_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fileCountMeta = const VerificationMeta(
    'fileCount',
  );
  @override
  late final GeneratedColumn<int> fileCount = GeneratedColumn<int>(
    'file_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _folderCountMeta = const VerificationMeta(
    'folderCount',
  );
  @override
  late final GeneratedColumn<int> folderCount = GeneratedColumn<int>(
    'folder_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    parentFolderId,
    fileCount,
    folderCount,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_folders';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedFolder> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('parent_folder_id')) {
      context.handle(
        _parentFolderIdMeta,
        parentFolderId.isAcceptableOrUnknown(
          data['parent_folder_id']!,
          _parentFolderIdMeta,
        ),
      );
    }
    if (data.containsKey('file_count')) {
      context.handle(
        _fileCountMeta,
        fileCount.isAcceptableOrUnknown(data['file_count']!, _fileCountMeta),
      );
    } else if (isInserting) {
      context.missing(_fileCountMeta);
    }
    if (data.containsKey('folder_count')) {
      context.handle(
        _folderCountMeta,
        folderCount.isAcceptableOrUnknown(
          data['folder_count']!,
          _folderCountMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_folderCountMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedFolder map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedFolder(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      parentFolderId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}parent_folder_id'],
      ),
      fileCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}file_count'],
      )!,
      folderCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}folder_count'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $CachedFoldersTable createAlias(String alias) {
    return $CachedFoldersTable(attachedDatabase, alias);
  }
}

class CachedFolder extends DataClass implements Insertable<CachedFolder> {
  final String id;
  final String name;
  final String? parentFolderId;
  final int fileCount;
  final int folderCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  const CachedFolder({
    required this.id,
    required this.name,
    this.parentFolderId,
    required this.fileCount,
    required this.folderCount,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || parentFolderId != null) {
      map['parent_folder_id'] = Variable<String>(parentFolderId);
    }
    map['file_count'] = Variable<int>(fileCount);
    map['folder_count'] = Variable<int>(folderCount);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  CachedFoldersCompanion toCompanion(bool nullToAbsent) {
    return CachedFoldersCompanion(
      id: Value(id),
      name: Value(name),
      parentFolderId: parentFolderId == null && nullToAbsent
          ? const Value.absent()
          : Value(parentFolderId),
      fileCount: Value(fileCount),
      folderCount: Value(folderCount),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory CachedFolder.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedFolder(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      parentFolderId: serializer.fromJson<String?>(json['parentFolderId']),
      fileCount: serializer.fromJson<int>(json['fileCount']),
      folderCount: serializer.fromJson<int>(json['folderCount']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'parentFolderId': serializer.toJson<String?>(parentFolderId),
      'fileCount': serializer.toJson<int>(fileCount),
      'folderCount': serializer.toJson<int>(folderCount),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  CachedFolder copyWith({
    String? id,
    String? name,
    Value<String?> parentFolderId = const Value.absent(),
    int? fileCount,
    int? folderCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => CachedFolder(
    id: id ?? this.id,
    name: name ?? this.name,
    parentFolderId: parentFolderId.present
        ? parentFolderId.value
        : this.parentFolderId,
    fileCount: fileCount ?? this.fileCount,
    folderCount: folderCount ?? this.folderCount,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  CachedFolder copyWithCompanion(CachedFoldersCompanion data) {
    return CachedFolder(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      parentFolderId: data.parentFolderId.present
          ? data.parentFolderId.value
          : this.parentFolderId,
      fileCount: data.fileCount.present ? data.fileCount.value : this.fileCount,
      folderCount: data.folderCount.present
          ? data.folderCount.value
          : this.folderCount,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedFolder(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('parentFolderId: $parentFolderId, ')
          ..write('fileCount: $fileCount, ')
          ..write('folderCount: $folderCount, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    parentFolderId,
    fileCount,
    folderCount,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedFolder &&
          other.id == this.id &&
          other.name == this.name &&
          other.parentFolderId == this.parentFolderId &&
          other.fileCount == this.fileCount &&
          other.folderCount == this.folderCount &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class CachedFoldersCompanion extends UpdateCompanion<CachedFolder> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> parentFolderId;
  final Value<int> fileCount;
  final Value<int> folderCount;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const CachedFoldersCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.parentFolderId = const Value.absent(),
    this.fileCount = const Value.absent(),
    this.folderCount = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedFoldersCompanion.insert({
    required String id,
    required String name,
    this.parentFolderId = const Value.absent(),
    required int fileCount,
    required int folderCount,
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       fileCount = Value(fileCount),
       folderCount = Value(folderCount),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<CachedFolder> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? parentFolderId,
    Expression<int>? fileCount,
    Expression<int>? folderCount,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (parentFolderId != null) 'parent_folder_id': parentFolderId,
      if (fileCount != null) 'file_count': fileCount,
      if (folderCount != null) 'folder_count': folderCount,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedFoldersCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? parentFolderId,
    Value<int>? fileCount,
    Value<int>? folderCount,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return CachedFoldersCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      parentFolderId: parentFolderId ?? this.parentFolderId,
      fileCount: fileCount ?? this.fileCount,
      folderCount: folderCount ?? this.folderCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (parentFolderId.present) {
      map['parent_folder_id'] = Variable<String>(parentFolderId.value);
    }
    if (fileCount.present) {
      map['file_count'] = Variable<int>(fileCount.value);
    }
    if (folderCount.present) {
      map['folder_count'] = Variable<int>(folderCount.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedFoldersCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('parentFolderId: $parentFolderId, ')
          ..write('fileCount: $fileCount, ')
          ..write('folderCount: $folderCount, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedTagsTable extends CachedTags
    with TableInfo<$CachedTagsTable, CachedTag> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedTagsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _colorTokenMeta = const VerificationMeta(
    'colorToken',
  );
  @override
  late final GeneratedColumn<String> colorToken = GeneratedColumn<String>(
    'color_token',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fileCountMeta = const VerificationMeta(
    'fileCount',
  );
  @override
  late final GeneratedColumn<int> fileCount = GeneratedColumn<int>(
    'file_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    colorToken,
    fileCount,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_tags';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedTag> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('color_token')) {
      context.handle(
        _colorTokenMeta,
        colorToken.isAcceptableOrUnknown(data['color_token']!, _colorTokenMeta),
      );
    }
    if (data.containsKey('file_count')) {
      context.handle(
        _fileCountMeta,
        fileCount.isAcceptableOrUnknown(data['file_count']!, _fileCountMeta),
      );
    } else if (isInserting) {
      context.missing(_fileCountMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedTag map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedTag(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      colorToken: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}color_token'],
      ),
      fileCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}file_count'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $CachedTagsTable createAlias(String alias) {
    return $CachedTagsTable(attachedDatabase, alias);
  }
}

class CachedTag extends DataClass implements Insertable<CachedTag> {
  final String id;
  final String name;
  final String? colorToken;
  final int fileCount;
  final DateTime createdAt;
  const CachedTag({
    required this.id,
    required this.name,
    this.colorToken,
    required this.fileCount,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || colorToken != null) {
      map['color_token'] = Variable<String>(colorToken);
    }
    map['file_count'] = Variable<int>(fileCount);
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  CachedTagsCompanion toCompanion(bool nullToAbsent) {
    return CachedTagsCompanion(
      id: Value(id),
      name: Value(name),
      colorToken: colorToken == null && nullToAbsent
          ? const Value.absent()
          : Value(colorToken),
      fileCount: Value(fileCount),
      createdAt: Value(createdAt),
    );
  }

  factory CachedTag.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedTag(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      colorToken: serializer.fromJson<String?>(json['colorToken']),
      fileCount: serializer.fromJson<int>(json['fileCount']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'colorToken': serializer.toJson<String?>(colorToken),
      'fileCount': serializer.toJson<int>(fileCount),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  CachedTag copyWith({
    String? id,
    String? name,
    Value<String?> colorToken = const Value.absent(),
    int? fileCount,
    DateTime? createdAt,
  }) => CachedTag(
    id: id ?? this.id,
    name: name ?? this.name,
    colorToken: colorToken.present ? colorToken.value : this.colorToken,
    fileCount: fileCount ?? this.fileCount,
    createdAt: createdAt ?? this.createdAt,
  );
  CachedTag copyWithCompanion(CachedTagsCompanion data) {
    return CachedTag(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      colorToken: data.colorToken.present
          ? data.colorToken.value
          : this.colorToken,
      fileCount: data.fileCount.present ? data.fileCount.value : this.fileCount,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedTag(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('colorToken: $colorToken, ')
          ..write('fileCount: $fileCount, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, colorToken, fileCount, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedTag &&
          other.id == this.id &&
          other.name == this.name &&
          other.colorToken == this.colorToken &&
          other.fileCount == this.fileCount &&
          other.createdAt == this.createdAt);
}

class CachedTagsCompanion extends UpdateCompanion<CachedTag> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> colorToken;
  final Value<int> fileCount;
  final Value<DateTime> createdAt;
  final Value<int> rowid;
  const CachedTagsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.colorToken = const Value.absent(),
    this.fileCount = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedTagsCompanion.insert({
    required String id,
    required String name,
    this.colorToken = const Value.absent(),
    required int fileCount,
    required DateTime createdAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       fileCount = Value(fileCount),
       createdAt = Value(createdAt);
  static Insertable<CachedTag> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? colorToken,
    Expression<int>? fileCount,
    Expression<DateTime>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (colorToken != null) 'color_token': colorToken,
      if (fileCount != null) 'file_count': fileCount,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedTagsCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? colorToken,
    Value<int>? fileCount,
    Value<DateTime>? createdAt,
    Value<int>? rowid,
  }) {
    return CachedTagsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      colorToken: colorToken ?? this.colorToken,
      fileCount: fileCount ?? this.fileCount,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (colorToken.present) {
      map['color_token'] = Variable<String>(colorToken.value);
    }
    if (fileCount.present) {
      map['file_count'] = Variable<int>(fileCount.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedTagsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('colorToken: $colorToken, ')
          ..write('fileCount: $fileCount, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedSummariesTable extends CachedSummaries
    with TableInfo<$CachedSummariesTable, CachedSummary> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedSummariesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _syncedAtMeta = const VerificationMeta(
    'syncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
    'synced_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _truncatedMeta = const VerificationMeta(
    'truncated',
  );
  @override
  late final GeneratedColumn<bool> truncated = GeneratedColumn<bool>(
    'truncated',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("truncated" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  @override
  List<GeneratedColumn> get $columns => [id, payload, syncedAt, truncated];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_summaries';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedSummary> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('synced_at')) {
      context.handle(
        _syncedAtMeta,
        syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_syncedAtMeta);
    }
    if (data.containsKey('truncated')) {
      context.handle(
        _truncatedMeta,
        truncated.isAcceptableOrUnknown(data['truncated']!, _truncatedMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedSummary map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedSummary(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      syncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}synced_at'],
      )!,
      truncated: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}truncated'],
      )!,
    );
  }

  @override
  $CachedSummariesTable createAlias(String alias) {
    return $CachedSummariesTable(attachedDatabase, alias);
  }
}

class CachedSummary extends DataClass implements Insertable<CachedSummary> {
  final int id;
  final String payload;
  final DateTime syncedAt;
  final bool truncated;
  const CachedSummary({
    required this.id,
    required this.payload,
    required this.syncedAt,
    required this.truncated,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['payload'] = Variable<String>(payload);
    map['synced_at'] = Variable<DateTime>(syncedAt);
    map['truncated'] = Variable<bool>(truncated);
    return map;
  }

  CachedSummariesCompanion toCompanion(bool nullToAbsent) {
    return CachedSummariesCompanion(
      id: Value(id),
      payload: Value(payload),
      syncedAt: Value(syncedAt),
      truncated: Value(truncated),
    );
  }

  factory CachedSummary.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedSummary(
      id: serializer.fromJson<int>(json['id']),
      payload: serializer.fromJson<String>(json['payload']),
      syncedAt: serializer.fromJson<DateTime>(json['syncedAt']),
      truncated: serializer.fromJson<bool>(json['truncated']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'payload': serializer.toJson<String>(payload),
      'syncedAt': serializer.toJson<DateTime>(syncedAt),
      'truncated': serializer.toJson<bool>(truncated),
    };
  }

  CachedSummary copyWith({
    int? id,
    String? payload,
    DateTime? syncedAt,
    bool? truncated,
  }) => CachedSummary(
    id: id ?? this.id,
    payload: payload ?? this.payload,
    syncedAt: syncedAt ?? this.syncedAt,
    truncated: truncated ?? this.truncated,
  );
  CachedSummary copyWithCompanion(CachedSummariesCompanion data) {
    return CachedSummary(
      id: data.id.present ? data.id.value : this.id,
      payload: data.payload.present ? data.payload.value : this.payload,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
      truncated: data.truncated.present ? data.truncated.value : this.truncated,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedSummary(')
          ..write('id: $id, ')
          ..write('payload: $payload, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('truncated: $truncated')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, payload, syncedAt, truncated);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedSummary &&
          other.id == this.id &&
          other.payload == this.payload &&
          other.syncedAt == this.syncedAt &&
          other.truncated == this.truncated);
}

class CachedSummariesCompanion extends UpdateCompanion<CachedSummary> {
  final Value<int> id;
  final Value<String> payload;
  final Value<DateTime> syncedAt;
  final Value<bool> truncated;
  const CachedSummariesCompanion({
    this.id = const Value.absent(),
    this.payload = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.truncated = const Value.absent(),
  });
  CachedSummariesCompanion.insert({
    this.id = const Value.absent(),
    required String payload,
    required DateTime syncedAt,
    this.truncated = const Value.absent(),
  }) : payload = Value(payload),
       syncedAt = Value(syncedAt);
  static Insertable<CachedSummary> custom({
    Expression<int>? id,
    Expression<String>? payload,
    Expression<DateTime>? syncedAt,
    Expression<bool>? truncated,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (payload != null) 'payload': payload,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (truncated != null) 'truncated': truncated,
    });
  }

  CachedSummariesCompanion copyWith({
    Value<int>? id,
    Value<String>? payload,
    Value<DateTime>? syncedAt,
    Value<bool>? truncated,
  }) {
    return CachedSummariesCompanion(
      id: id ?? this.id,
      payload: payload ?? this.payload,
      syncedAt: syncedAt ?? this.syncedAt,
      truncated: truncated ?? this.truncated,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (truncated.present) {
      map['truncated'] = Variable<bool>(truncated.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedSummariesCompanion(')
          ..write('id: $id, ')
          ..write('payload: $payload, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('truncated: $truncated')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CachedFilesTable cachedFiles = $CachedFilesTable(this);
  late final $CachedFoldersTable cachedFolders = $CachedFoldersTable(this);
  late final $CachedTagsTable cachedTags = $CachedTagsTable(this);
  late final $CachedSummariesTable cachedSummaries = $CachedSummariesTable(
    this,
  );
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    cachedFiles,
    cachedFolders,
    cachedTags,
    cachedSummaries,
  ];
}

typedef $$CachedFilesTableCreateCompanionBuilder =
    CachedFilesCompanion Function({
      required String id,
      required String name,
      Value<String?> extension,
      required String mimeType,
      required int sizeBytes,
      required String category,
      required bool favorite,
      Value<String?> description,
      Value<String?> folderId,
      Value<String?> folderName,
      required String contentStatus,
      required String tagsJson,
      required DateTime createdAt,
      required DateTime updatedAt,
      Value<int> rowid,
    });
typedef $$CachedFilesTableUpdateCompanionBuilder =
    CachedFilesCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> extension,
      Value<String> mimeType,
      Value<int> sizeBytes,
      Value<String> category,
      Value<bool> favorite,
      Value<String?> description,
      Value<String?> folderId,
      Value<String?> folderName,
      Value<String> contentStatus,
      Value<String> tagsJson,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

class $$CachedFilesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedFilesTable> {
  $$CachedFilesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get extension => $composableBuilder(
    column: $table.extension,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get mimeType => $composableBuilder(
    column: $table.mimeType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get favorite => $composableBuilder(
    column: $table.favorite,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get folderId => $composableBuilder(
    column: $table.folderId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get folderName => $composableBuilder(
    column: $table.folderName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get contentStatus => $composableBuilder(
    column: $table.contentStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tagsJson => $composableBuilder(
    column: $table.tagsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedFilesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedFilesTable> {
  $$CachedFilesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get extension => $composableBuilder(
    column: $table.extension,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get mimeType => $composableBuilder(
    column: $table.mimeType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get favorite => $composableBuilder(
    column: $table.favorite,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get folderId => $composableBuilder(
    column: $table.folderId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get folderName => $composableBuilder(
    column: $table.folderName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get contentStatus => $composableBuilder(
    column: $table.contentStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tagsJson => $composableBuilder(
    column: $table.tagsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedFilesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedFilesTable> {
  $$CachedFilesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get extension =>
      $composableBuilder(column: $table.extension, builder: (column) => column);

  GeneratedColumn<String> get mimeType =>
      $composableBuilder(column: $table.mimeType, builder: (column) => column);

  GeneratedColumn<int> get sizeBytes =>
      $composableBuilder(column: $table.sizeBytes, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<bool> get favorite =>
      $composableBuilder(column: $table.favorite, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<String> get folderId =>
      $composableBuilder(column: $table.folderId, builder: (column) => column);

  GeneratedColumn<String> get folderName => $composableBuilder(
    column: $table.folderName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get contentStatus => $composableBuilder(
    column: $table.contentStatus,
    builder: (column) => column,
  );

  GeneratedColumn<String> get tagsJson =>
      $composableBuilder(column: $table.tagsJson, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$CachedFilesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedFilesTable,
          CachedFile,
          $$CachedFilesTableFilterComposer,
          $$CachedFilesTableOrderingComposer,
          $$CachedFilesTableAnnotationComposer,
          $$CachedFilesTableCreateCompanionBuilder,
          $$CachedFilesTableUpdateCompanionBuilder,
          (
            CachedFile,
            BaseReferences<_$AppDatabase, $CachedFilesTable, CachedFile>,
          ),
          CachedFile,
          PrefetchHooks Function()
        > {
  $$CachedFilesTableTableManager(_$AppDatabase db, $CachedFilesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedFilesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedFilesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedFilesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> extension = const Value.absent(),
                Value<String> mimeType = const Value.absent(),
                Value<int> sizeBytes = const Value.absent(),
                Value<String> category = const Value.absent(),
                Value<bool> favorite = const Value.absent(),
                Value<String?> description = const Value.absent(),
                Value<String?> folderId = const Value.absent(),
                Value<String?> folderName = const Value.absent(),
                Value<String> contentStatus = const Value.absent(),
                Value<String> tagsJson = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedFilesCompanion(
                id: id,
                name: name,
                extension: extension,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                category: category,
                favorite: favorite,
                description: description,
                folderId: folderId,
                folderName: folderName,
                contentStatus: contentStatus,
                tagsJson: tagsJson,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> extension = const Value.absent(),
                required String mimeType,
                required int sizeBytes,
                required String category,
                required bool favorite,
                Value<String?> description = const Value.absent(),
                Value<String?> folderId = const Value.absent(),
                Value<String?> folderName = const Value.absent(),
                required String contentStatus,
                required String tagsJson,
                required DateTime createdAt,
                required DateTime updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => CachedFilesCompanion.insert(
                id: id,
                name: name,
                extension: extension,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                category: category,
                favorite: favorite,
                description: description,
                folderId: folderId,
                folderName: folderName,
                contentStatus: contentStatus,
                tagsJson: tagsJson,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$CachedFilesTable, CachedFile>(table),
                  BaseReferences<_$AppDatabase, $CachedFilesTable, CachedFile>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedFilesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedFilesTable,
      CachedFile,
      $$CachedFilesTableFilterComposer,
      $$CachedFilesTableOrderingComposer,
      $$CachedFilesTableAnnotationComposer,
      $$CachedFilesTableCreateCompanionBuilder,
      $$CachedFilesTableUpdateCompanionBuilder,
      (
        CachedFile,
        BaseReferences<_$AppDatabase, $CachedFilesTable, CachedFile>,
      ),
      CachedFile,
      PrefetchHooks Function()
    >;
typedef $$CachedFoldersTableCreateCompanionBuilder =
    CachedFoldersCompanion Function({
      required String id,
      required String name,
      Value<String?> parentFolderId,
      required int fileCount,
      required int folderCount,
      required DateTime createdAt,
      required DateTime updatedAt,
      Value<int> rowid,
    });
typedef $$CachedFoldersTableUpdateCompanionBuilder =
    CachedFoldersCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> parentFolderId,
      Value<int> fileCount,
      Value<int> folderCount,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

class $$CachedFoldersTableFilterComposer
    extends Composer<_$AppDatabase, $CachedFoldersTable> {
  $$CachedFoldersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get parentFolderId => $composableBuilder(
    column: $table.parentFolderId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get fileCount => $composableBuilder(
    column: $table.fileCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get folderCount => $composableBuilder(
    column: $table.folderCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedFoldersTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedFoldersTable> {
  $$CachedFoldersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get parentFolderId => $composableBuilder(
    column: $table.parentFolderId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get fileCount => $composableBuilder(
    column: $table.fileCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get folderCount => $composableBuilder(
    column: $table.folderCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedFoldersTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedFoldersTable> {
  $$CachedFoldersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get parentFolderId => $composableBuilder(
    column: $table.parentFolderId,
    builder: (column) => column,
  );

  GeneratedColumn<int> get fileCount =>
      $composableBuilder(column: $table.fileCount, builder: (column) => column);

  GeneratedColumn<int> get folderCount => $composableBuilder(
    column: $table.folderCount,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$CachedFoldersTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedFoldersTable,
          CachedFolder,
          $$CachedFoldersTableFilterComposer,
          $$CachedFoldersTableOrderingComposer,
          $$CachedFoldersTableAnnotationComposer,
          $$CachedFoldersTableCreateCompanionBuilder,
          $$CachedFoldersTableUpdateCompanionBuilder,
          (
            CachedFolder,
            BaseReferences<_$AppDatabase, $CachedFoldersTable, CachedFolder>,
          ),
          CachedFolder,
          PrefetchHooks Function()
        > {
  $$CachedFoldersTableTableManager(_$AppDatabase db, $CachedFoldersTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedFoldersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedFoldersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedFoldersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> parentFolderId = const Value.absent(),
                Value<int> fileCount = const Value.absent(),
                Value<int> folderCount = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedFoldersCompanion(
                id: id,
                name: name,
                parentFolderId: parentFolderId,
                fileCount: fileCount,
                folderCount: folderCount,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> parentFolderId = const Value.absent(),
                required int fileCount,
                required int folderCount,
                required DateTime createdAt,
                required DateTime updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => CachedFoldersCompanion.insert(
                id: id,
                name: name,
                parentFolderId: parentFolderId,
                fileCount: fileCount,
                folderCount: folderCount,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$CachedFoldersTable, CachedFolder>(table),
                  BaseReferences<
                    _$AppDatabase,
                    $CachedFoldersTable,
                    CachedFolder
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedFoldersTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedFoldersTable,
      CachedFolder,
      $$CachedFoldersTableFilterComposer,
      $$CachedFoldersTableOrderingComposer,
      $$CachedFoldersTableAnnotationComposer,
      $$CachedFoldersTableCreateCompanionBuilder,
      $$CachedFoldersTableUpdateCompanionBuilder,
      (
        CachedFolder,
        BaseReferences<_$AppDatabase, $CachedFoldersTable, CachedFolder>,
      ),
      CachedFolder,
      PrefetchHooks Function()
    >;
typedef $$CachedTagsTableCreateCompanionBuilder = CachedTagsCompanion Function({
  required String id,
  required String name,
  Value<String?> colorToken,
  required int fileCount,
  required DateTime createdAt,
  Value<int> rowid,
});
typedef $$CachedTagsTableUpdateCompanionBuilder = CachedTagsCompanion Function({
  Value<String> id,
  Value<String> name,
  Value<String?> colorToken,
  Value<int> fileCount,
  Value<DateTime> createdAt,
  Value<int> rowid,
});

class $$CachedTagsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedTagsTable> {
  $$CachedTagsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get colorToken => $composableBuilder(
    column: $table.colorToken,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get fileCount => $composableBuilder(
    column: $table.fileCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedTagsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedTagsTable> {
  $$CachedTagsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get colorToken => $composableBuilder(
    column: $table.colorToken,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get fileCount => $composableBuilder(
    column: $table.fileCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedTagsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedTagsTable> {
  $$CachedTagsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get colorToken => $composableBuilder(
    column: $table.colorToken,
    builder: (column) => column,
  );

  GeneratedColumn<int> get fileCount =>
      $composableBuilder(column: $table.fileCount, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$CachedTagsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedTagsTable,
          CachedTag,
          $$CachedTagsTableFilterComposer,
          $$CachedTagsTableOrderingComposer,
          $$CachedTagsTableAnnotationComposer,
          $$CachedTagsTableCreateCompanionBuilder,
          $$CachedTagsTableUpdateCompanionBuilder,
          (
            CachedTag,
            BaseReferences<_$AppDatabase, $CachedTagsTable, CachedTag>,
          ),
          CachedTag,
          PrefetchHooks Function()
        > {
  $$CachedTagsTableTableManager(_$AppDatabase db, $CachedTagsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedTagsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedTagsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedTagsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> colorToken = const Value.absent(),
                Value<int> fileCount = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedTagsCompanion(
                id: id,
                name: name,
                colorToken: colorToken,
                fileCount: fileCount,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> colorToken = const Value.absent(),
                required int fileCount,
                required DateTime createdAt,
                Value<int> rowid = const Value.absent(),
              }) => CachedTagsCompanion.insert(
                id: id,
                name: name,
                colorToken: colorToken,
                fileCount: fileCount,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$CachedTagsTable, CachedTag>(table),
                  BaseReferences<_$AppDatabase, $CachedTagsTable, CachedTag>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedTagsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedTagsTable,
      CachedTag,
      $$CachedTagsTableFilterComposer,
      $$CachedTagsTableOrderingComposer,
      $$CachedTagsTableAnnotationComposer,
      $$CachedTagsTableCreateCompanionBuilder,
      $$CachedTagsTableUpdateCompanionBuilder,
      (CachedTag, BaseReferences<_$AppDatabase, $CachedTagsTable, CachedTag>),
      CachedTag,
      PrefetchHooks Function()
    >;
typedef $$CachedSummariesTableCreateCompanionBuilder =
    CachedSummariesCompanion Function({
      Value<int> id,
      required String payload,
      required DateTime syncedAt,
      Value<bool> truncated,
    });
typedef $$CachedSummariesTableUpdateCompanionBuilder =
    CachedSummariesCompanion Function({
      Value<int> id,
      Value<String> payload,
      Value<DateTime> syncedAt,
      Value<bool> truncated,
    });

class $$CachedSummariesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedSummariesTable> {
  $$CachedSummariesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get truncated => $composableBuilder(
    column: $table.truncated,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedSummariesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedSummariesTable> {
  $$CachedSummariesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
    column: $table.syncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get truncated => $composableBuilder(
    column: $table.truncated,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedSummariesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedSummariesTable> {
  $$CachedSummariesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);

  GeneratedColumn<bool> get truncated =>
      $composableBuilder(column: $table.truncated, builder: (column) => column);
}

class $$CachedSummariesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedSummariesTable,
          CachedSummary,
          $$CachedSummariesTableFilterComposer,
          $$CachedSummariesTableOrderingComposer,
          $$CachedSummariesTableAnnotationComposer,
          $$CachedSummariesTableCreateCompanionBuilder,
          $$CachedSummariesTableUpdateCompanionBuilder,
          (
            CachedSummary,
            BaseReferences<_$AppDatabase, $CachedSummariesTable, CachedSummary>,
          ),
          CachedSummary,
          PrefetchHooks Function()
        > {
  $$CachedSummariesTableTableManager(
    _$AppDatabase db,
    $CachedSummariesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedSummariesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedSummariesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedSummariesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> syncedAt = const Value.absent(),
                Value<bool> truncated = const Value.absent(),
              }) => CachedSummariesCompanion(
                id: id,
                payload: payload,
                syncedAt: syncedAt,
                truncated: truncated,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String payload,
                required DateTime syncedAt,
                Value<bool> truncated = const Value.absent(),
              }) => CachedSummariesCompanion.insert(
                id: id,
                payload: payload,
                syncedAt: syncedAt,
                truncated: truncated,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$CachedSummariesTable, CachedSummary>(table),
                  BaseReferences<
                    _$AppDatabase,
                    $CachedSummariesTable,
                    CachedSummary
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedSummariesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedSummariesTable,
      CachedSummary,
      $$CachedSummariesTableFilterComposer,
      $$CachedSummariesTableOrderingComposer,
      $$CachedSummariesTableAnnotationComposer,
      $$CachedSummariesTableCreateCompanionBuilder,
      $$CachedSummariesTableUpdateCompanionBuilder,
      (
        CachedSummary,
        BaseReferences<_$AppDatabase, $CachedSummariesTable, CachedSummary>,
      ),
      CachedSummary,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CachedFilesTableTableManager get cachedFiles =>
      $$CachedFilesTableTableManager(_db, _db.cachedFiles);
  $$CachedFoldersTableTableManager get cachedFolders =>
      $$CachedFoldersTableTableManager(_db, _db.cachedFolders);
  $$CachedTagsTableTableManager get cachedTags =>
      $$CachedTagsTableTableManager(_db, _db.cachedTags);
  $$CachedSummariesTableTableManager get cachedSummaries =>
      $$CachedSummariesTableTableManager(_db, _db.cachedSummaries);
}
