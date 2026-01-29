import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/config.dart';
import '../../core/constants.dart';

class ApiService {
  static const _storage = FlutterSecureStorage();

  static Future<String?> getToken() async {
    return _storage.read(key: StorageKeys.token);
  }

  static Uri _uri(String path) => Uri.parse('${AppConfig.baseUrl}$path');

  static Future<http.Response> postJson(
    String path, {
    Map<String, String>? headers,
    Map<String, dynamic>? body,
    bool auth = false,
  }) async {
    final h = <String, String>{
      'Content-Type': 'application/json',
      ...?headers,
    };

    if (auth) {
      final token = await getToken();
      if (token != null) {
        h['Authorization'] = 'Bearer $token';
      }
    }

    return http.post(
      _uri(path),
      headers: h,
      body: jsonEncode(body ?? {}),
    );
  }
}
