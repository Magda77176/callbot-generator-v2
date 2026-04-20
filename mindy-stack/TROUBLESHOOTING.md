# 🔧 Troubleshooting Guide — CallBot Tom

## Startup & Initialization Issues

### Problem: "API Key Invalid"
**Cause**: Incorrect or expired API key

**Solution**:
1. Go to **Settings → CallBot Tom**
2. Verify your Vapi API key is correct
3. Check expiration date in Vapi dashboard
4. Generate new key if needed
5. Update and save

### Problem: "Failed to Initialize Voice Engine"
**Cause**: OpenAI API key missing or invalid

**Solution**:
1. Verify OpenAI API key in settings
2. Check that key has voice permissions
3. Ensure billing is active on OpenAI account
4. Restart the widget

### Problem: "Webhook URL Unreachable"
**Cause**: Webhook endpoint is not accessible

**Solution**:
1. Check domain DNS resolution
2. Verify SSL certificate is valid
3. Check firewall/WAF rules
4. Test endpoint: `curl https://yourdomain.com/webhook/callbot-tom`
5. Enable debug logging to see actual errors

## Call & Conversation Issues

### Problem: Call Doesn't Initiate
**Cause**: Multiple possible reasons

**Debug Steps**:
1. Check browser console for errors
2. Verify microphone permissions are granted
3. Test microphone in browser settings
4. Check internet connection speed
5. Enable debug mode: `window.CallBotTom.debug(true)`

### Problem: Tom Cuts Off Mid-Conversation
**Cause**: Session timeout or connection loss

**Solution**:
1. Increase session timeout in settings
2. Check `system-prompt.txt` for max_duration
3. Verify internet connection stability
4. Check logs for disconnection reason
5. Monitor WebSocket connection health

### Problem: Tom Doesn't Understand Questions
**Cause**: Language or acoustic model issue

**Solution**:
1. Verify language setting is `fr-FR`
2. Test with clearer audio
3. Reduce background noise
4. Check system prompt language parameters
5. Test with different phone/microphone

### Problem: Information Not Collected Properly
**Cause**: Conversation flow skipped steps

**Solution**:
1. Check `system-prompt.txt` 5-step workflow:
   - Accueil (Welcome)
   - Triage (Emergency check)
   - Besoin (Need assessment)
   - Collecte (Data collection)
   - Confirmation (Final confirmation)
2. Verify "JAMAIS SAUTER LES ETAPES" rule is enforced
3. Check logs for skipped phases
4. Review conversation transcript

## Appointment Scheduling Issues

### Problem: Appointment Date Shows in Past
**Cause**: Temporal validation not working

**Solution**:
1. Check server time synchronization
2. Verify timezone setting matches clinic
3. Check `system-prompt.txt` for date validation rules
4. Ensure database datetime is correct

### Problem: Appointment Doesn't Sync to Calendar
**Cause**: Calendar integration not configured

**Solution**:
1. Go to **Settings → CallBot Tom → Calendar**
2. Re-authenticate with Google Calendar/Outlook
3. Check that clinic calendar is selected
4. Verify webhook is delivering data
5. Check calendar permissions

### Problem: Double Bookings Occur
**Cause**: Concurrent appointment conflict

**Solution**:
1. Enable conflict detection in settings
2. Check appointment database for duplicates
3. Implement appointment locking mechanism
4. Review webhook retry logic
5. Monitor for race conditions

## Audio & Voice Quality

### Problem: Tom's Voice Is Robotic or Unnaturalecause**: Text-to-speech configuration issue

**Solution**:
1. Check OpenAI voice model setting
2. Verify audio quality setting (standard/high)
3. Test with different speaking rates
4. Review system prompt for voice parameters
5. Check speaker settings

### Problem: Microphone Not Detected
**Cause**: Browser permissions or hardware issue

**Solution**:
1. Check browser microphone permissions
2. Test microphone in browser settings
3. Try different browser/device
4. Check for hardware conflicts
5. Restart browser

### Problem: Echo or Feedback During Call
**Cause**: Audio feedback loop

**Solution**:
1. Use headphones instead of speakers
2. Reduce speaker volume
3. Move microphone away from speakers
4. Check audio processing settings
5. Disable automatic gain control if enabled

## Integration & CORS Errors

### Problem: "CORS Policy Blocked Request"
**Cause**: Cross-origin resource sharing not configured

**Solution**:
1. Add to server response headers:
   ```
   Access-Control-Allow-Origin: https://yourdomain.com
   Access-Control-Allow-Methods: POST, GET, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```
2. Enable CORS in CallBot settings
3. Whitelist domain in webhook configuration
4. Test with `curl -i -H "Origin: ..." endpoint`

### Problem: Webhook Delivery Failing
**Cause**: Authentication or endpoint error

**Solution**:
1. Check webhook URL is correct
2. Verify HTTP method is POST
3. Check authentication headers
4. Test endpoint with curl:
   ```bash
   curl -X POST https://yourdomain.com/webhook/callbot-tom \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
5. Check server logs for errors
6. Enable webhook retry in settings

### Problem: WordPress Plugin Not Activating
**Cause**: Plugin compatibility or PHP version

**Solution**:
1. Check WordPress version (required: 5.9+)
2. Verify PHP version (required: 7.4+)
3. Check plugin dependencies
4. Disable conflicting plugins one by one
5. Check error logs: `/wp-content/debug.log`

## Performance Monitoring

### Monitor Key Metrics
- **Response Time**: Target < 2s
- **Call Success Rate**: Target > 95%
- **Data Collection Rate**: Target > 90%
- **Appointment Booking Rate**: Target > 73%
- **System Uptime**: Target > 99.9%

### Check Performance Dashboard
1. Go to **Settings → CallBot Tom → Metrics**
2. Review last 7 days performance
3. Set up alerts for SLA violations
4. Monitor API response times
5. Track webhook delivery success

### Optimize Performance
```javascript
// Enable caching
window.CallBotTom.cache.enable();

// Lazy load widget
window.CallBotTom.lazyLoad({
  threshold: 0.5
});

// Optimize audio bitrate
window.CallBotTom.audio.setBitrate('128k');

// Enable compression
window.CallBotTom.network.compression(true);
```

## Debug Mode Instructions

### Enable Debug Logging
```javascript
// In browser console
window.CallBotTom.debug(true);

// View logs
window.CallBotTom.logs.view();

// Export logs
window.CallBotTom.logs.export();
```

### Check Logs in WordPress
1. Go to **Settings → CallBot Tom → Logs**
2. Filter by date range or error level
3. Search by call ID or phone number
4. Export for analysis

### Common Debug Checks
```bash
# Check API connectivity
curl -I https://api.ottomat.ai/health

# Verify webhook endpoint
curl -X POST yourdomain.com/webhook/callbot-tom \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check DNS resolution
nslookup yourdomain.com

# Test SSL certificate
openssl s_client -connect yourdomain.com:443
```

### Request Support
If issues persist:
1. Export logs from CallBot Dashboard
2. Provide callId and timestamp
3. Share browser console output
4. Contact: support@ottomat.ai
