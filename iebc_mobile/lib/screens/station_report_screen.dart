import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/report_models.dart';
import '../services/db_service.dart';
import '../services/sync_service.dart';

class StationReportScreen extends StatefulWidget {
  const StationReportScreen({super.key});

  @override
  State<StationReportScreen> createState() => _StationReportScreenState();
}

class _StationReportScreenState extends State<StationReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _queueController = TextEditingController();
  final _notesController = TextEditingController();
  String _kiemsStatus = 'working';
  String _materialsStatus = 'sufficient';
  bool _saving = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final prefs = await SharedPreferences.getInstance();
    final stationId = prefs.getInt('polling_station_id');

    if (stationId == null) {
      setState(() => _saving = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No polling station assigned to this account')),
      );
      return;
    }

    final report = StationReport(
      clientUuid: const Uuid().v4(),
      pollingStationId: stationId,
      queueLength: int.tryParse(_queueController.text),
      kiemsStatus: _kiemsStatus,
      materialsStatus: _materialsStatus,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      submittedAt: DateTime.now(),
    );

    // Save locally first — this succeeds even with zero connectivity
    await DBService.instance.saveStationReport(report);

    // Try to sync immediately in the background (won't block the UI/navigation)
    SyncService.instance.syncNow();

    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Report saved. It will sync automatically.')),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Station Status Report')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _queueController,
              decoration: const InputDecoration(
                labelText: 'Queue length (number of voters)',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _kiemsStatus,
              decoration: const InputDecoration(labelText: 'KIEMS device status', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'working', child: Text('Working')),
                DropdownMenuItem(value: 'faulty', child: Text('Faulty')),
                DropdownMenuItem(value: 'offline', child: Text('Offline')),
              ],
              onChanged: (v) => setState(() => _kiemsStatus = v!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _materialsStatus,
              decoration: const InputDecoration(labelText: 'Materials status', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'sufficient', child: Text('Sufficient')),
                DropdownMenuItem(value: 'shortage', child: Text('Shortage')),
              ],
              onChanged: (v) => setState(() => _materialsStatus = v!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Submit Report'),
            ),
          ],
        ),
      ),
    );
  }
}
