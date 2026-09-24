import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/report_models.dart';

// Handles all local (on-device) storage.
// Reports/incidents are written here FIRST, then synced to the server
// in the background whenever connectivity is available.
//
// NOTE: sqflite requires native SQLite, which isn't available in a browser.
// On web, this falls back to simple in-memory lists so you can preview the
// UI in Chrome/Edge — but nothing persists across a page refresh there, and
// there's no real offline queue. For actual field use (and to properly test
// offline sync), this must run on Android/iOS or as a Windows desktop build.
class DBService {
  DBService._();
  static final DBService instance = DBService._();

  Database? _db;

  // In-memory fallback storage, used only when kIsWeb is true
  final List<StationReport> _webStationReports = [];
  final List<IncidentReport> _webIncidents = [];

  Future<void> init() async {
    if (kIsWeb) return; // skip sqflite entirely on web

    final path = join(await getDatabasesPath(), 'iebc_field.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE station_reports (
            client_uuid TEXT PRIMARY KEY,
            polling_station_id INTEGER NOT NULL,
            queue_length INTEGER,
            kiems_status TEXT,
            materials_status TEXT,
            opening_time TEXT,
            closing_time TEXT,
            notes TEXT,
            submitted_at TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE incidents (
            client_uuid TEXT PRIMARY KEY,
            polling_station_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
    );
  }

  Database get db {
    if (_db == null) {
      throw Exception('DBService not initialized. Call init() first.');
    }
    return _db!;
  }

  // ---- Station reports ----

  Future<void> saveStationReport(StationReport report) async {
    if (kIsWeb) {
      _webStationReports.removeWhere((r) => r.clientUuid == report.clientUuid);
      _webStationReports.add(report);
      return;
    }
    await db.insert(
      'station_reports',
      report.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<StationReport>> getUnsyncedStationReports() async {
    if (kIsWeb) {
      return _webStationReports.where((r) => !r.synced).toList();
    }
    final rows = await db.query('station_reports', where: 'synced = 0');
    return rows.map((r) => StationReport.fromMap(r)).toList();
  }

  Future<void> markStationReportSynced(String clientUuid) async {
    if (kIsWeb) {
      final index = _webStationReports.indexWhere((r) => r.clientUuid == clientUuid);
      if (index != -1) {
        final old = _webStationReports[index];
        _webStationReports[index] = StationReport(
          clientUuid: old.clientUuid,
          pollingStationId: old.pollingStationId,
          queueLength: old.queueLength,
          kiemsStatus: old.kiemsStatus,
          materialsStatus: old.materialsStatus,
          openingTime: old.openingTime,
          closingTime: old.closingTime,
          notes: old.notes,
          submittedAt: old.submittedAt,
          synced: true,
        );
      }
      return;
    }
    await db.update(
      'station_reports',
      {'synced': 1},
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
    );
  }

  // ---- Incidents ----

  Future<void> saveIncident(IncidentReport incident) async {
    if (kIsWeb) {
      _webIncidents.removeWhere((i) => i.clientUuid == incident.clientUuid);
      _webIncidents.add(incident);
      return;
    }
    await db.insert(
      'incidents',
      incident.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<IncidentReport>> getUnsyncedIncidents() async {
    if (kIsWeb) {
      return _webIncidents.where((i) => !i.synced).toList();
    }
    final rows = await db.query('incidents', where: 'synced = 0');
    return rows.map((r) => IncidentReport.fromMap(r)).toList();
  }

  Future<void> markIncidentSynced(String clientUuid) async {
    if (kIsWeb) {
      final index = _webIncidents.indexWhere((i) => i.clientUuid == clientUuid);
      if (index != -1) {
        final old = _webIncidents[index];
        _webIncidents[index] = IncidentReport(
          clientUuid: old.clientUuid,
          pollingStationId: old.pollingStationId,
          category: old.category,
          description: old.description,
          occurredAt: old.occurredAt,
          synced: true,
        );
      }
      return;
    }
    await db.update(
      'incidents',
      {'synced': 1},
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<int> countPendingSync() async {
    if (kIsWeb) {
      return _webStationReports.where((r) => !r.synced).length +
          _webIncidents.where((i) => !i.synced).length;
    }
    final reports = await db.query('station_reports', where: 'synced = 0');
    final incidents = await db.query('incidents', where: 'synced = 0');
    return reports.length + incidents.length;
  }
}
