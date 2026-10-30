import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

class ScriptedReply {
  const ScriptedReply(this.status, this.body, {this.delay});

  final int status;
  final Object body;
  final Duration? delay;
}

/// Deterministic transport for unit and widget tests; never touches a socket.
class ScriptedHttpAdapter implements HttpClientAdapter {
  ScriptedHttpAdapter(this.replies);

  final List<ScriptedReply> replies;
  final List<RequestOptions> requests = [];
  int _next = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (_next >= replies.length) {
      throw StateError(
        'No scripted reply for ${options.method} ${options.uri}',
      );
    }
    final reply = replies[_next++];
    if (reply.delay != null) {
      await Future<void>.delayed(reply.delay!);
    }
    final text = reply.body is String
        ? reply.body as String
        : jsonEncode(reply.body);
    return ResponseBody.fromString(
      text,
      reply.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
