import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, ImageOverlay, LayersControl, ScaleControl, Marker, Popup, FeatureGroup } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css'; 
import './App.css';

// --- FIX FOR BROKEN MAP ICONS ---
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
// --------------------------------

function App() {
  const [selectedYear, setSelectedYear] = useState(2022);
  const [erosionStats, setErosionStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [realErosionShapes, setRealErosionShapes] = useState(null);
  const [floodShapes, setFloodShapes] = useState(null); 
  
  const [isPanelOpen, setIsPanelOpen] = useState(true); 
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false); // NEW: Dropdown State

  const majuliPosition = [26.95, 94.28];
  const majuliBounds = [[26.80, 93.90], [27.15, 94.60]]; 

  const landmarks = [
    { name: "Kamalabari", pos: [26.931, 94.215] },
    { name: "Garmur", pos: [26.963, 94.225] },
    { name: "Auniati Satra", pos: [26.895, 94.165] },
    { name: "Dakshinpat Satra", pos: [26.865, 94.295] }
  ];

  useEffect(() => {
    fetch('https://geodrishti-backend.onrender.com/api/erosion-stats/')
      .then(res => res.json())
      .then(data => {
        setErosionStats(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Django offline");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch(`/erosion_${selectedYear}.json`)
      .then(res => res.json())
      .then(data => setRealErosionShapes(data))
      .catch(() => setRealErosionShapes(null));

    fetch(`/flood_${selectedYear}.json`)
      .then(res => res.json())
      .then(data => setFloodShapes(data))
      .catch(() => setFloodShapes(null)); 
  }, [selectedYear]);

  const currentData = erosionStats.find(d => d.year === selectedYear);
  const prevData = erosionStats.find(d => d.year === selectedYear - 1);

  const calculateChange = () => {
    if (!currentData || !prevData) return null;
    const change = ((currentData.hectares - prevData.hectares) / prevData.hectares) * 100;
    return change.toFixed(1);
  };

  const change = calculateChange();
  
  const erosionStyle = { color: "#ff3333", weight: 1.5, fillColor: "#ff0000", fillOpacity: 0.5 };
  const floodStyle = { color: "#3b82f6", weight: 1.5, fillColor: "#2563eb", fillOpacity: 0.4 }; 

  return (
    <div className="dashboard-container">
      
      <MapContainer center={majuliPosition} zoom={11} className="map-container" zoomControl={false}>
        <LayersControl position="bottomleft">
          
          <LayersControl.BaseLayer checked name="Satellite Imagery">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Standard Map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="High Erosion Risk (Red)">
            <FeatureGroup>
              {realErosionShapes && (
                <GeoJSON key={`erosion-${selectedYear}`} data={realErosionShapes} style={erosionStyle} onEachFeature={(f, l) => l.bindPopup(`Erosion Risk (${selectedYear})`)} />
              )}
            </FeatureGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Monsoon Flood Inundation (Blue)">
            <FeatureGroup>
              {floodShapes && (
                <GeoJSON key={`flood-${selectedYear}`} data={floodShapes} style={floodStyle} onEachFeature={(f, l) => l.bindPopup(`Flood Zone (${selectedYear})`)} />
              )}
            </FeatureGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="NDVI Vegetation Loss (Raster)">
            <ImageOverlay url={`/ndvi_${selectedYear}.png`} bounds={majuliBounds} opacity={0.6} zIndex={10} />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="DEM Slope Topography (Raster)">
            <ImageOverlay url="/slope_map.png" bounds={majuliBounds} opacity={0.6} zIndex={9} />
          </LayersControl.Overlay>

        </LayersControl>

        {landmarks.map((place, idx) => (
          <Marker key={idx} position={place.pos}>
            <Popup><strong>{place.name}</strong><br/>Majuli, Assam</Popup>
          </Marker>
        ))}

        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>

      {/* FLOATING HEADER */}
      <div className="floating-header">
        <h1>GeoDrishti</h1>
        <p>NIT Silchar Research | Majuli Island</p>
      </div>

      {/* STATIC MAP LEGEND */}
      <div className="map-legend">
        <h4>Map Legend</h4>
        
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff0000', opacity: 0.5 }}></span>
          <span>Erosion Risk Area</span>
        </div>
        
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#2563eb', opacity: 0.4 }}></span>
          <span>Monsoon Flood Zone</span>
        </div>

        <div className="legend-item gradient-block">
          <span>NDVI (Vegetation Cover)</span>
          <div className="gradient-bar ndvi-gradient"></div>
          <div className="gradient-labels">
            <span>Water/Bare</span>
            <span>Dense Forest</span>
          </div>
        </div>

        <div className="legend-item gradient-block">
          <span>Terrain Slope (DEM)</span>
          <div className="gradient-bar slope-gradient"></div>
          <div className="gradient-labels">
            <span>Flat (0°)</span>
            <span>Steep (&gt;10°)</span>
          </div>
        </div>
      </div>

      {/* DOWNLOAD MENU (Only visible when panel is open) */}
      {isPanelOpen && (
        <div className="download-container">
          <button className="download-btn" onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}>
            📥 Timelapses
          </button>
          
          {isDownloadMenuOpen && (
            <div className="download-dropdown">
              <p>Download 2018-2025 (.gif)</p>
              <a href="/timelapse_ndvi.gif" download>🌿 NDVI Evolution</a>
              <a href="/timelapse_flood.gif" download>🌊 Flood Patterns</a>
              <a href="/timelapse_erosion.gif" download>⚠️ Erosion Extent</a>
            </div>
          )}
        </div>
      )}

      {/* TOGGLE BUTTON & SIDE PANEL */}
      <button className={`panel-toggle-btn ${isPanelOpen ? 'panel-open' : ''}`} onClick={() => {
        setIsPanelOpen(!isPanelOpen);
        setIsDownloadMenuOpen(false); // Close dropdown if panel closes
      }}>
        {isPanelOpen ? '✕' : '☰'}
      </button>

      <div className={`side-panel ${!isPanelOpen ? 'collapsed' : ''}`}>
        <div className="panel-content">
          {isLoading ? (
            <div className="loader-container">
              <div className="spinner"></div>
              <p style={{ fontWeight: 'bold', color: '#38bdf8' }}>🛰️ Fetching Satellite Data...</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Waking up secure backend server. This may take up to 50 seconds.</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Risk Area Detected</h4>
                  <p>{currentData ? `${currentData.hectares.toLocaleString()} Ha` : 'N/A'}</p>
                </div>
                <div className="stat-card">
                  <h4>Annual Change</h4>
                  <p className={change > 0 ? 'trend-up' : 'trend-down'}>{change ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%` : '--'}</p>
                </div>
                <div className="stat-card">
                  <h4>Status</h4>
                  <p style={{ color: currentData?.hectares > 15000 ? '#ef4444' : '#fbbf24' }}>{currentData?.hectares > 15000 ? 'CRITICAL' : 'HIGH'}</p>
                </div>
              </div>

              <div className="panel-card" style={{marginTop: '20px'}}>
                <h2 style={{fontSize: '18px', marginBottom: '10px'}}>Temporal Trends</h2>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <AreaChart data={erosionStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={10}/>
                      <YAxis stroke="#94a3b8" fontSize={10}/>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="hectares" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="metadata-box" style={{marginTop: '25px', fontSize: '12px', color: '#94a3b8', background: '#1e293b', padding: '15px', borderRadius: '8px'}}>
                  <strong style={{color: 'white'}}>Data Layers:</strong><br/><br/>
                  • Erosion Risk: Sentinel-1 & 2 (GeoJSON)<br/>
                  • Flood Extent: Sentinel-1 SAR (GeoJSON)<br/>
                  • Vegetation (NDVI): Sentinel-2 (Raster)<br/>
                  • Slope (DEM): SRTM 30m (Raster)
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FLOATING BOTTOM TIMELINE */}
      <div className="floating-bottom-bar">
        <h3>Year Selection: {selectedYear}</h3>
        <input type="range" min="2018" max="2025" step="1" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="year-slider" />
      </div>
      
    </div>
  );
}

export default App;