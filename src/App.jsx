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

  const majuliPosition = [26.95, 94.28];

  // Important Landmarks in Majuli to give the map context
  const landmarks = [
    { name: "Kamalabari", pos: [26.931, 94.215] },
    { name: "Garmur", pos: [26.963, 94.225] },
    { name: "Auniati Satra", pos: [26.895, 94.165] },
    { name: "Dakshinpat Satra", pos: [26.865, 94.295] }
  ];

  // 1. Fetch Stats from LIVE Django Render API
  useEffect(() => {
    fetch('https://geodrishti-backend.onrender.com/api/erosion-stats/')
      .then(res => res.json())
      .then(data => setErosionStats(data))
      .catch(err => console.error("Django offline"));
  }, []);

  // 2. Fetch Map Data based on Slider
  useEffect(() => {
    const fileName = `/erosion_${selectedYear}.json`;
    fetch(fileName)
      .then(res => res.json())
      .then(data => setRealErosionShapes(data))
      .catch(() => setRealErosionShapes(null));
  }, [selectedYear]);

  // --- ANALYTICS LOGIC ---
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
      <header className="header">
        <div className="header-content">
          <h1>Project Bhoomi</h1>
          <span className="badge">NIT Silchar Research</span>
        </div>
        <p>Interactive Erosion Dynamics Dashboard | Majuli Island</p>
      </header>

      <div className="dashboard-body">
        <MapContainer center={majuliPosition} zoom={11} className="map-container">
          <LayersControl position="topleft">
            <LayersControl.BaseLayer checked name="Satellite Imagery">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* GEE Erosion Risk Clusters */}
          {realErosionShapes && (
            <GeoJSON 
              key={selectedYear} 
              data={realErosionShapes} 
              style={erosionStyle}
              onEachFeature={(f, l) => l.bindPopup(`Risk Zone (${selectedYear})`)}
            />
          )}

          {/* Village/Landmark Markers */}
          {landmarks.map((place, idx) => (
            <Marker key={idx} position={place.pos}>
              <Popup>
                <strong>{place.name}</strong><br/>
                Majuli, Assam
              </Popup>
            </Marker>
          ))}

          <ScaleControl position="bottomleft" imperial={false} />

          <div className="leaflet-bottom leaflet-right">
            <div className="leaflet-control map-legend">
              <h4 style={{margin: '0 0 8px 0'}}>Map Legend</h4>
              <div className="legend-item">
                <div className="color-box" style={{backgroundColor: '#ff0000', opacity: 0.6}}></div>
                <span>High Erosion Risk ({selectedYear})</span>
              </div>
            </div>
          </div>
        </MapContainer>

        <div className="data-panel">
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

          <div className="panel-card">
            <h2>Temporal Trends</h2>
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

            <div className="timeline-container">
              <h3>Year Selection: {selectedYear}</h3>
              <input 
                type="range" min="2018" max="2025" step="1" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
              />
            </div>

            <div className="metadata-box">
              <strong>Methodology:</strong><br/>
              • Model: Sentinel-1 (SAR) + Sentinel-2 (NDVI)<br/>
              • Processing: Google Earth Engine (GEE)<br/>
              • Campus: NIT Silchar, Assam
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;