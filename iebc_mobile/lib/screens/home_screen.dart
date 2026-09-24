import 'package:flutter/material.dart';
import '../services/db_service.dart';
import '../services/sync_service.dart';
import '../theme.dart';
import 'station_report_screen.dart';
import 'incident_report_screen.dart';
import 'qr_check_in_screen.dart';
import 'my_reports_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _pendingCount = 0;

  @override
  void initState() {
    super.initState();
    _refreshPendingCount();
  }

  Future<void> _refreshPendingCount() async {
    final count = await DBService.instance.countPendingSync();
    if (mounted) setState(() => _pendingCount = count);
  }

  Future<void> _syncNow() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Syncing...')),
    );
    await SyncService.instance.syncNow();
    await _refreshPendingCount();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sync complete')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Field Reporting'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sync now',
            onPressed: _syncNow,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_pendingCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cloud_off_outlined, size: 18, color: AppColors.gold),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '$_pendingCount report(s) waiting to sync',
                        style: const TextStyle(fontSize: 13, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 20),
            _ActionCard(
              icon: Icons.how_to_reg,
              iconColor: AppColors.primary,
              title: 'Station Status Report',
              subtitle: 'Queue length, KIEMS status, materials, opening/closing times',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const StationReportScreen()),
                );
                _refreshPendingCount();
              },
            ),
            const SizedBox(height: 12),
            _ActionCard(
              icon: Icons.qr_code_scanner,
              iconColor: AppColors.moss,
              title: 'Confirm My Station',
              subtitle: 'Scan the QR code at your polling station',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QrCheckInScreen()),
                );
              },
            ),
            const SizedBox(height: 12),
            _ActionCard(
              icon: Icons.list_alt,
              iconColor: AppColors.moss,
              title: 'My Reports',
              subtitle: 'View the status of incidents you\'ve reported',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MyReportsScreen()),
                );
              },
            ),
            _ActionCard(
              icon: Icons.report_problem_outlined,
              iconColor: AppColors.gold,
              title: 'Report an Incident',
              subtitle: 'Device failure, shortages, security incidents',
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const IncidentReportScreen()),
                );
                _refreshPendingCount();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                height: 44,
                width: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 22, color: iconColor),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12.5, color: AppColors.muted)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
