
import { YieldCurvePoint, Tenor } from '../types';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CORS_PROXY = 'https://corsproxy.io/?';

// Mapping of App Tenors to FRED Series IDs
// DGS = Daily Treasury Par Yield Curve Rates
const SERIES_MAP: Record<Tenor, string> = {
  '1M': 'DGS1MO',
  '3M': 'DGS3MO',
  '6M': 'DGS6MO',
  '1Y': 'DGS1',
  '2Y': 'DGS2',
  '3Y': 'DGS3',
  '5Y': 'DGS5',
  '7Y': 'DGS7',
  '10Y': 'DGS10',
  '20Y': 'DGS20',
  '30Y': 'DGS30'
};

interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
  error_message?: string;
}

export const fetchFredData = async (
  apiKey: string, 
  startDate: string
): Promise<{ data: YieldCurvePoint[], availableTenors: Tenor[] }> => {
  
  // Create an array of promises to fetch each tenor in parallel
  const tenorPromises = Object.entries(SERIES_MAP).map(async ([tenor, seriesId]) => {
    const url = new URL(FRED_BASE_URL);
    url.searchParams.append('series_id', seriesId);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('file_type', 'json');
    url.searchParams.append('observation_start', startDate);

    // Use CORS Proxy to bypass browser restrictions
    const proxyUrl = CORS_PROXY + encodeURIComponent(url.toString());

    try {
      const response = await fetch(proxyUrl);
      
      // Handle HTTP Errors
      if (!response.ok) {
        // If it's a 400 or 403, it's likely an API Key issue. Fail fast.
        if (response.status === 400 || response.status === 403) {
          throw new Error(`API Key Invalid or Bad Request (${response.status})`);
        }
        return { tenor: tenor as Tenor, observations: [] };
      }

      const data: FredResponse = await response.json();
      
      // FRED sometimes returns 200 but with an error message in body if params are wrong
      if (data.error_message) {
         throw new Error(data.error_message);
      }

      return { tenor: tenor as Tenor, observations: data.observations || [] };
    } catch (error: any) {
      console.warn(`Failed to fetch ${seriesId}:`, error.message);
      // If it was a critical API key error, rethrow it so the whole operation fails
      if (error.message.includes("API Key")) throw error;
      return { tenor: tenor as Tenor, observations: [] };
    }
  });

  const results = await Promise.all(tenorPromises);

  // Merge logic: Create a map of Date -> YieldCurvePoint
  const dateMap: Record<string, any> = {};

  results.forEach(({ tenor, observations }) => {
    observations.forEach(obs => {
      const val = parseFloat(obs.value);
      if (!isNaN(val)) {
        if (!dateMap[obs.date]) {
          dateMap[obs.date] = { date: obs.date };
        }
        dateMap[obs.date][tenor] = val;
      }
    });
  });

  // Convert map to array
  let data: YieldCurvePoint[] = Object.values(dateMap);

  // Identify valid tenors (those that returned data)
  const availableTenors = results
    .filter(r => r.observations.length > 0)
    .map(r => r.tenor);

  // Filter out incomplete rows (must have at least 3 valid points for PCA)
  data = data.filter(point => {
    let count = 0;
    availableTenors.forEach(t => {
      if (point[t] !== undefined) count++;
    });
    return count >= 3;
  });

  // Sort by date
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (data.length === 0) {
    if (availableTenors.length === 0) {
      throw new Error("Connection successful but no data returned. Please check your API Key and Date Range.");
    }
    throw new Error("No overlapping data found for the selected range. Try a wider date range.");
  }

  return { data, availableTenors };
};
