# Smart Energy Monitoring Dashboard

A real-time, AI-powered smart energy monitoring dashboard for residential and institutional energy management. Built with React, Firebase, and advanced analytics.

## Features

- **Real-Time Monitoring**: Sub-500ms latency sensor data streaming
  - Voltage, Current, Power, Energy, Power Factor, Frequency
  - Live classification labels with color coding
  - Connection status and anomaly alerts

- **Advanced Analytics**
  - 24-hour, 7-day, 30-day trend charts
  - Power consumption patterns and statistics
  - AI-powered predictions and burn rate calculations

- **Zone Control**
  - Multi-zone relay management (4 zones)
  - Manual override capability
  - Real-time status indicators

- **Events & Logging**
  - Comprehensive event history
  - Severity-based filtering and categorization
  - Relay trip detection and manual command logging

- **Configurable Settings**
  - Power alert thresholds
  - Display preferences
  - Data retention and backup options
  - Notification preferences

## Technology Stack

- **Frontend**: React 18, React Router v6
- **Database**: Firebase Realtime Database
- **Visualization**: Recharts, Tailwind CSS
- **Icons**: Lucide React
- **Build**: React Scripts

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Smart_AI_Based_Energy-Meter
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Copy `.env.example` to `.env`
   - Update with your Firebase credentials:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm start
```

5. Build for production:
```bash
npm run build
```

## Firebase Database Structure

```
/live
  - ts: number
  - v: number
  - i: number
  - w: number
  - kwh: number
  - pf: number
  - hz: number
  - label: string
  - color: string
  - anomaly: boolean
  - anomaly_z: number
  - z1: boolean
  - z2: boolean
  - z3: boolean
  - z4: boolean

/ai_output
  - burn_rate_wph: number
  - depletion_hours: number
  - anomaly_score: number
  - prediction_1h: number
  - prediction_6h: number
  - baseline_mean: number
  - classification: string|object
  - advice: string

/history
  - ts: timestamp
  - v: number
  - i: number
  - w: number
  - kwh: number
  - pf: number
  - hz: number
  - label: string
  - anomaly: boolean

/events
  - ts: timestamp
  - zone: number
  - name: string
  - event: string
  - watts: number

/relay_commands
  - z1: boolean
  - z2: boolean
  - z3: boolean
  - z4: boolean
```

## Project Structure

```
src/
├── pages/
│   ├── Dashboard.jsx      # Main monitoring dashboard
│   ├── Analytics.jsx      # Trend analysis and charts
│   ├── ControlPanel.jsx   # Zone relay control
│   ├── EventsLog.jsx      # Event history and logging
│   ├── Settings.jsx       # Configuration options
│   └── About.jsx          # System information
├── components/            # Reusable components
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
├── App.js                 # Main application component
├── firebase-config.js     # Firebase configuration
├── index.js              # React entry point
└── index.css             # Global styles
```

## Key Components

### Dashboard Page
Real-time display of electrical metrics with live status indicators and AI predictions.

### Analytics Page
Historical trend visualization with customizable time ranges (24h, 7d, 30d).

### Control Panel
Manual zone control with override capabilities and current status monitoring.

### Events Log
Comprehensive event history with filtering by type and severity.

### Settings Page
Configuration for alerts, data retention, notifications, and display preferences.

## Firebase Security Rules

```json
{
  "rules": {
    "live": {
      ".read": true,
      ".write": false
    },
    "ai_output": {
      ".read": true,
      ".write": false
    },
    "history": {
      ".read": true,
      ".write": false
    },
    "relays": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Customization

### Adding Alert Thresholds
Modify `src/pages/Dashboard.jsx` to adjust warning limits for power consumption.

### Changing Alert Colors
Update Tailwind color classes in component files to match your branding.

### Adding New Zones
Edit the `zones` state in `src/pages/ControlPanel.jsx` to add more relay zones.

## Performance Considerations

- Dashboard updates at configurable intervals (default: 2 seconds)
- Data points are limited to improve chart rendering performance
- Firebase queries use `limitToLast()` for efficient data retrieval
- Memoization techniques for expensive calculations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Deployment

### Deploy to Firebase Hosting
```bash
npm run build
firebase deploy
```

### Deploy to Other Platforms
- Vercel: `npm install -g vercel && vercel`
- Netlify: `npm install -g netlify-cli && netlify deploy`
- Docker: Create a Dockerfile with Node.js base image

## Troubleshooting

### Firebase Connection Issues
- Verify credentials in `.env` file
- Check Firebase Security Rules
- Ensure database URL is correct

### Slow Performance
- Reduce data retention period
- Increase refresh rate interval
- Clear browser cache

### Missing Data
- Verify smart meter is sending data
- Check Firebase database rules
- Verify network connectivity

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For support, email support@smartenergy.local or open an issue on GitHub.

## Acknowledgments

- Built with React and Firebase
- Charts powered by Recharts
- Icons from Lucide React
- Styling with Tailwind CSS
