# TattvaDrishti Multi-Page Application

## Overview
The application has been transformed into a comprehensive multi-page dashboard with drag-and-drop functionality for emails and social media posts.

## New Features

### 🎯 Multi-Page Architecture
The application now features a modern sidebar navigation with dedicated pages:

1. **Dashboard** (`/`) - Overview with quick stats, activity feed, and quick analysis form
2. **Upload Content** (`/upload`) - Drag-and-drop interface for bulk email/social post analysis
3. **Submissions** (`/submissions`) - Browse and filter all analyzed cases
4. **Analytics** (`/analytics`) - Interactive charts and trend visualizations
5. **Blockchain** (`/blockchain`) - Federated ledger visualization

### 📤 Drag & Drop Functionality
The `/upload` page features a sophisticated drag-and-drop zone that supports:
- **Email files** (.eml) - Automatically extracts headers and body
- **JSON social posts** - Parses structured social media data
- **Text/HTML files** - Plain text or formatted content
- **Batch processing** - Upload multiple files simultaneously
- **Real-time analysis** - Immediate threat scoring and classification

### 📊 Analytics Dashboard
Interactive visualizations including:
- Classification breakdown (pie chart)
- Submissions over time (line chart)
- Threat score distribution (bar chart)
- Platform sources analysis
- Geographic heat maps
- Time-range filters (24h, 7d, 30d, all time)

### 🔗 Blockchain Visualization
- Real-time federated ledger status
- Block chain visualization
- Node network health
- Consensus validation

## Page Structure

```
frontend/
├── app/
│   ├── page.js              # Dashboard (home)
│   ├── upload/
│   │   └── page.js          # Drag & drop upload
│   ├── submissions/
│   │   └── page.js          # Cases browser
│   ├── analytics/
│   │   └── page.js          # Charts & insights
│   ├── blockchain/
│   │   └── page.js          # Federated ledger
│   └── layout.js            # Root layout with sidebar
├── components/
│   ├── Sidebar.jsx          # Navigation sidebar
│   ├── DragDropZone.jsx     # Drag-drop component
│   └── ... (existing components)
```

## New Dependencies

- `react-dropzone` (^14.2.3) - Drag and drop file uploads
- `recharts` (^2.10.3) - Interactive charts and graphs

## Usage

### Starting the Development Server
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### Uploading Files via Drag & Drop

1. Navigate to `/upload` using the sidebar
2. Drag and drop supported files:
   - Email files (.eml)
   - Social media posts (.json)
   - Text files (.txt, .html)
3. Files are automatically parsed and analyzed
4. Results appear in real-time with classification and threat scores

### File Format Examples

#### Email (.eml)
```
From: sender@example.com
Subject: Suspicious message
Date: Thu, 26 Dec 2025 10:00:00 +0000

Message body content here...
```

#### Social Post (.json)
```json
{
  "text": "Post content here",
  "platform": "twitter",
  "author": "username",
  "location": "New York",
  "hashtags": ["tag1", "tag2"]
}
```

## Navigation

The sidebar provides:
- **Collapsed mode** - Click the collapse button for a minimal view
- **Mobile responsive** - Hamburger menu on mobile devices
- **Active indicators** - Current page highlighted
- **Quick access** - One-click navigation to all sections

## API Integration

All pages integrate with the backend API:
- `/api/v1/intake` - Submit new analysis
- `/api/v1/cases` - List all cases
- `/api/v1/cases/:id` - Get case details
- `/api/v1/federated/ledger` - Blockchain data
- Server-Sent Events for real-time updates

## Features by Page

### Dashboard
- Quick stats overview
- Live activity feed
- Inline submission form
- World heat map
- Quick action cards

### Upload
- Multi-file drag & drop
- Automatic content parsing
- Email header extraction
- JSON social post parsing
- Batch analysis results
- File type validation

### Submissions
- Searchable case list
- Filter by classification
- Real-time case updates
- Detailed case viewer
- Statistics dashboard

### Analytics
- Time-range filtering
- Interactive charts
- Trend analysis
- Platform breakdown
- Regional statistics
- Score distribution

### Blockchain
- Chain visualization
- Node status
- Block explorer
- Validation status
- Real-time updates

## Mobile Responsive

All pages are fully responsive with:
- Collapsible sidebar
- Touch-friendly controls
- Optimized layouts
- Smooth transitions

## Theming

The app features:
- Dark mode optimized
- Glassmorphism effects
- Gradient accents
- Smooth animations
- Modern UI components

## Next Steps

To further enhance the application:
1. Add file preview modal before submission
2. Implement bulk export functionality
3. Add advanced filtering options
4. Create custom dashboard layouts
5. Add notification system
6. Implement role-based access control
