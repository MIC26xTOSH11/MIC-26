# 🎯 Quick Start Guide - Multi-Page App

## Welcome to Your New Dashboard!

Your TattvaDrishti application is now a modern, multi-page web app with drag-and-drop functionality!

## 🚀 Start Using It Now

The development server is running at:
```
http://localhost:3000
```

## 📱 New Page Overview

### 1️⃣ **Dashboard** (Home - `/`)
**What you'll see:**
- 5 key metric cards at the top
- Quick action buttons to all features
- Inline submission form
- Live activity feed
- World heat map

**Perfect for:** Getting an overview of all activity

---

### 2️⃣ **Upload Content** (`/upload`)
**What you'll see:**
- Large drag-and-drop zone
- Supported file formats guide
- Real-time analysis results
- File upload progress

**Perfect for:** Bulk analyzing emails and social posts

**How to use:**
1. Click "Upload Content" in sidebar
2. Drag files into the drop zone, or click "Browse Files"
3. Watch as files are automatically analyzed
4. View results with threat scores and classifications

**Supported Files:**
- 📧 Email files (`.eml`)
- 📱 Social posts (`.json`)
- 📄 Text files (`.txt`, `.html`)

---

### 3️⃣ **Submissions** (`/submissions`)
**What you'll see:**
- 4 stat cards (Total, Malicious, Suspicious, Benign)
- Filter buttons
- Search bar
- Case list on left
- Case details on right

**Perfect for:** Managing and reviewing all analyzed cases

**Features:**
- Filter by classification (all/malicious/suspicious/benign)
- Search by ID, source, platform, or region
- Click any case to view full details
- Real-time updates

---

### 4️⃣ **Analytics** (`/analytics`)
**What you'll see:**
- Time range selector (24h/7d/30d/all)
- 4 key metrics at top
- 6 interactive charts
- Responsive visualizations

**Perfect for:** Understanding trends and patterns

**Charts included:**
1. Submissions Over Time (line chart)
2. Classification Breakdown (pie chart)
3. Threat Score Distribution (bar chart)
4. Platform Sources (horizontal bars)
5. Top Regions by Activity (bar chart)

---

### 5️⃣ **Blockchain** (`/blockchain`)
**What you'll see:**
- 3 status cards (Total Blocks, Active Nodes, Chain Valid)
- Blockchain visualization
- How It Works guide
- Benefits list

**Perfect for:** Viewing federated ledger and understanding the blockchain

---

## 🎨 Navigation Tips

### Desktop
- **Sidebar** is always visible on the left
- Click the **collapse button** (`<`) to minimize sidebar
- **Active page** is highlighted in emerald green

### Mobile
- Tap the **hamburger menu** (☰) in top-left to open sidebar
- Tap outside sidebar or on a page to close it
- All features work the same on mobile!

---

## 🎯 Try These Tasks

### Task 1: Upload Your First File
1. Click "Upload Content" in sidebar
2. Create a simple text file on your desktop
3. Drag it into the app
4. Watch the analysis happen!

### Task 2: View the Analytics
1. Click "Analytics" in sidebar
2. Try different time ranges
3. Hover over charts for details

### Task 3: Search Your Cases
1. Click "Submissions" in sidebar
2. Type something in the search box
3. Try filtering by classification

---

## 📤 Drag & Drop Examples

### Example Email File (save as `test.eml`)
```
From: suspicious@example.com
Subject: Urgent Action Required
Date: Thu, 26 Dec 2025 10:00:00 +0000

This is a test email content for analysis.
Click here to verify your account immediately!
```

### Example Social Post (save as `test.json`)
```json
{
  "text": "Breaking: Unverified claim about current events",
  "platform": "twitter",
  "author": "testuser",
  "location": "New York",
  "hashtags": ["breaking", "urgent"]
}
```

### Example Text File (save as `test.txt`)
```
This is a test narrative for malign influence detection.
It contains potentially misleading information about public figures.
```

---

## 🎨 Visual Features

### What's New?
- ✨ **Glassmorphism** - Modern frosted glass effects
- 🎨 **Gradients** - Smooth emerald-to-cyan gradients
- 🌊 **Animations** - Smooth transitions everywhere
- 📱 **Mobile-First** - Looks great on all devices
- 🎯 **Icons** - Beautiful SVG icons throughout

### Color Meanings
- 🟢 **Green/Emerald** - Success, benign content, active states
- 🔴 **Red** - Malicious content, errors, warnings
- 🟡 **Yellow** - Suspicious content, caution
- 🔵 **Blue** - Information, neutral stats
- 🟣 **Purple** - Blockchain, special features

---

## ⌨️ Keyboard Shortcuts (Future)

Currently mouse/touch only, but keyboard shortcuts coming soon!

---

## 🐛 Troubleshooting

### Drag & Drop Not Working?
- Make sure you're on the `/upload` page
- Check file format is supported (`.eml`, `.json`, `.txt`, `.html`)
- Try clicking "Browse Files" instead

### Charts Not Showing?
- Make sure you have some data (submit a few cases first)
- Try refreshing the page
- Check different time ranges

### Sidebar Won't Open (Mobile)?
- Look for the hamburger icon (☰) in top-left
- Make sure you're not blocking the overlay
- Try refreshing the page

---

## 📊 Understanding Your Data

### Threat Scores
- **0-20%** - Very low risk
- **20-40%** - Low risk
- **40-60%** - Medium risk
- **60-80%** - High risk
- **80-100%** - Very high risk

### Classifications
- **Benign** - Safe content, no threats detected
- **Suspicious** - Potential concerns, needs review
- **Malicious** - Active threats, take action
- **Unknown** - Unable to classify, needs manual review

---

## 🎓 Learn More

### Documentation
- `MULTIPAGE_README.md` - Comprehensive technical docs
- `MULTIPAGE_TRANSFORMATION.md` - What was changed
- Component source code in `frontend/components/`

### API Endpoints
- `POST /api/v1/intake` - Submit new analysis
- `GET /api/v1/cases` - List all cases
- `GET /api/v1/cases/:id` - Get case details
- `GET /api/v1/federated/ledger` - Blockchain data

---

## 🎉 You're Ready!

Start exploring your new multi-page dashboard. Everything is designed to be intuitive and self-explanatory.

**Need Help?** Check the documentation or examine the component source code.

**Enjoying the App?** Consider contributing improvements or sharing feedback!

---

**Current Status:** ✅ Running at http://localhost:3000
**Version:** 2.0.0 - Multi-Page Edition
**Last Updated:** December 26, 2025
