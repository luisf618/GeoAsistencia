import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import '../../core/permissions.dart';
import '../asistencia/asistencia_screen.dart';

class PermisosScreen extends StatefulWidget {
  const PermisosScreen({super.key});

  @override
  State<PermisosScreen> createState() => _PermisosScreenState();
}

class _PermisosScreenState extends State<PermisosScreen> {
  final _storage = const FlutterSecureStorage();
  bool _loading = false;

  Future<void> _continuar() async {
    setState(() => _loading = true);

    // 1) Verificar que el GPS/servicio de ubicación esté activo
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _loading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Activa el GPS/Ubicación para continuar')),
      );
      await Geolocator.openLocationSettings();
      return;
    }

    // 2) Solicitar permiso explícito (LOPDP - consentimiento)
    final ok = await PermissionService.requestLocation();
    if (!ok) {
      setState(() => _loading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debes aceptar el permiso de ubicación')),
      );
      return;
    }

    await _storage.write(key: StorageKeys.consentimiento, value: 'true');

    setState(() => _loading = false);
    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const AsistenciaScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Consentimiento')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.privacy_tip_outlined, size: 56),
                const SizedBox(height: 18),
                const Text(
                  'Privacidad por diseño (LOPDP)',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                const Text(
                  'GeoAsistencia utilizará tu ubicación únicamente para validar el registro de asistencia '
                  '(dentro/fuera de la sede asignada). No se recopila tu ubicación de forma continua.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _continuar,
                    child: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Aceptar y continuar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
