import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/report_models.dart';

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  // IMPORTANT: adjust this depending on where you're running the app:
  // - Web (Chrome/Edge) or Windows desktop: use localhost, since there's no
  //   emulator translation layer — the browser/app talks directly to your PC.
  // - Android emulator: use 10.0.2.2 (its special address for your PC's localhost).
  // - Physical phone on the same WiFi: use your machine's LAN IP, e.g. 192.168.1.50.
  // - Deployed backend: use its real domain, e.g. https://api.iebc-project.com
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    return 'http://10.0.2.2:5000/api';
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<Map<String, String>> _headers() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Returns true on success, throws on network/auth error
  Future<Map<String, dynamic>> login(String nationalId, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'national_id': nationalId, 'password': password}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(data['error'] ?? 'Login failed');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', data['token']);
    await prefs.setInt('user_id', data['user']['id']);
    await prefs.setString('role', data['user']['role']);
    if (data['user']['polling_station_id'] != null) {
      await prefs.setInt('polling_station_id', data['user']['polling_station_id']);
    }

    return data;
  }

  Future<List<dynamic>> searchStations(String query) async {
    final response = await http.get(
      Uri.parse('$baseUrl/stations?search=$query'),
      headers: await _headers(),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to load polling stations');
    }
    return jsonDecode(response.body);
  }

  // Returns the incidents reported for a given station, so an officer can
  // check what's already been logged and what HQ has done with it.
  Future<List<dynamic>> myStationIncidents(int pollingStationId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/reports/incidents?polling_station_id=$pollingStationId'),
      headers: await _headers(),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to load your reports');
    }
    return jsonDecode(response.body);
  }

  // Returns true if this report was newly synced (false if server already had it)
  Future<bool> submitStationReport(StationReport report) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reports/station'),
      headers: await _headers(),
      body: jsonEncode(report.toApiPayload()),
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to sync station report');
    }
    return true;
  }

  Future<bool> submitIncident(IncidentReport incident) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reports/incident'),
      headers: await _headers(),
      body: jsonEncode(incident.toApiPayload()),
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to sync incident report');
    }
    return true;
  }
}
