class StationReport {
  final String clientUuid;
  final int pollingStationId;
  final int? queueLength;
  final String? kiemsStatus;
  final String? materialsStatus;
  final DateTime? openingTime;
  final DateTime? closingTime;
  final String? notes;
  final DateTime submittedAt;
  final bool synced;

  StationReport({
    required this.clientUuid,
    required this.pollingStationId,
    this.queueLength,
    this.kiemsStatus,
    this.materialsStatus,
    this.openingTime,
    this.closingTime,
    this.notes,
    required this.submittedAt,
    this.synced = false,
  });

  Map<String, dynamic> toMap() => {
        'client_uuid': clientUuid,
        'polling_station_id': pollingStationId,
        'queue_length': queueLength,
        'kiems_status': kiemsStatus,
        'materials_status': materialsStatus,
        'opening_time': openingTime?.toIso8601String(),
        'closing_time': closingTime?.toIso8601String(),
        'notes': notes,
        'submitted_at': submittedAt.toIso8601String(),
        'synced': synced ? 1 : 0,
      };

  factory StationReport.fromMap(Map<String, dynamic> map) => StationReport(
        clientUuid: map['client_uuid'],
        pollingStationId: map['polling_station_id'],
        queueLength: map['queue_length'],
        kiemsStatus: map['kiems_status'],
        materialsStatus: map['materials_status'],
        openingTime: map['opening_time'] != null ? DateTime.parse(map['opening_time']) : null,
        closingTime: map['closing_time'] != null ? DateTime.parse(map['closing_time']) : null,
        notes: map['notes'],
        submittedAt: DateTime.parse(map['submitted_at']),
        synced: map['synced'] == 1,
      );

  // Payload sent to the backend API (excludes local-only 'synced' flag)
  Map<String, dynamic> toApiPayload() => {
        'polling_station_id': pollingStationId,
        'queue_length': queueLength,
        'kiems_status': kiemsStatus,
        'materials_status': materialsStatus,
        'opening_time': openingTime?.toIso8601String(),
        'closing_time': closingTime?.toIso8601String(),
        'notes': notes,
        'client_uuid': clientUuid,
        'submitted_at': submittedAt.toIso8601String(),
      };
}

class IncidentReport {
  final String clientUuid;
  final int pollingStationId;
  final String category; // device_failure, material_shortage, security_incident, queue_delay, other
  final String description;
  final DateTime occurredAt;
  final bool synced;

  IncidentReport({
    required this.clientUuid,
    required this.pollingStationId,
    required this.category,
    required this.description,
    required this.occurredAt,
    this.synced = false,
  });

  Map<String, dynamic> toMap() => {
        'client_uuid': clientUuid,
        'polling_station_id': pollingStationId,
        'category': category,
        'description': description,
        'occurred_at': occurredAt.toIso8601String(),
        'synced': synced ? 1 : 0,
      };

  factory IncidentReport.fromMap(Map<String, dynamic> map) => IncidentReport(
        clientUuid: map['client_uuid'],
        pollingStationId: map['polling_station_id'],
        category: map['category'],
        description: map['description'],
        occurredAt: DateTime.parse(map['occurred_at']),
        synced: map['synced'] == 1,
      );

  Map<String, dynamic> toApiPayload() => {
        'polling_station_id': pollingStationId,
        'category': category,
        'description': description,
        'client_uuid': clientUuid,
        'occurred_at': occurredAt.toIso8601String(),
      };
}
