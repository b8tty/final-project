import 'package:flutter/material.dart';
import 'services/db_service.dart';
import 'services/sync_service.dart';
import 'screens/login_screen.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DBService.instance.init(); // sets up local SQLite tables
  SyncService.instance.startBackgroundSync(); // periodic sync when online
  runApp(const IEBCApp());
}

class IEBCApp extends StatelessWidget {
  const IEBCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IEBC Field Reporting',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const LoginScreen(),
    );
  }
}
