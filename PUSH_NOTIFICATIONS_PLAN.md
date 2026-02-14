# Push Notifications Implementation Plan

## What You Asked For

Push notifications for reminders and events:
- ✅ Notify 10 minutes before reminder/event
- ✅ Only for YOUR OWN reminders/events
- ✅ Works on phone even when app is closed
- ✅ No notifications for other app activities

## What It Entails

### 1. Choose Push Service (Recommended: Firebase FCM)

**Why Firebase FCM:**
- ✅ Completely FREE (unlimited notifications)
- ✅ Works on Android (Chrome, Edge, Samsung Internet)
- ✅ Works on desktop (Chrome, Edge, Firefox)
- ⚠️ Limited on iOS (only when app is open in Safari)
- ✅ Easy to set up
- ✅ Reliable delivery
- ✅ Google-backed infrastructure

**Setup Steps:**
1. Create Firebase project (5 minutes)
2. Get Firebase config keys
3. Add Firebase SDK to app
4. Generate VAPID keys for web push

### 2. Database Changes

**New Table: `push_subscriptions`**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,  -- Push subscription object
  device_info TEXT,                   -- Browser/device info
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subscription_data->>'endpoint')
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_enabled ON push_subscriptions(enabled);
```

### 3. Backend API Endpoints

**New Endpoints Needed:**

1. **`POST /api/push/subscribe`**
   - Save user's push subscription
   - Store device info
   - Return success/failure

2. **`POST /api/push/unsubscribe`**
   - Remove user's push subscription
   - Clean up database

3. **`GET /api/push/status`**
   - Check if user has notifications enabled
   - Return subscription status

4. **`POST /api/push/test`**
   - Send test notification
   - For debugging

### 4. Notification Scheduler (Cron Job)

**File: `lib/notifications/scheduler.ts`**

```typescript
// Runs every minute
// Checks for reminders/events in next 10 minutes
// Sends notifications to subscribed users

async function checkUpcomingReminders() {
  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  
  // Find reminders due in 10 minutes
  const upcomingReminders = await db.query(`
    SELECT r.*, u.id as user_id, ps.subscription_data
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    JOIN push_subscriptions ps ON u.id = ps.user_id
    WHERE r.reminder_date = $1
      AND r.reminder_time BETWEEN $2 AND $3
      AND r.completed = false
      AND ps.enabled = true
      AND r.notification_sent = false
  `, [dateOnly, now, tenMinutesLater]);
  
  // Send notifications
  for (const reminder of upcomingReminders) {
    await sendPushNotification(reminder);
  }
}
```

**Cron Setup:**
- Add to `package.json`: `"cron": "node lib/notifications/cron.js"`
- Or use system cron: `* * * * * cd /app && node lib/notifications/cron.js`
- Or use Node-cron library for in-app scheduling

### 5. Frontend Changes

**New Component: `components/ui/NotificationSettings.tsx`**
- Toggle to enable/disable notifications
- Request permission button
- Show subscription status
- Test notification button

**Update Service Worker: `public/sw.js`**
```javascript
// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      reminderId: data.reminderId
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

**Update Layout: Add notification permission request**
```typescript
// In app/layout.tsx or a settings page
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Subscribe to push notifications
      await subscribeToPush();
    }
  }
};
```

### 6. Notification Content

**For Reminders:**
```
Title: "Reminder: [Reminder Title]"
Body: "[Lead Name] - [Reminder Type] in 10 minutes"
Icon: App icon
Actions: [View, Dismiss]
URL: /leads?reminder=[id]
```

**For Events:**
```
Title: "Event: [Event Title]"
Body: "[Event Description] starts in 10 minutes"
Icon: App icon
Actions: [View, Dismiss]
URL: /leads/reminders?event=[id]
```

### 7. Database Schema Updates

**Add to `reminders` table:**
```sql
ALTER TABLE reminders 
ADD COLUMN notification_sent BOOLEAN DEFAULT false,
ADD COLUMN notification_sent_at TIMESTAMP;
```

**Add to `calendar_events` table:**
```sql
ALTER TABLE calendar_events 
ADD COLUMN notification_sent BOOLEAN DEFAULT false,
ADD COLUMN notification_sent_at TIMESTAMP;
```

## Implementation Steps

### Phase 1: Setup (2 hours)
1. Create Firebase project
2. Add Firebase config to app
3. Create database table
4. Set up VAPID keys

### Phase 2: Backend (3 hours)
1. Create push subscription API endpoints
2. Implement notification sending logic
3. Create scheduler/cron job
4. Test notification delivery

### Phase 3: Frontend (3 hours)
1. Update service worker
2. Create notification settings UI
3. Add permission request flow
4. Handle notification clicks

### Phase 4: Testing (2 hours)
1. Test on Android Chrome
2. Test on desktop Chrome
3. Test notification timing
4. Test with multiple users

**Total Time: 10 hours**

## Platform Support

| Platform | Browser | Support | Notes |
|----------|---------|---------|-------|
| Android | Chrome | ✅ Full | Works perfectly, even when app closed |
| Android | Firefox | ✅ Full | Works perfectly |
| Android | Samsung Internet | ✅ Full | Works perfectly |
| Desktop | Chrome | ✅ Full | Works perfectly |
| Desktop | Edge | ✅ Full | Works perfectly |
| Desktop | Firefox | ✅ Full | Works perfectly |
| iOS | Safari | ⚠️ Limited | Only works when app is open |
| iOS | Chrome | ❌ No | Uses Safari engine, same limitations |

**iOS Limitation:**
- iOS Safari doesn't support background push notifications for PWAs
- Notifications only work when app is open
- This is an Apple restriction, not a technical limitation
- Expected to improve in future iOS versions

## Cost

- **Firebase FCM**: FREE (unlimited)
- **Server Resources**: Minimal (cron job runs every minute)
- **Database Storage**: ~1KB per user subscription
- **Total Monthly Cost**: $0

## Security

- ✅ Subscriptions tied to user accounts
- ✅ Only user's own reminders/events
- ✅ HTTPS required (already have)
- ✅ VAPID keys for authentication
- ✅ User can unsubscribe anytime

## User Experience

1. **First Time:**
   - User visits app
   - Sees "Enable Notifications" prompt
   - Clicks "Allow"
   - Browser asks for permission
   - User grants permission
   - Subscribed!

2. **Daily Use:**
   - User creates reminder for 2:00 PM
   - At 1:50 PM, notification appears
   - User clicks notification
   - App opens to that reminder
   - Perfect!

3. **Managing:**
   - User can disable in app settings
   - User can disable in browser settings
   - User can test notifications
   - User can see subscription status

## Alternative: Simpler Approach

If Firebase seems too complex, here's a simpler option:

**Use Web Push Protocol Directly:**
- No external service needed
- Use `web-push` npm library
- Generate your own VAPID keys
- Send notifications from your server
- Same functionality, more control
- Slightly more complex setup

## Recommendation

**Go with Firebase FCM** because:
1. It's free
2. It's reliable
3. It's well-documented
4. It handles edge cases
5. It scales automatically
6. It's easier to debug

## Next Steps

If you want this implemented:
1. I'll create Firebase project setup guide
2. I'll implement all backend code
3. I'll create frontend UI
4. I'll set up the cron job
5. I'll test everything
6. You'll have working push notifications!

**Estimated delivery: 1-2 days of work**

Let me know if you want to proceed!
