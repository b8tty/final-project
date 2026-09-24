import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';

// Lets a presiding officer scan a printed QR code at their polling station
// to confirm (or correct) which station their reports get attributed to,
// instead of relying only on whatever was set at login.
class QrCheckInScreen extends StatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  State<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends State<QrCheckInScreen> {
  bool _processing = false;
  String? _error;
  String? _confirmedStationName;

  Future<void> _handleDetection(BarcodeCapture capture) async {
    if (_processing || _confirmedStationName != null) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final code = barcodes.first.rawValue;
    if (code == null || code.trim().isEmpty) return;

    setState(() {
      _processing = true;
      _error = null;
    });

    try {
      // The QR code is expected to contain the station's code, e.g. "PS001"
      final results = await ApiService.instance.searchStations(code.trim());

      if (results.isEmpty) {
        setState(() => _error = 'No polling station found for this QR code.');
        return;
      }

      final station = results.first;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('polling_station_id', station['id']);

      setState(() => _confirmedStationName = station['name']);
    } catch (e) {
      setState(() => _error = 'Could not verify this station. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Confirm My Station')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Scan the QR code posted at your polling station to confirm your reports are attributed correctly.',
              style: TextStyle(fontSize: 13.5, color: AppColors.muted),
            ),
          ),
          Expanded(
            child: _confirmedStationName != null
                ? _buildSuccess()
                : Stack(
                    children: [
                      MobileScanner(onDetect: _handleDetection),
                      if (_processing)
                        Container(
                          color: Colors.black45,
                          child: const Center(
                            child: CircularProgressIndicator(color: Colors.white),
                          ),
                        ),
                    ],
                  ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(_error!, style: const TextStyle(color: Color(0xFFB3261E)), textAlign: TextAlign.center),
            ),
        ],
      ),
    );
  }

  Widget _buildSuccess() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 64,
              width: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 32, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              'Confirmed: $_confirmedStationName',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }
}
