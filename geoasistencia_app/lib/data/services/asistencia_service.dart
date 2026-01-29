import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import 'api_service.dart';

class AsistenciaService {
  static const _storage = FlutterSecureStorage();

  static Future<Map<String, dynamic>> marcar({
    required String tipo, // 'entrada' | 'salida' | 'manual'
    required double latitud,
    required double longitud,
    required String modo, // 'app' | 'manual' | 'sync_offline'
    Map<String, dynamic>? deviceInfo,
    String? evidence,
    DateTime? timestampRegistro,
  }) async {
    final usuarioId = await _storage.read(key: StorageKeys.usuarioId);
    if (usuarioId == null) {
      return {'ok': false, 'error': 'Sesión expirada'};
    }

    final response = await ApiService.postJson(
      '/asistencia/registro',
      body: {
        'usuario_id': usuarioId,
        'tipo': tipo,
        'latitud': latitud.toStringAsFixed(6),
        'longitud': longitud.toStringAsFixed(6),
        'modo': modo,
        if (timestampRegistro != null) 'timestamp_registro': timestampRegistro.toIso8601String(),
        if (deviceInfo != null) 'device_info': deviceInfo,
        if (evidence != null) 'evidence': evidence,
      },
      auth: true,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }

    return {
      'ok': false,
      'error': 'Error ${response.statusCode}: ${response.body}'
    };
  }
}
