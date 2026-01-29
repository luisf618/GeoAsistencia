import 'package:flutter/material.dart';
import 'features/auth/login_screen.dart';

void main() {
  runApp(const GeoAsistenciaApp());
}

class GeoAsistenciaApp extends StatelessWidget {
  const GeoAsistenciaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GeoAsistencia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: const LoginScreen(),
    );
  }
}
