
export function calculateRiskScore({ spo2, hr, rr }) {
  let score = 0;

  if (spo2 < 90) score += 40;
  else if (spo2 < 95) score += 20;

  if (hr > 120 || hr < 50) score += 25;
  else if (hr > 100 || hr < 60) score += 10;

  if (rr > 25 || rr < 10) score += 25;
  else if (rr > 20 || rr < 12) score += 10;

  return Math.min(score, 100);
}
