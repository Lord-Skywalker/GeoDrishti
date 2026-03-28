import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, ImageOverlay, LayersControl, ScaleControl, Marker, Popup } from 'react-leaflet';
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
  
  // Geospatial Data States
  const [realErosionShapes, setRealErosionShapes] = useState(null);
  const [floodShapes, setFloodShapes] = useState(null); // NEW: Flood Data
  
  const [isPanelOpen, setIsPanelOpen] = useState(true); 

  const majuliPosition = [26.95, 94.28];
  
  // Bounding box for Majuli (Used to stretch the NDVI and Slope PNG images accurately)
  const majuliBounds = [[26.80, 93.90], [27.15, 94.60]]; 

  const landmarks = [
    { name: "Kamalabari", pos: [26.931, 94.215] },
    { name: "Garmur", pos: [26.963, 94.225] },
    { name: "Auniati Satra", pos: [26.895, 94.165] },
    { name: "Dakshinpat Satra", pos: [26.865, 94.295] }
  ];

  // Fetch Stats
  useEffect(() => {
    fetch('https://geodrishti-backend.onrender.com/api/erosion-stats/')
      .then(res => res.json())
      .then(data => setErosionStats(data))
      .catch(err => console.error("Django offline"));
  }, []);

  // Fetch Spatial Data based on Year
  useEffect(() => {
    // 1. Fetch Erosion
    fetch(`/erosion_${selectedYear}.json`)
      .then(res => res.json())
      .then(data => setRealErosionShapes(data))
      .catch(() => setRealErosionShapes(null));

    // 2. Fetch Flood Data (Assuming you will add flood_2022.json to your public folder later)
    fetch(`/flood_${selectedYear}.json`)
      .then(res => res.json())
      .then(data => setFloodShapes(data))
      .catch(() => setFloodShapes(null)); // Fails silently if file doesn't exist yet
  }, [selectedYear]);

  const currentData = erosionStats.find(d => d.year === selectedYear);
  const prevData = erosionStats.find(d => d.year === selectedYear - 1);

  const calculateChange = () => {
    if (!currentData || !prevData) return null;
    const change = ((currentData.hectares - prevData.hectares) / prevData.hectares) * 100;
    return change.toFixed(1);
  };

  const change = calculateChange();
  
  // Styling for the different map layers
  const erosionStyle = { color: "#ff3333", weight: 1.5, fillColor: "#ff0000", fillOpacity: 0.5 };
  const floodStyle = { color: "#3b82f6", weight: 1.5, fillColor: "#2563eb", fillOpacity: 0.4 }; // Blue for floods

  return (
    <div className="dashboard-container">
      
      <MapContainer center={majuliPosition} zoom={11} className="map-container" zoomControl={false}>
        <LayersControl position="bottomleft">
          
          {/* BASE MAPS */}
          <LayersControl.BaseLayer checked name="Satellite Imagery">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Standard Map">
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution="&copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>

          {/* OVERLAYS (Toggleable Layers) */}
          <LayersControl.Overlay checked name="High Erosion Risk (Red)">
            {realErosionShapes && (
              <GeoJSON 
                key={`erosion-${selectedYear}`} 
                data={realErosionShapes} 
                style={erosionStyle}
                onEachFeature={(f, l) => l.bindPopup(`Erosion Risk (${selectedYear})`)}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Monsoon Flood Inundation (Blue)">
            {floodShapes && (
              <GeoJSON 
                key={`flood-${selectedYear}`} 
                data={floodShapes} 
                style={floodStyle}
                onEachFeature={(f, l) => l.bindPopup(`Flood Zone (${selectedYear})`)}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="NDVI Vegetation Loss (Raster)">
            {/* You will need to save an image named ndvi_map.png in your public folder */}
            <ImageOverlay
              url="/ndvi_map.png"
              bounds={majuliBounds}
              opacity={0.6}
              zIndex={10}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="DEM Slope Topography (Raster)">
            {/* You will need to save an image named slope_map.png in your public folder */}
            <ImageOverlay
              url="/slope_map.png"
              bounds={majuliBounds}
              opacity={0.6}
              zIndex={9}
            />
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

      {/* TOGGLE BUTTON FOR PANEL */}
      <button className={`panel-toggle-btn ${isPanelOpen ? 'panel-open' : ''}`} onClick={() => setIsPanelOpen(!isPanelOpen)}>
        {isPanelOpen ? '✕' : '☰'}
      </button>

      {/* FLOATING SIDE PANEL */}
      <div className={`side-panel ${!isPanelOpen ? 'collapsed' : ''}`}>
        <div className="panel-content">
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