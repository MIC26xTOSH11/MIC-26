'use client'

import { useEffect, useRef, useState } from 'react'
import { listCases } from '@/lib/api'

// Simple in-memory cache so we only geocode each region once
const geocodeCache = new Map()

async function geocodeRegion(region) {
  if (!region || region.toLowerCase().includes('local')) return null
  if (geocodeCache.has(region)) return geocodeCache.get(region)

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(region)}&limit=1`,
      { headers: { 'User-Agent': 'TattvaDrishti-Heatmap/1.0' } }
    )
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache.set(region, coords)
      return coords
    }
  } catch (error) {
    console.error('Geocode failed for', region, error)
  }
  geocodeCache.set(region, null)
  return null
}

export default function HopTraceMap() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [heatPoints, setHeatPoints] = useState([])
  const [stats, setStats] = useState({ total: 0, regions: 0, avgScore: 0 })

  const mapRef = useRef(null)
  const heatLayerRef = useRef(null)
  const containerRef = useRef(null)

  // Load cases, aggregate by region, geocode (only when needed), and build heat points
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listCases(800)
        const cases = data?.cases || []
        setStats((prev) => ({ ...prev, total: cases.length }))

        // Aggregate by region
        const regionMap = new Map()
        let totalScore = 0
        for (const c of cases) {
          const region = c.region || c.metadata?.region
          const score = typeof c.composite_score === 'number' ? c.composite_score : 0
          totalScore += score
          if (!region || region.toLowerCase().includes('local')) continue
          if (!regionMap.has(region)) {
            regionMap.set(region, { region, count: 0, totalScore: 0, lat: c.metadata?.latitude, lng: c.metadata?.longitude })
          }
          const entry = regionMap.get(region)
          entry.count += 1
          entry.totalScore += score
          // Prefer any existing coordinates from cases
          if (!entry.lat && c.metadata?.latitude) entry.lat = c.metadata.latitude
          if (!entry.lng && c.metadata?.longitude) entry.lng = c.metadata.longitude
        }

        const aggregated = Array.from(regionMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 100) // cap to avoid excessive geocoding

        setStats({
          total: cases.length,
          regions: aggregated.length,
          avgScore: cases.length ? ((totalScore / cases.length) * 100).toFixed(1) : 0,
        })

        // Geocode sequentially with a small delay to respect rate limits
        const points = []
        for (const entry of aggregated) {
          let coords = null
          // Use existing coordinates first
          if (entry.lat && entry.lng) {
            coords = { lat: entry.lat, lng: entry.lng }
          } else {
            coords = await geocodeRegion(entry.region)
          }
          if (coords) {
            const intensity = Math.max(0.3, Math.min(1, entry.totalScore / entry.count))
            points.push([coords.lat, coords.lng, intensity])
          }
          await new Promise((r) => setTimeout(r, 150))
        }

        setHeatPoints(points)
      } catch (e) {
        console.error('Failed to build heatmap', e)
        setError('Failed to load map data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // Initialize and update the map when heat points change
  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return
      if (heatPoints.length === 0) {
        return
      }

      const L = (await import('leaflet')).default
      await import('leaflet.heat')

      // Ensure CSS is present
      if (!document.querySelector('link[href*="leaflet@1.9.4/dist/leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: [20, 0],
          zoom: 2,
          zoomControl: true,
        })
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current)
      }

      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
        heatLayerRef.current = null
      }

      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 28,
        blur: 35,
        maxZoom: 10,
        max: 1.0,
        gradient: {
          0.0: '#22c55e',
          0.3: '#84cc16',
          0.5: '#f97316',
          0.7: '#ef4444',
          1.0: '#b91c1c',
        },
      }).addTo(mapRef.current)

      // Fit to points
      const latlngs = heatPoints.map(([lat, lng]) => [lat, lng])
      const bounds = L.latLngBounds(latlngs)
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    }

    render()

    return () => {
      // no cleanup here; handled on unmount
    }
  }, [heatPoints])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatLayerRef.current) heatLayerRef.current.remove()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-300">Global threat intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Regional User Demographics</h2>
          <p className="text-sm text-slate-400">Heatmap of analyzed cases by region, intensity shows threat levels</p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Blue → Green → Yellow → Red</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div
          ref={containerRef}
          style={{ height: 460, borderRadius: 18, overflow: 'hidden' }}
          className="w-full bg-slate-950 relative"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-10 text-slate-300">
              Loading map data…
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Cases:</span>
              <span className="font-semibold text-white">{stats.total}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Regions (geocoded):</span>
              <span className="font-semibold text-emerald-200">{stats.regions}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Avg Threat:</span>
              <span className="font-semibold text-orange-300">{stats.avgScore}%</span>
            </div>
          </div>
          <article className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">Intensity Legend</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><span className="text-slate-300">Low (0-30%)</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500"></div><span className="text-slate-300">Medium (30-50%)</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500"></div><span className="text-slate-300">High (50-70%)</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-600"></div><span className="text-slate-300">Critical (70-100%)</span></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
