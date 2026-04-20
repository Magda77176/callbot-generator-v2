# 🔗 Integration Guide — CallBot Tom

## WordPress Plugin Installation

### Step 1: Download & Upload
1. Download the CallBot Tom WordPress plugin from GitHub
2. Navigate to your WordPress admin: `yoursite.com/wp-admin`
3. Go to **Plugins → Add New → Upload Plugin**
4. Select the plugin ZIP file
5. Click **Install Now**
6. Click **Activate Plugin**

### Step 2: Configuration
1. Go to **Settings → CallBot Tom**
2. Enter your Vapi API key
3. Enter your OpenAI API key
4. Configure webhook URL (auto-populated)
5. Select your dental services and pricing
6. Click **Save Settings**

### Step 3: Add to Pages
1. Edit any page in WordPress
2. Click **Add Block → CallBot Tom Widget**
3. Configure:
   - Button text (default: "Appeler Tom")
   - Button color
   - Position (bottom-right/bottom-left)
4. Publish

### Step 4: Test Integration
1. Save the page
2. Visit the page frontend
3. Click the "Appeler Tom" button
4. Verify:
   - Call initiates
   - Audio works
   - Responses appear in real-time

### Step 5: Configure Webhooks
1. Go to **Settings → CallBot Tom → Webhooks**
2. Verify endpoint: `yourdomain.com/wp-json/callbot-tom/v1/webhook`
3. Configure events to log:
   - Call started
   - Info collected
   - Appointment booked
4. Save

### Step 6: Set Up Appointment Sync
1. Go to **Settings → CallBot Tom → Appointments**
2. Choose calendar integration:
   - Google Calendar
   - Outlook Calendar
   - Your CRM system
3. Authenticate and authorize
4. Map fields (Patient Name → Contact Name, etc.)

### Step 7: Go Live
1. Test with multiple scenarios
2. Monitor logs in **Settings → CallBot Tom → Logs**
3. Check webhook deliveries in **Webhooks** tab
4. Once confident, change status from "Test" to "Production"

## HTML/JavaScript Standalone Integration

### Quick Start
```html
<!-- Add to your HTML page -->
<script src="https://cdn.ottomat.ai/callbot-tom/latest/callbot-tom.js"></script>

<script>
  window.CallBotTom.init({
    apiKey: 'YOUR_VAPI_API_KEY',
    openaiKey: 'YOUR_OPENAI_API_KEY',
    webhookUrl: 'https://yourdomain.com/webhook/callbot-tom',
    services: [
      { name: 'Consultation', price: 50, duration: 30 },
      { name: 'Detartrage', price: 80, duration: 45 }
    ]
  });
</script>

<!-- Add button -->
<button id="callbot-tom-button">Appeler Tom</button>
```

### Advanced Configuration
```javascript
window.CallBotTom.init({
  apiKey: 'YOUR_VAPI_API_KEY',
  openaiKey: 'YOUR_OPENAI_API_KEY',
  webhookUrl: 'https://yourdomain.com/webhook/callbot-tom',
  
  // All 9 services
  services: [
    { name: 'Consultation générale', price: 50, duration: 30 },
    { name: 'Détartrage/Hygiène', price: 80, duration: 45 },
    { name: 'Traitement de carie', price: 120, duration: 60 },
    { name: 'Extraction dentaire', price: 150, duration: 45 },
    { name: 'Pose de couronne', price: 400, duration: 90 },
    { name: 'Implant dentaire', price: 800, duration: 120 },
    { name: 'Blanchiment dentaire', price: 200, duration: 60 },
    { name: 'Orthodontie (bilan)', price: 100, duration: 45 },
    { name: 'Urgence dentaire', price: 75, duration: 30 }
  ],
  
  // UI customization
  ui: {
    buttonText: 'Appeler Tom',
    buttonColor: '#2E7D32',
    position: 'bottom-right',
    theme: 'light' // or 'dark'
  },
  
  // Conversation settings
  language: 'fr-FR',
  maxCallDuration: 900, // 15 minutes
  enableLogging: true,
  
  // Callbacks
  onCallStart: () => console.log('Call started'),
  onInfoCollected: (data) => console.log('Data:', data),
  onCallEnd: () => console.log('Call ended'),
  onError: (error) => console.error('Error:', error)
});
```

## Testing & Validation Checklist

- [ ] **Audio Test**: Call initiates, microphone works
- [ ] **Conversation Flow**: 5-step workflow completes
- [ ] **Data Collection**: All fields captured (name, phone, service)
- [ ] **Emergency Triage**: Urgent cases detected
- [ ] **Service Proposal**: All 9 services offered correctly
- [ ] **Webhook Delivery**: Data sent to endpoint
- [ ] **Calendar Sync**: Appointment appears in calendar
- [ ] **Error Handling**: Network errors handled gracefully
- [ ] **Performance**: Response time < 2 seconds
- [ ] **Browser Compatibility**: Works on Chrome, Firefox, Safari, Edge

## Production Deployment Guide

### Pre-Deployment
1. ✅ All tests pass
2. ✅ Webhook endpoints verified
3. ✅ API keys secured (use environment variables)
4. ✅ SSL/TLS enabled
5. ✅ Rate limiting configured
6. ✅ Monitoring & alerts set up

### Deployment
```bash
# Option 1: Direct push to production
git push origin main

# Option 2: Via deployment platform (Vercel, Netlify)
npm run build
npm run deploy
```

### Post-Deployment
1. Monitor call logs in real-time
2. Check webhook delivery success rate
3. Verify appointment calendar sync
4. Monitor audio quality metrics
5. Set up alerting for failures

### Monitoring Endpoints
- **Logs**: `/admin/callbot-tom/logs`
- **Metrics**: `/admin/callbot-tom/metrics`
- **Webhook Status**: `/admin/callbot-tom/webhooks`
- **Error Tracking**: `/admin/callbot-tom/errors`
