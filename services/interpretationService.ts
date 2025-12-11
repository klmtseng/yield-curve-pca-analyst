
import { PCAResult } from '../types';

export const generateInterpretation = (pca: PCAResult, dates: { start: string, end: string }): string => {
  const { eigenvectors, scores, explainedVariance, tenors } = pca;
  
  if (!explainedVariance || explainedVariance.length === 0) {
    return "Insufficient data to generate interpretation.";
  }

  const formatPct = (val: number) => isNaN(val) ? "N/A" : (val * 100).toFixed(1);

  const pc1Exp = formatPct(explainedVariance[0]);
  const pc2Exp = formatPct(explainedVariance[1]);
  const pc3Exp = formatPct(explainedVariance[2]); // Not used directly in text but good to have ready

  // 1. Analyze Level (PC1)
  const pc1Loadings = eigenvectors[0];
  const avgLoading1 = pc1Loadings ? pc1Loadings.reduce((a, b) => a + b, 0) / pc1Loadings.length : 0;
  // Direction: If avg loading is positive, positive score = higher rates
  const directionPC1 = avgLoading1 > 0 ? 1 : -1;
  const score1Start = scores.length > 0 ? scores[0][0] : 0;
  const score1End = scores.length > 0 ? scores[scores.length - 1][0] : 0;
  const levelChange = (score1End - score1Start) * directionPC1;
  
  let levelTrend = "remained relatively stable";
  let bondTrend = "neutral";
  if (levelChange > 1) { levelTrend = "risen significantly"; bondTrend = "Bearish"; }
  else if (levelChange > 0.25) { levelTrend = "trended higher"; bondTrend = "Bearish"; }
  else if (levelChange < -1) { levelTrend = "fallen significantly"; bondTrend = "Bullish"; }
  else if (levelChange < -0.25) { levelTrend = "trended lower"; bondTrend = "Bullish"; }

  // 2. Analyze Slope (PC2)
  // Identify 2Y and 10Y indices (or best approx)
  const idx2Y = tenors.indexOf('2Y') > -1 ? tenors.indexOf('2Y') : 0;
  const idx10Y = tenors.indexOf('10Y') > -1 ? tenors.indexOf('10Y') : tenors.length - 1;
  
  const pc2Loadings = eigenvectors[1] || [];
  // Calculate slope gradient: Long loading - Short loading
  const slopeGradient = pc2Loadings.length > 0 ? pc2Loadings[idx10Y] - pc2Loadings[idx2Y] : 0;
  
  // If gradient > 0, positive score = steeper (Long > Short)
  const directionPC2 = slopeGradient > 0 ? 1 : -1;
  const score2Start = scores.length > 0 ? scores[0][1] : 0;
  const score2End = scores.length > 0 ? scores[scores.length - 1][1] : 0;
  const slopeChange = (score2End - score2Start) * directionPC2;

  let slopeTrend = "stable curve shape";
  let curveRegime = "Neutral";
  if (slopeChange > 0.5) { slopeTrend = "steepened"; curveRegime = "Steepening"; }
  else if (slopeChange < -0.5) { slopeTrend = "flattened"; curveRegime = "Flattening"; }

  // 3. Analyze Curvature (PC3) - Butterfly
  // Middle (5Y) vs Wings (2Y, 10Y)
  const idx5Y = tenors.indexOf('5Y') > -1 ? tenors.indexOf('5Y') : Math.floor(tenors.length / 2);
  const pc3Loadings = eigenvectors[2] || [];
  // Curvature metric: Mid - (Short + Long)/2
  const curvatureGradient = pc3Loadings.length > 0 ? pc3Loadings[idx5Y] - (pc3Loadings[idx2Y] + pc3Loadings[idx10Y]) / 2 : 0;
  const directionPC3 = curvatureGradient > 0 ? 1 : -1; // +Score = More Hump
  const score3Start = scores.length > 0 ? scores[0][2] : 0;
  const score3End = scores.length > 0 ? scores[scores.length - 1][2] : 0;
  const curvatureChange = (score3End - score3Start) * directionPC3;

  let curvatureDesc = "Standard Convexity";
  if (curvatureChange > 0.5) curvatureDesc = "Increased Convexity (Hump)";
  else if (curvatureChange < -0.5) curvatureDesc = "Decreased Convexity";

  // 4. Construct Narrative
  let summary = `### Market Regime Analysis: ${bondTrend} ${curveRegime}\n\n`;
  
  summary += `**Period**: ${dates.start} to ${dates.end}\n\n`;

  summary += `#### 1. Level Factor (PC1: ${pc1Exp}%)\n`;
  summary += `Yields have **${levelTrend}** over this period. Since PC1 accounts for the vast majority of variance, the parallel shift in rates was the dominant market driver. `;
  if (bondTrend === 'Bearish') summary += "This indicates a sell-off in the broader bond market.";
  if (bondTrend === 'Bullish') summary += "This indicates a rally in the broader bond market.";
  summary += "\n\n";

  summary += `#### 2. Slope Factor (PC2: ${pc2Exp}%)\n`;
  summary += `The yield curve has **${slopeTrend}**. `;
  if (slopeChange > 0.2) {
    summary += "Long-term rates outperformed short-term rates (yields rose more or fell less at the long end). Steepening is often associated with improving growth expectations or rising inflation premiums (Bear Steepener) or rate cut expectations (Bull Steepener).";
  } else if (slopeChange < -0.2) {
     summary += "The spread between long and short rates compressed. Flattening often signals monetary tightening, fading inflation expectations, or concerns about future economic slowdown.";
  }
  summary += "\n\n";

  summary += `#### 3. Strategic Interpretation\n`;
  summary += "Based on the component interactions:\n";
  
  if (bondTrend === 'Bearish' && curveRegime === 'Steepening') {
      summary += "- **Bear Steepener**: Yields rose, but long-end yields rose faster. Often driven by rising inflation expectations.";
  } else if (bondTrend === 'Bearish' && curveRegime === 'Flattening') {
      summary += "- **Bear Flattener**: Yields rose, with short-end yields leading the way. Classic signal of Central Bank hiking cycles.";
  } else if (bondTrend === 'Bullish' && curveRegime === 'Steepening') {
      summary += "- **Bull Steepener**: Yields fell, with short-end yields falling faster. Often seen as the market anticipates imminent rate cuts.";
  } else if (bondTrend === 'Bullish' && curveRegime === 'Flattening') {
      summary += "- **Bull Flattener**: Yields fell, but long-end yields fell faster. Suggests a pessimistic long-term growth outlook.";
  } else {
      summary += "- **Mixed/Range-bound**: The market lacked a strong directional conviction combining both level and slope.";
  }

  return summary;
};
