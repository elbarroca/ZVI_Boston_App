import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Fix for default markers in Leaflet
if (Platform.OS === 'web') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
}

// Define university locations as per the feedback
const universityPins = [
  { id: 'bu', title: 'Boston University', lat: 42.3505, lng: -71.1054 },
  { id: 'neu', title: 'Northeastern', lat: 42.3398, lng: -71.0892 },
  { id: 'harvard', title: 'Harvard University', lat: 42.3770, lng: -71.1167 },
];

interface WebMapComponentProps {
  listings: any[];
  router: any;
}

const WebMapComponent: React.FC<WebMapComponentProps> = ({ listings, router }) => {
  return (
    <View style={styles.map}>
      <MapContainer
        center={[42.35, -71.09]}
        zoom={13}
        style={styles.leafletMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* University Markers */}
        {universityPins.map(pin => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]}>
            <Popup>{pin.title}</Popup>
          </Marker>
        ))}
        {/* Listing Markers */}
        {listings
          .filter(listing => listing.latitude && listing.longitude)
          .map(listing => (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              eventHandlers={{
                click: () => router.push(`/(tabs)/listings/${listing.id}`),
              }}
            >
              <Popup>
                <strong>{listing.title}</strong><br />
                ${listing.price_per_month}/month
              </Popup>
            </Marker>
          ))
        }
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  leafletMap: {
    height: '100%',
    width: '100%',
  },
});

export default WebMapComponent;