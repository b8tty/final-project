import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<dynamic> _incidents = [];
  bool _loading = true;
  String? _error;

  static const _categoryLabels = {
    'device_failure': 'Device Failure',
    'material_shortage': 'Material Shortage',
    'security_incident': 'Security Incident',
    'queue_delay': 'Queue Delay',
    'other': 'Other',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final prefs = await SharedPreferences.getInstance();
    final stationId = prefs.getInt('polling_station_id');

    if (stationId == null) {
      setState(() {
        _loading = false;
        _error = 'No polling station is set on this account yet.';
      });
      return;
    }

    try {
      final data = await ApiService.instance.myStationIncidents(stationId);
      setState(() {
        _incidents = data;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'Could not load reports. Check your connection.';
      });
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'resolved':
        return AppColors.darkMoss;
      case 'in_progress':
        return AppColors.gold;
      default:
        return const Color(0xFFB3261E);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Reports'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
                  ),
                )
              : _incidents.isEmpty
                  ? const Center(
                      child: Text('No incidents reported yet for your station.', style: TextStyle(color: AppColors.muted)),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _incidents.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final inc = _incidents[index];
                          final status = inc['status'] as String;
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _categoryLabels[inc['category']] ?? inc['category'],
                                      style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _statusColor(status).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        status.replaceAll('_', ' '),
                                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: _statusColor(status)),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(inc['description'], style: const TextStyle(fontSize: 13, color: AppColors.muted)),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
