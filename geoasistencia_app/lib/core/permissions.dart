import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static Future<bool> requestLocation() async {
    final status = await Permission.locationWhenInUse.request();
    return status.isGranted;
  }
}
