import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

export default function MapPicker({ lat, lng, radius, onChange }) {
  const center = useMemo(() => [lat, lng], [lat, lng])

  // leaflet sometimes needs resize when inside modal/cards
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 250)
    return () => clearTimeout(t)
  }, [lat, lng])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} zoom={16} scrollWheelZoom className="h-[320px] w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={({ lat, lng }) => onChange?.({ lat, lng, radius })} />
        <Marker position={center} />
        <Circle center={center} radius={radius} />
      </MapContainer>

      <div className="p-3 bg-white">
        <div className="text-xs text-slate-600">Tip: haz clic en el mapa para mover el pin. Ajusta el radio con el control de abajo.</div>
      </div>
    </div>
  )
}
