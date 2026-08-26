export type Coordinates = { latitude: number; longitude: number }

export function distanceInKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371
  const latitudeDelta = (to.latitude - from.latitude) * Math.PI / 180
  const longitudeDelta = (to.longitude - from.longitude) * Math.PI / 180
  const latitude1 = from.latitude * Math.PI / 180
  const latitude2 = to.latitude * Math.PI / 180
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2)
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
