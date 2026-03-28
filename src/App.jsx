import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, ScaleControl, Marker, Popup } from 'react-leaflet';
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
  const [realErosionShapes, setRealErosionShapes] = useState(null);
  
  // State to control the side panel visibility
  const [isPanelOpen, setIsPanelOpen] = useState(true); 

  const majuliPosition = [26.95, 94.28];

  const landmarks = [
    { name: "Kamalabari", pos: [26.931, 94.215] },
    { name: "Garmur", pos: [26.963, 94.225] },
    { name: "Auniati Satra", pos: [26.895, 94.165] },
    { name: "Dakshinpat Satra", pos: [26.865, 94.295] }
  ];

  useEffect(() => {
    fetch('https://geodrishti-backend.onrender.com/api/erosion-stats/')
      .then(res => res.json())
      .then(data => setErosionStats(data))
      .catch(err => console.error("Django offline"));
  }, []);

  useEffect(() => {
    const fileName = `/erosion_${selectedYear}.json`;
    fetch(fileName)
      .then(res => res.json())
      .then(data => setRealErosionShapes(data))
      .catch(() => setRealErosionShapes(null));
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

  return (
    <div className="dashboard-container">
      
      {/* 1. MAP FILLS ENTIRE BACKGROUND */}
      <MapContainer center={majuliPosition} zoom={11} className="map-container" zoomControl={false}>
        <LayersControl position="bottomleft">
          <LayersControl.BaseLayer checked name="Satellite Imagery">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
        </LayersControl>

        {realErosionShapes && (
          <GeoJSON 
            key={selectedYear} 
            data={realErosionShapes} 
            style={erosionStyle}
            onEachFeature={(f, l) => l.bindPopup(`Risk Zone (${selectedYear})`)}
          />
        )}

        {landmarks.map((place, idx) => (
          <Marker key={idx} position={place.pos}>
            <Popup>
              <strong>{place.name}</strong><br/>
              Majuli, Assam
            </Popup>
          </Marker>
        ))}

        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>

      {/* 2. FLOATING HEADER */}
      <div className="floating-header">
        <h1>GeoDrishti</h1>
        <p>NIT Silchar Research | Majuli Island</p>
      </div>

      {/* 3. TOGGLE BUTTON FOR PANEL */}
      <button 
        className={`panel-toggle-btn ${isPanelOpen ? 'panel-open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      >
        {isPanelOpen ? '✕' : '☰'}
      </button>

      {/* 4. FLOATING SIDE PANEL (Scrollable) */}
      <div className={`side-panel ${!isPanelOpen ? 'collapsed' : ''}`}>
        <div className="panel-content">
          
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Risk Area Detected</h4>
              <p>{currentData ? `${currentData.hectares.toLocaleString()} Ha` : 'N/A'}</p>
            </div>
            
            <div className="stat-card">
              <h4>Annual Change</h4>
              <p className={change > 0 ? 'trend-up' : 'trend-down'}>
                {change ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%` : '--'}
              </p>
            </div>

            <div className="stat-card">
              <h4>Status</h4>
              <p style={{ color: currentData?.hectares > 15000 ? '#ef4444' : '#fbbf24' }}>
                {currentData?.hectares > 15000 ? 'CRITICAL' : 'HIGH'}
              </p>
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
              <strong style={{color: 'white'}}>Methodology:</strong><br/><br/>
              • Model: Sentinel-1 (SAR) + Sentinel-2 (NDVI)<br/>
              • Processing: Google Earth Engine (GEE)<br/>
              • Campus: NIT Silchar, Assam
            </div>
          </div>
        </div>
      </div>

      {/* 5. FLOATING BOTTOM TIMELINE (Always Visible) */}
      <div className="floating-bottom-bar">
        <h3>Year Selection: {selectedYear}</h3>
        <input 
          type="range" min="2018" max="2025" step="1" 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
          className="year-slider"
        />
      </div>
      
    </div>
  );
}

export default App;