import { Chart, registerables } from 'chart.js';
import { appState } from '@/state/app-state';
import { setTxt } from '@/utils/dom.utils';

Chart.register(...registerables);

let radarChartInstance: Chart | null = null;

export function renderRadarStats(): void {
  const canvas = document.getElementById('skillRadarChart') as HTMLCanvasElement;
  if (!canvas) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayData = appState.trackerData.find(d => d.date.startsWith(todayStr));
  
  // 1. Discipline (Routine %)
  const routineCompleted = appState.routineHistory[todayStr] || 0;
  const routineTotal = appState.routines.length || 1;
  const discipline = Math.min(100, Math.round((routineCompleted / routineTotal) * 100));

  // 2. Endurance (Hours %) - Target 8h = 100%
  const todayHours = todayData ? (
    (todayData.pythonHours || 0) +
    (todayData.dsaHours || 0) +
    (todayData.projectHours || 0) +
    (todayData.col4Hours || 0) +
    (Array.isArray(todayData.extraHours) ? todayData.extraHours.reduce((s, n) => s + (n || 0), 0) : 0)
  ) : 0;
  const endurance = Math.min(100, Math.round((todayHours / 8) * 100));

  // 3. Focus (Based on session count or consistency - using a placeholder logic for now: Hours > 0 + Routine > 50%)
  const focus = (todayHours > 0 && discipline > 50) ? 90 : (todayHours > 0 ? 60 : 20);

  // 4. Output (Problems solved) - Target 5 = 100%
  const problems = todayData?.dsaProblems || 0;
  const output = Math.min(100, Math.round((problems / 5) * 100));

  // 5. Versatility (Subjects covered)
  let subjects = 0;
  if (todayData) {
    if ((todayData.pythonHours || 0) > 0) subjects++;
    if ((todayData.dsaHours || 0) > 0) subjects++;
    if ((todayData.projectHours || 0) > 0) subjects++;
    if ((todayData.col4Hours || 0) > 0) subjects++;
    if (Array.isArray(todayData.extraHours) && todayData.extraHours.some(h => (h || 0) > 0)) subjects++;
  }
  const versatility = Math.min(100, (subjects / 4) * 100);

  setTxt('radarDiscipline', `${discipline}%`);
  setTxt('radarEndurance', `${endurance}%`);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Discipline', 'Endurance', 'Focus', 'Output', 'Versatility'],
      datasets: [{
        label: 'Current Stats',
        data: [discipline, endurance, focus, output, versatility],
        backgroundColor: 'rgba(108, 135, 255, 0.2)',
        borderColor: '#6c87ff',
        borderWidth: 2,
        pointBackgroundColor: '#6c87ff',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6c87ff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: {
            color: '#94a3b8',
            font: { family: 'Tektur', size: 10 }
          },
          ticks: {
            display: false,
            stepSize: 20
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    }
  });
}
