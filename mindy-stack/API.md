# 🔌 API Reference — CallBot Tom

## Base URL
```
https://api.ottomat.ai/callbot-tom/v1
```

## Authentication
All requests require an API key in the header:
```
Authorization: Bearer YOUR_VAPI_API_KEY
```

## REST Endpoints

### 1. Initiate Call
**POST** `/calls/initiate`

**Request:**
```json
{
  "phoneNumber": "+33612345678",
  "patientName": "Jean Dupont",
  "services": ["Consultation", "Détartrage"],
  "urgencyLevel": "normal",
  "metadata": {
    "source": "website",
    "clinicId": "clinic-001"
  }
}
```

**Response:**
```json
{
  "callId": "call_abc123xyz",
  "status": "initiated",
  "timestamp": "2026-04-15T14:20:00Z",
  "expiresAt": "2026-04-15T14:35:00Z"
}
```

### 2. Get Call Status
**GET** `/calls/{callId}`

**Response:**
```json
{
  "callId": "call_abc123xyz",
  "status": "in_progress",
  "duration": 245,
  "phase": "collect",
  "collectedData": {
    "firstName": "Jean",
    "lastName": "Dupont",
    "phoneNumber": "+33612345678",
    "selectedService": "Consultation",
    "appointmentDate": "2026-04-17",
    "appointmentTime": "14:30"
  }
}
```

### 3. End Call
**POST** `/calls/{callId}/end`

**Response:**
```json
{
  "callId": "call_abc123xyz",
  "status": "completed",
  "duration": 450,
  "recordingUrl": "https://storage.ottomat.ai/calls/call_abc123xyz.wav",
  "transcript": "..."
}
```

### 4. Get Call Transcript
**GET** `/calls/{callId}/transcript`

**Response:**
```json
{
  "callId": "call_abc123xyz",
  "transcript": [
    {"speaker": "tom", "text": "Bonjour, bienvenue chez..."},
    {"speaker": "patient", "text": "Oui, bonjour..."}
  ],
  "format": "json"
}
```

### 5. Create Appointment
**POST** `/appointments`

**Request:**
```json
{
  "patientName": "Jean Dupont",
  "phoneNumber": "+33612345678",
  "email": "jean@example.com",
  "service": "Consultation",
  "appointmentDate": "2026-04-17",
  "appointmentTime": "14:30",
  "notes": "Premier rendez-vous"
}
```

**Response:**
```json
{
  "appointmentId": "apt_xyz789abc",
  "status": "confirmed",
  "confirmationCode": "DENT-001-2026-04-17",
  "reminderSent": true
}
```

### 6. List Appointments
**GET** `/appointments?date=2026-04-17&status=confirmed`

**Response:**
```json
{
  "total": 24,
  "appointments": [
    {
      "appointmentId": "apt_xyz789abc",
      "patientName": "Jean Dupont",
      "service": "Consultation",
      "dateTime": "2026-04-17T14:30:00Z",
      "status": "confirmed"
    }
  ]
}
```

## Webhook Events

### Call Completed
```json
{
  "event": "call.completed",
  "timestamp": "2026-04-15T14:25:00Z",
  "data": {
    "callId": "call_abc123xyz",
    "duration": 450,
    "collectedData": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "phoneNumber": "+33612345678",
      "selectedService": "Consultation",
      "appointmentDate": "2026-04-17",
      "appointmentTime": "14:30"
    }
  }
}
```

### Emergency Detected
```json
{
  "event": "emergency.detected",
  "timestamp": "2026-04-15T14:20:00Z",
  "data": {
    "callId": "call_abc123xyz",
    "emergencyType": "severe_pain",
    "description": "Douleur extrême à la mâchoire",
    "action": "transferred_to_samu"
  }
}
```

### Appointment Booked
```json
{
  "event": "appointment.booked",
  "timestamp": "2026-04-15T14:25:00Z",
  "data": {
    "appointmentId": "apt_xyz789abc",
    "patientName": "Jean Dupont",
    "appointmentDate": "2026-04-17",
    "appointmentTime": "14:30"
  }
}
```

## Error Handling

### Common Errors
```json
{
  "error": "invalid_phone_number",
  "message": "Phone number format is invalid",
  "code": 400,
  "details": {
    "provided": "+33 612 345 678",
    "expected": "+336XXXXXXXX"
  }
}
```

### Rate Limiting
- **Limit**: 100 requests per minute
- **Header**: `X-RateLimit-Remaining: 42`
- **Retry-After**: Provided in response headers

## Client Examples

### JavaScript
```javascript
const callbot = new CallBotTomAPI({
  apiKey: 'your-api-key'
});

// Initiate call
const call = await callbot.calls.initiate({
  phoneNumber: '+33612345678',
  patientName: 'Jean Dupont',
  services: ['Consultation']
});

// Check status
const status = await callbot.calls.getStatus(call.callId);

// Create appointment
const apt = await callbot.appointments.create({
  patientName: 'Jean Dupont',
  phoneNumber: '+33612345678',
  service: 'Consultation',
  appointmentDate: '2026-04-17',
  appointmentTime: '14:30'
});
```

### Python
```python
from callbot_tom import CallBotTomAPI

client = CallBotTomAPI(api_key='your-api-key')

# Initiate call
call = client.calls.initiate(
    phone_number='+33612345678',
    patient_name='Jean Dupont',
    services=['Consultation']
)

# Get status
status = client.calls.get_status(call['callId'])

# Create appointment
apt = client.appointments.create(
    patient_name='Jean Dupont',
    phone_number='+33612345678',
    service='Consultation',
    appointment_date='2026-04-17',
    appointment_time='14:30'
)
```
