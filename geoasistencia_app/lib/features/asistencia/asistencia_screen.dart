import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import '../../data/services/asistencia_service.dart';
import '../../utils/geo_utils.dart';

/// Estado basado en la última marcación exitosa del día.
/// Permite ciclos repetidos: Entrada -> Salida -> Entrada -> ...
enum EstadoAsistencia { sinRegistro, ultimoFueEntrada, ultimoFueSalida }

class AsistenciaScreen extends StatefulWidget {
  const AsistenciaScreen({super.key});

  @override
  State<AsistenciaScreen> createState() => _AsistenciaScreenState();
}

class _AsistenciaScreenState extends State<AsistenciaScreen> {
  final _storage = const FlutterSecureStorage();

  bool dentro = false;
  double? distanciaM;
  Position? _pos;

  EstadoAsistencia estado = EstadoAsistencia.sinRegistro;
  bool _loading = false;

  double? sedeLat;
  double? sedeLon;
  double? sedeRadio;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _cargarSede();
    await _cargarEstadoLocal();
    await verificarUbicacion();
  }

  Future<void> _cargarSede() async {
    final sedeJson = await _storage.read(key: StorageKeys.sede);
    if (sedeJson == null) return;
    final sede = jsonDecode(sedeJson) as Map<String, dynamic>;
    sedeLat = double.tryParse(sede['latitud'].toString());
    sedeLon = double.tryParse(sede['longitud'].toString());
    sedeRadio = double.tryParse(sede['radio'].toString());
  }

  Future<void> _cargarEstadoLocal() async {
    final last = await _storage.read(key: StorageKeys.ultimaAccion);
    final lastDate = await _storage.read(key: StorageKeys.ultimaAccionFecha);

    final today = DateTime.now();
    final todayStr = '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    if (lastDate != todayStr) {
      estado = EstadoAsistencia.sinRegistro;
      await _storage.write(key: StorageKeys.ultimaAccionFecha, value: todayStr);
      await _storage.delete(key: StorageKeys.ultimaAccion);
      return;
    }

    if (last == 'entrada') estado = EstadoAsistencia.ultimoFueEntrada;
    if (last == 'salida') estado = EstadoAsistencia.ultimoFueSalida;
  }

  Future<void> verificarUbicacion() async {
    if (sedeLat == null || sedeLon == null || sedeRadio == null) {
      setState(() {
        dentro = false;
        distanciaM = null;
      });
      return;
    }

    final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    final dist = calculateDistance(pos.latitude, pos.longitude, sedeLat!, sedeLon!);

    setState(() {
      _pos = pos;
      distanciaM = dist;
      dentro = dist <= sedeRadio!;
    });
  }

  Future<void> _marcar(String tipo) async {
    if (_pos == null) {
      await verificarUbicacion();
      if (_pos == null) return;
    }

    setState(() => _loading = true);

    final resp = await AsistenciaService.marcar(
      tipo: tipo,
      latitud: _pos!.latitude,
      longitud: _pos!.longitude,
      modo: 'app',
    );

    setState(() => _loading = false);

    if (!mounted) return;

    final ok = resp['ok'] == true;
    if (ok) {
      final dentroSrv = resp['dentro_geocerca'] == true;

      if (!dentroSrv) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registro guardado como excepción: estás fuera de la sede')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Marcación registrada: $tipo')),
        );
      }

      // Persistir estado local para bloquear doble marcación (Semana 3)
      await _storage.write(key: StorageKeys.ultimaAccion, value: tipo);

      setState(() {
        if (tipo == 'entrada') estado = EstadoAsistencia.ultimoFueEntrada;
        if (tipo == 'salida') estado = EstadoAsistencia.ultimoFueSalida;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(resp['error']?.toString() ?? 'Error al registrar')),
      );
    }
  }

  Future<void> _abrirSolicitudManual() async {
    final tipoSolicitado = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SolicitudSheet(estado: estado),
    );

    if (tipoSolicitado == null) return;

    final motivoCtrl = TextEditingController();
    DateTime selectedDT = DateTime.now();

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setSt) => AlertDialog(
        title: const Text('Solicitud manual'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: motivoCtrl,
              decoration: const InputDecoration(
                labelText: 'Motivo (obligatorio)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event),
              title: const Text('Fecha'),
              subtitle: Text(
                '${selectedDT.year.toString().padLeft(4, '0')}-${selectedDT.month.toString().padLeft(2, '0')}-${selectedDT.day.toString().padLeft(2, '0')}',
              ),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: selectedDT,
                  firstDate: DateTime(2020, 1, 1),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked == null) return;
                setSt(() {
                  selectedDT = DateTime(
                    picked.year,
                    picked.month,
                    picked.day,
                    selectedDT.hour,
                    selectedDT.minute,
                  );
                });
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.schedule),
              title: const Text('Hora'),
              subtitle: Text('${selectedDT.hour.toString().padLeft(2, '0')}:${selectedDT.minute.toString().padLeft(2, '0')}'),
              onTap: () async {
                final picked = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay(hour: selectedDT.hour, minute: selectedDT.minute),
                );
                if (picked == null) return;
                setSt(() {
                  selectedDT = DateTime(
                    selectedDT.year,
                    selectedDT.month,
                    selectedDT.day,
                    picked.hour,
                    picked.minute,
                  );
                });
              },
            ),
            const SizedBox(height: 6),
            Text(
              'Se registrará como solicitud manual de ${tipoSolicitado.toUpperCase()} para ${selectedDT.toLocal()}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            )
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Enviar')),
        ],
      ),
      ),
    );

    if (ok != true) return;

    final motivo = motivoCtrl.text.trim();
    if (motivo.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Motivo obligatorio')));
      return;
    }

    // Se registra como 'manual' en la misma tabla, sin alterar el flujo entrada/salida.
    // El motivo se envía en device_info para auditoría.
    if (_pos == null) {
      await verificarUbicacion();
      if (_pos == null) return;
    }

    setState(() => _loading = true);

    final resp = await AsistenciaService.marcar(
      tipo: 'manual',
      latitud: _pos!.latitude,
      longitud: _pos!.longitude,
      modo: 'manual',
      timestampRegistro: selectedDT,
      deviceInfo: {
        'motivo': motivo,
        'solicita_para': tipoSolicitado,
        'fecha_hora_solicitada': selectedDT.toIso8601String(),
      },
    );

    setState(() => _loading = false);

    if (!mounted) return;

    final okResp = resp['ok'] == true;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(okResp ? 'Solicitud manual enviada (para revisión)' : (resp['error']?.toString() ?? 'No se pudo enviar'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusText = dentro ? 'DENTRO DE LA SEDE ✅' : 'FUERA DE LA SEDE ❌';
    final statusColor = dentro ? Colors.green : Colors.red;

    final nextTipo = (estado == EstadoAsistencia.ultimoFueEntrada) ? 'salida' : 'entrada';
    final puedeMarcar = dentro && !_loading;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asistencia'),
        actions: [
          IconButton(
            onPressed: _loading ? null : verificarUbicacion,
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar ubicación',
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(statusText, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: statusColor)),
                const SizedBox(height: 10),
                if (distanciaM != null && sedeRadio != null)
                  Text('Distancia: ${distanciaM!.toStringAsFixed(1)} m  |  Radio: ${sedeRadio!.toStringAsFixed(0)} m'),
                const SizedBox(height: 10),
                if (_pos != null)
                  Text('Lat: ${_pos!.latitude.toStringAsFixed(6)}  Lon: ${_pos!.longitude.toStringAsFixed(6)}',
                      style: const TextStyle(fontSize: 12, color: Colors.black54)),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: puedeMarcar ? () => _marcar(nextTipo) : null,
                    icon: Icon(nextTipo == 'entrada' ? Icons.login : Icons.logout),
                    label: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(nextTipo == 'entrada' ? 'Marcar Entrada' : 'Marcar Salida'),
                  ),
                ),
                const SizedBox(height: 14),
                if (estado == EstadoAsistencia.ultimoFueEntrada)
                  const Text(
                    'Recuerda marcar tu salida antes de retirarte.',
                    style: TextStyle(color: Colors.orange),
                  ),
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: _loading ? null : _abrirSolicitudManual,
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Solicitud manual (excepción)'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SolicitudSheet extends StatelessWidget {
  final EstadoAsistencia estado;
  const _SolicitudSheet({required this.estado});

  @override
  Widget build(BuildContext context) {
    final opciones = <String>[];
    // Sugerimos la acción que toca según el último registro, pero dejamos ambas opciones
    // por si el usuario necesita corregir una marcación previa.
    if (estado == EstadoAsistencia.ultimoFueEntrada) {
      opciones.addAll(['salida', 'entrada']);
    } else {
      opciones.addAll(['entrada', 'salida']);
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('¿Qué deseas solicitar?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            for (final t in opciones)
              ListTile(
                leading: const Icon(Icons.assignment_outlined),
                title: Text('Solicitud manual de ${t.toUpperCase()}'),
                onTap: () => Navigator.pop(context, t),
              ),
          ],
        ),
      ),
    );
  }
}
