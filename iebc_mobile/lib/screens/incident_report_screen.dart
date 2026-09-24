import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/report_models.dart';
import '../services/db_service.dart';
import '../services/sync_service.dart';

class IncidentReportScreen extends StatefulWidget {
  const IncidentReportScreen({super.key});

  @override
  State<IncidentReportScreen> createState() => _IncidentReportScreenState();
}

class _IncidentReportScreenState extends State<IncidentReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  String _category = 'device_failure';
  bool _saving = false;

  static const _categories = {
    'device_failure': 'Device Failure',
    'material_shortage': 'Material Shortage',
    'security_incident': 'Security Incident',
    'queue_delay': 'Queue Delay',
    'other': 'Other',
  };

  // Common issues seen at polling stations, grouped by category — lets an
  // officer pick a close match fast instead of typing from scratch, while
  // still allowing any custom text to be typed and submitted freely.
  static const _commonIssues = {
    'device_failure': [
      'KIEMS kit not powering on',
      'Biometric scanner not reading fingerprints',
      'Device battery drained, no backup power',
      'Device screen frozen / unresponsive',
      'KIEMS kit lost network connectivity',
    ],
    'material_shortage': [
      'Ballot papers running low',
      'Indelible ink shortage',
      'Voter register printouts missing',
      'Ballot boxes not delivered',
      'Ballot seals or tamper tags missing',
    ],
    'security_incident': [
      'Unauthorized person attempting to access station',
      'Altercation between party agents',
      'Suspicious individual loitering near station',
      'Suspected ballot box tampering',
      'Crowd unrest near polling station',
    ],
    'queue_delay': [
      'Queue moving slowly due to device issues',
      'Long queue caused by late station opening',
      'Congestion at station entrance',
      'Queue delayed by insufficient polling booths',
    ],
    'other': [
      'Missing or absent polling staff',
      'Poor lighting or ventilation at station',
      'Accessibility issue for elderly or disabled voters',
    ],
  };

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

    final incident = IncidentReport(
      clientUuid: const Uuid().v4(),
      pollingStationId: stationId,
      category: _category,
      description: _descriptionController.text.trim(),
      occurredAt: DateTime.now(),
    );

    await DBService.instance.saveIncident(incident);
    SyncService.instance.syncNow();

    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Incident saved. It will sync automatically.')),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report an Incident')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
              items: _categories.entries
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (v) => setState(() => _category = v!),
            ),
            const SizedBox(height: 16),
            Autocomplete<String>(
              optionsBuilder: (TextEditingValue value) {
                final options = _commonIssues[_category] ?? const [];
                if (value.text.isEmpty) return options;
                return options.where(
                  (o) => o.toLowerCase().contains(value.text.toLowerCase()),
                );
              },
              onSelected: (selection) => _descriptionController.text = selection,
              fieldViewBuilder: (context, controller, focusNode, onSubmitted) {
                // Keep the visible field's text in sync with our own controller,
                // so free-typed text is captured even if nothing is selected.
                controller.text = _descriptionController.text;
                controller.addListener(() => _descriptionController.text = controller.text);
                return TextFormField(
                  controller: controller,
                  focusNode: focusNode,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Start typing to see common issues, or write your own',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 4,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                );
              },
              optionsViewBuilder: (context, onSelected, options) {
                return Align(
                  alignment: Alignment.topLeft,
                  child: Material(
                    elevation: 3,
                    borderRadius: BorderRadius.circular(10),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 220, maxWidth: 400),
                      child: ListView.separated(
                        padding: EdgeInsets.zero,
                        shrinkWrap: true,
                        itemCount: options.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final option = options.elementAt(index);
                          return ListTile(
                            dense: true,
                            title: Text(option, style: const TextStyle(fontSize: 13.5)),
                            onTap: () => onSelected(option),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Submit Incident'),
            ),
          ],
        ),
      ),
    );
  }
}
