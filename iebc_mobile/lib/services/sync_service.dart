import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'db_service.dart';
import 'api_service.dart';

// Watches connectivity and periodically pushes any locally-queued
// reports/incidents to the backend. This is what makes the app "offline-first":
// officers can keep submitting reports with no signal, and everything
// quietly syncs once a connection is available.
class SyncService {
  SyncService._();
  static final SyncService instance = SyncService._();

  Timer? _timer;
  bool _syncing = false;

  void startBackgroundSync() {
    // Try syncing every 30 seconds, and immediately whenever connectivity changes
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => syncNow());

    Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection = !results.contains(ConnectivityResult.none);
      if (hasConnection) syncNow();
    });
  }

  void dispose() {
    _timer?.cancel();
  }

  Future<void> syncNow() async {
    if (_syncing) return; // avoid overlapping sync runs
    _syncing = true;

    try {
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity.contains(ConnectivityResult.none)) {
        return; // no point trying, we're offline
      }

      // Sync station reports
      final pendingReports = await DBService.instance.getUnsyncedStationReports();
      for (final report in pendingReports) {
        try {
          await ApiService.instance.submitStationReport(report);
          await DBService.instance.markStationReportSynced(report.clientUuid);
        } catch (_) {
          // leave it queued, will retry next cycle
        }
      }

      // Sync incidents
      final pendingIncidents = await DBService.instance.getUnsyncedIncidents();
      for (final incident in pendingIncidents) {
        try {
          await ApiService.instance.submitIncident(incident);
          await DBService.instance.markIncidentSynced(incident.clientUuid);
        } catch (_) {
          // leave it queued, will retry next cycle
        }
      }
    } finally {
      _syncing = false;
    }
  }
}
