import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import 'api_service.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  static Future<bool> login(String email, String password) async {
    final response = await ApiService.postJson(
      '/auth/login',
      body: {'email': email.trim(), 'password': password},
      auth: false,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      await _storage.write(key: StorageKeys.token, value: data['token'].toString());
      await _storage.write(key: StorageKeys.usuarioId, value: data['usuario_id'].toString());
      await _storage.write(key: StorageKeys.sede, value: jsonEncode(data['sede']));

      // Reset estado local de marcación al iniciar sesión
      // (si quieres mantenerlo por día, se maneja en AsistenciaScreen)
      return true;
    }

    return false;
  }

  static Future<void> logout() async {
    await _storage.delete(key: StorageKeys.token);
    await _storage.delete(key: StorageKeys.usuarioId);
    await _storage.delete(key: StorageKeys.sede);
    await _storage.delete(key: StorageKeys.consentimiento);
  }

  static Future<String?> getUsuarioId() => _storage.read(key: StorageKeys.usuarioId);
}
