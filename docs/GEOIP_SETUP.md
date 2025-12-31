# GeoIP Location Detection Setup

This guide explains how to set up MaxMind GeoLite2 for automatic region detection based on user IP addresses.

## Overview

The application uses MaxMind's GeoLite2 City database to automatically detect users' locations based on their IP addresses. This provides a better user experience by pre-filling the region field in the intake form.

## Features

- ✅ Auto-detects user's city and region from IP address
- ✅ Works with Azure deployments (handles X-Forwarded-For headers)
- ✅ Fallback to manual entry if detection fails
- ✅ User can edit the auto-detected region
- ✅ Visual indicator showing when location was auto-detected

## Setup Instructions

### 1. Install Python Dependencies

The required package is already in `requirements.txt`:

```bash
pip install geoip2
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

### 2. Download GeoLite2 Database

#### Option A: Direct Download (Recommended for Development)

1. Create a free account at [MaxMind](https://www.maxmind.com/en/geolite2/signup)
2. Log in and go to "Download Files"
3. Download **GeoLite2 City** in GeoIP2 Binary (.mmdb) format
4. Extract the downloaded archive

#### Option B: Using geoipupdate (Recommended for Production)

1. Install geoipupdate:
   ```bash
   # macOS
   brew install geoipupdate
   
   # Ubuntu/Debian
   sudo add-apt-repository ppa:maxmind/ppa
   sudo apt update
   sudo apt install geoipupdate
   
   # Azure/Production
   wget https://github.com/maxmind/geoipupdate/releases/download/v4.11.0/geoipupdate_4.11.0_linux_amd64.tar.gz
   tar -xzf geoipupdate_4.11.0_linux_amd64.tar.gz
   ```

2. Configure geoipupdate:
   ```bash
   # Create config file
   sudo nano /etc/GeoIP.conf
   ```

   Add your MaxMind credentials:
   ```
   AccountID YOUR_ACCOUNT_ID
   LicenseKey YOUR_LICENSE_KEY
   EditionIDs GeoLite2-City
   ```

3. Run geoipupdate:
   ```bash
   sudo geoipupdate
   ```

### 3. Place Database File

Copy the `GeoLite2-City.mmdb` file to one of these locations:

**Development (Local):**
```bash
mkdir -p data
cp /path/to/GeoLite2-City.mmdb data/
```

**Production (Linux/Azure):**
```bash
sudo mkdir -p /usr/share/GeoIP
sudo cp /path/to/GeoLite2-City.mmdb /usr/share/GeoIP/
```

The application will automatically check these paths in order:
1. `data/GeoLite2-City.mmdb` (project directory)
2. `/usr/share/GeoIP/GeoLite2-City.mmdb` (system-wide)
3. `/var/lib/GeoIP/GeoLite2-City.mmdb` (alternative system location)
4. `GeoLite2-City.mmdb` (current directory)

### 4. Verify Installation

Start your backend server:

```bash
uvicorn app.main:app --reload
```

Check the logs for:
```
INFO:TattvaDrishti:GeoIP database loaded from data/GeoLite2-City.mmdb
```

If you see a warning, the database wasn't found and location detection will be disabled (but the app will still work with manual entry).

## Azure Deployment

### Environment Configuration

The application automatically handles Azure's proxy headers:
- `X-Forwarded-For` - Gets the original client IP
- `X-Real-IP` - Alternative proxy header

No additional configuration needed!

### Deployment Steps for Azure

1. **Add database to your repository** (if small enough):
   ```bash
   git add data/GeoLite2-City.mmdb
   git commit -m "Add GeoLite2 database"
   ```

2. **Or download during deployment** (recommended):
   
   Add to your Azure deployment script or `startup.sh`:
   ```bash
   #!/bin/bash
   
   # Install geoipupdate
   apt-get update
   apt-get install -y wget
   wget https://github.com/maxmind/geoipupdate/releases/download/v4.11.0/geoipupdate_4.11.0_linux_amd64.tar.gz
   tar -xzf geoipupdate_4.11.0_linux_amd64.tar.gz
   
   # Configure with environment variables
   cat > /etc/GeoIP.conf <<EOF
   AccountID $MAXMIND_ACCOUNT_ID
   LicenseKey $MAXMIND_LICENSE_KEY
   EditionIDs GeoLite2-City
   DatabaseDirectory /usr/share/GeoIP
   EOF
   
   # Download database
   ./geoipupdate_4.11.0_linux_amd64/geoipupdate
   
   # Start application
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Set environment variables in Azure**:
   - `MAXMIND_ACCOUNT_ID`
   - `MAXMIND_LICENSE_KEY`

### Azure App Service Configuration

For Azure App Service, add a startup command in the Azure Portal:

1. Go to Configuration → General Settings
2. Set Startup Command:
   ```bash
   bash startup.sh
   ```

## Testing

### Test the API Endpoint

```bash
curl http://localhost:8000/api/v1/location
```

Expected response:
```json
{
  "ip": "YOUR_IP",
  "location": {
    "city": "San Francisco",
    "country": "United States",
    "country_code": "US",
    "region": "San Francisco, California",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "postal_code": "94103",
    "error": null
  },
  "detected": true
}
```

### Test in Frontend

1. Open the application in your browser
2. Go to the dashboard or intake form
3. The Region field should auto-populate with your detected location
4. You'll see a small location icon with "Auto-detected" text
5. You can still edit the field manually if needed

## Privacy & Compliance

- **No personal data stored**: The GeoIP lookup happens in real-time and only the city/region is returned
- **IP not logged**: The IP address is only used for lookup and not stored in the database
- **User control**: Users can always override the auto-detected location
- **Fallback safe**: If GeoIP fails, users can still manually enter their location

## Updating the Database

MaxMind updates GeoLite2 databases weekly. To stay current:

### Manual Update
```bash
# Download latest version from MaxMind
# Replace the old .mmdb file
cp /path/to/new/GeoLite2-City.mmdb data/
# Restart the application
```

### Automatic Updates (Production)
```bash
# Add to cron (run weekly)
0 0 * * 0 /usr/bin/geoipupdate
# Restart your application after update
0 5 * * 0 systemctl restart tattvadrishti
```

## Troubleshooting

### Location not detected

1. **Check logs**: Look for "GeoIP database loaded" message
2. **Verify database**: Ensure `GeoLite2-City.mmdb` exists in one of the search paths
3. **Check IP**: Local IPs (127.0.0.1, 192.168.x.x) return "Local Network"
4. **Test public IP**: Use a VPN or test from a different network

### "GeoIP database not available" error

- Database file not found. Check file path and permissions
- Install location: Make sure it's in one of the checked directories

### Private IP detection

The system automatically detects private IPs (192.168.x.x, 10.x.x.x, 127.0.0.1) and returns "Local Network" instead of trying to look them up.

### Azure proxy issues

If getting wrong location on Azure:
1. Check that `X-Forwarded-For` header is being sent
2. Verify Azure App Service is configured correctly
3. Check application logs for the detected IP address

## License

MaxMind GeoLite2 databases are distributed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).

**Attribution Required**: Add this to your application's about/credits section:
```
This product includes GeoLite2 data created by MaxMind, available from https://www.maxmind.com
```

## Support

- MaxMind Documentation: https://dev.maxmind.com/geoip/docs
- GeoLite2 Free Geolocation Data: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- geoip2 Python Library: https://github.com/maxmind/GeoIP2-python
