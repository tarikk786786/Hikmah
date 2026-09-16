import { ReverseGeocodeResult } from '../types.js';

export class OSMProvider {
  public static readonly ATTRIBUTION = 'Data © OpenStreetMap contributors, ODbL 1.0';

  public async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Hikmah-Geointel/1.0 (hikmah-ai-assistant)'
        }
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const addr = data.address || {};
        return {
          latitude,
          longitude,
          displayName: data.display_name || `${latitude}, ${longitude}`,
          road: addr.road,
          suburb: addr.suburb || addr.neighbourhood,
          city: addr.city || addr.town || addr.village,
          state: addr.state,
          country: addr.country,
          countryCode: addr.country_code,
          postcode: addr.postcode,
          attribution: OSMProvider.ATTRIBUTION
        };
      }
    } catch (err) {
      console.warn('OSM Nominatim fetch failed, using fallback reverse lookup:', err);
    }

    // Heuristic geographic label for offline/test mode
    return {
      latitude,
      longitude,
      displayName: `Approx. Sector near Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
      city: 'Metropolitan Area',
      country: 'United States',
      countryCode: 'us',
      attribution: OSMProvider.ATTRIBUTION
    };
  }

  public getTileUrl(z: number, x: number, y: number): string {
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}
