import { Tenor, TENORS, YieldCurvePoint } from '../types';

// Approximate base curve (normal upward sloping)
const BASE_CURVE: Record<Tenor, number> = {
  '1M': 4.5, '3M': 4.6, '6M': 4.7,
  '1Y': 4.8, '2Y': 4.75, '3Y': 4.7,
  '5Y': 4.65, '7Y': 4.7, '10Y': 4.8,
  '20Y': 5.0, '30Y': 4.9
};

const TENOR_YEARS: Record<Tenor, number> = {
  '1M': 1/12, '3M': 3/12, '6M': 6/12,
  '1Y': 1, '2Y': 2, '3Y': 3,
  '5Y': 5, '7Y': 7, '10Y': 10,
  '20Y': 20, '30Y': 30
};

export const generateMockData = (days = 90): YieldCurvePoint[] => {
  const data: YieldCurvePoint[] = [];
  const now = new Date();
  
  // Initial Factors
  let level = 0;
  let slope = 0;
  let curvature = 0;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random Walk for factors
    level += (Math.random() - 0.5) * 0.05;
    slope += (Math.random() - 0.5) * 0.03;
    curvature += (Math.random() - 0.5) * 0.02;

    const point: any = {
      date: date.toISOString().split('T')[0]
    };

    TENORS.forEach(tenor => {
      const t = TENOR_YEARS[tenor];
      
      // Nelson-Siegel style simple approximation for simulation
      // Yield(t) = Level + Slope * ((1-exp(-lambda*t))/(lambda*t)) + Curvature * (...)
      // We'll just do a simpler linear combo for mock data
      
      // Base
      let val = BASE_CURVE[tenor];
      
      // Add dynamic factors
      val += level; // Parallel shift
      val += slope * (1 - Math.exp(-t/5)); // Slope effect
      val += curvature * (4 * Math.exp(-t/2) * (1 - Math.exp(-t/2))); // Hump/Curvature

      // Add noise
      val += (Math.random() - 0.5) * 0.02;
      
      point[tenor] = Number(val.toFixed(3));
    });

    data.push(point);
  }

  return data;
};
