/**
 * Handles the 'Skill Radar' chart on the routines page.
 * 
 * This shows your current levels for Discipline, Endurance, 
 * Focus, Output, and Versatility.
 */
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
  const routineCompletedCount = (appState.routines || []).filter(r => r.completed).length;
  const routineTotal = appState.routines.length || 1;
  const discipline = Math.min(100, Math.round((routineCompletedCount / routineTotal) * 100));

  // 2. Endurance (Hours %) - Target 8h = 100%
  const todayHours = todayData && Array.isArray(todayData.studyHours) 
    ? todayData.studyHours.reduce((s, n) => s + (n || 0), 0)
    : 0;
  const endurance = Math.min(100, Math.round((todayHours / 8) * 100));

  // 3. Focus (Based on consistency - placeholder logic)
  const focus = (todayHours > 0 && discipline > 50) ? 90 : (todayHours > 0 ? 60 : 20);

  // 4. Output (Problems solved) - Target 5 = 100%
  const problems = todayData?.problemsSolved || 0;
  const output = Math.min(100, Math.round((problems / 5) * 100));

  // 5. Versatility (Subjects covered)
  let subjects = 0;
  if (todayData && Array.isArray(todayData.studyHours)) {
    subjects = todayData.studyHours.filter(h => (h || 0) > 0).length;
  }
  const versatility = Math.min(100, (subjects / Math.max(1, appState.settings.columns.length)) * 100);

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
