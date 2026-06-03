# Smart Energy Meter Dashboard - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd /home/nujoka/Documents/Project-Store/500l_projects/Emmanue_judge&Khadijah/Smart_AI_Based_Energy-Meter
npm install
```

### 2. Configure Firebase
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 3. Start Development Server
```bash
npm start
```

The dashboard will open at `http://localhost:3000`

## Application Structure

### Pages

1. **Dashboard** (/)
   - Real-time sensor metrics display
   - Live voltage, current, power, energy readings
   - Power factor and frequency display
   - Alert indicators for anomalies
   - AI predictions panel

2. **Analytics** (/analytics)
   - 24-hour, 7-day, 30-day trend charts
   - Power consumption trends
   - Voltage and current analysis
   - Statistics and summary calculations

3. **Control Panel** (/control)
   - Zone-based relay management
   - Manual override controls
   - System summary statistics
   - Real-time status indicators

4. **Events & Logs** (/events)
   - Event history filtering
   - Severity-based organization
   - Event type categorization
   - Statistics and analytics

5. **Settings** (/settings)
   - Display preferences
   - Alert configuration
   - Data retention settings
   - Notification preferences

6. **About** (/about)
   - System documentation
   - Technology stack details
   - Feature overview
   - Support and contact information

## Features Implemented

Real-Time Monitoring:
- Live sensor data with <500ms latency
- Connection status indicators
- Anomaly detection and alerts
- Classification labels

Analytics:
- Multi-range trend analysis
- Power consumption statistics
- Historical data tracking
- Predictive insights

Zone Control:
- 4-zone relay management
- Manual override capability
- Status indicators
- Summary statistics

Event Management:
- Comprehensive event logging
- Severity filtering
- Event statistics
- Categorized tracking

Configuration:
- Alert thresholds
- Data retention policies
- Notification preferences
- Display settings

## Firebase Integration

The application uses Firebase Realtime Database for:
- Live sensor data streaming
- AI output and predictions
- Historical data storage
- Relay control commands
- System events and logs

## Development Tips

1. **Hot Reload**: Changes automatically reload in development
2. **Browser DevTools**: Use React DevTools extension for debugging
3. **Console Logs**: Check browser console for connection and data issues
4. **Firebase Console**: Monitor data in real-time via Firebase UI

## Production Build

```bash
npm run build
```

Creates an optimized production build in the `build/` directory.

## Deployment Options

- Firebase Hosting: `firebase deploy`
- Vercel: `vercel --prod`
- Netlify: `netlify deploy --prod`
- Docker: Build and run in containerized environment

## Troubleshooting

### Dashboard not connecting
- Verify Firebase credentials in .env
- Check network connectivity
- Review Firebase Security Rules
- Check browser console for errors

### Data not displaying
- Ensure smart meter is sending data
- Verify Firebase database paths match code
- Check data retention settings
- Review timestamp formats

### Slow performance
- Reduce data refresh rate in settings
- Limit historical data displayed
- Clear browser cache
- Check network latency

## Support

For questions or issues, refer to:
- README.md for comprehensive documentation
- Firebase console for data debugging
- Browser DevTools for JavaScript errors
- Console logs for connection diagnostics

## Next Steps

1. Configure your smart meter hardware to send data to Firebase
2. Test real-time data streaming
3. Adjust alert thresholds based on your system
4. Customize zone names and colors
5. Deploy to production platform

Enjoy your Smart Energy Monitoring Dashboard!
