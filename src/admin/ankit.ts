import { authClient } from "../lib/auth-client";

async function fetchUsers() {
  const status = document.getElementById("status");
  const table = document.getElementById("user-table");
  const tbody = document.getElementById("user-tbody");
  
  if (!status || !table || !tbody) return;

  try {
    let sessionRes = null;
    try {
      sessionRes = await authClient.getSession();
    } catch (e) {
      console.error("Session check failed:", e);
    }
    
    if (!sessionRes || !sessionRes.data || !sessionRes.data.session) {
      status.textContent = "Jaldi wahan se hato! 📢";
      return;
    }

    const response = await fetch("/api/app/ankit/users");
    const dbStatsResponse = await fetch("/api/app/ankit/db-stats");

    if (!response.ok) {
      const err = await response.json();
      status.textContent = `Error: ${err.error || "Failed to fetch users"}`;
      return;
    }

    const data = await response.json();
    const users = data.users || [];

    status.style.display = "none";
    const adminUi = document.getElementById("admin-ui");
    if (adminUi) adminUi.style.display = "block";

    // 1. Calculate Aggregate Stats
    let totalHrs = 0;
    let todayHrs = 0;
    let activeSessions = 0;

    users.forEach((u: any) => {
      totalHrs += Number(u.total_hours || 0);
      todayHrs += Number(u.today_hours || 0);
      
      // Calculate if they are "active right now" (within last 30 minutes)
      const msSinceActive = Date.now() - new Date(u.last_active).getTime();
      if (msSinceActive < 1000 * 60 * 30) {
        activeSessions++;
      }
    });

    const statUsers = document.getElementById("stat-users");
    const statSessions = document.getElementById("stat-sessions");
    const statTotalHrs = document.getElementById("stat-total-hrs");
    const statTodayHrs = document.getElementById("stat-today-hrs");

    if (statUsers) statUsers.textContent = users.length.toString();
    if (statSessions) statSessions.textContent = activeSessions.toString();
    if (statTotalHrs) statTotalHrs.textContent = totalHrs.toFixed(1) + " hrs";
    if (statTodayHrs) statTodayHrs.textContent = todayHrs.toFixed(1) + " hrs";

    // 2. Build Leaderboard (Top 3 by total hours)
    const sortedUsers = [...users].sort((a: any, b: any) => Number(b.total_hours || 0) - Number(a.total_hours || 0));
    const top3 = sortedUsers.slice(0, 3);
    const leaderboard = document.getElementById("leaderboard");
    if (leaderboard) {
      const medals = ["🥇", "🥈", "🥉"];
      const colors = ["#fbbf24", "#94a3b8", "#b45309"];
      leaderboard.innerHTML = top3.map((u, i) => `
        <div class="stat-card" style="flex: 1; text-align: center; --accent-color: ${colors[i]}; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 10px ${colors[i]}80);">${medals[i]}</div>
          <div style="font-weight: 700; font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem;">${u.username}</div>
          <div style="color: ${colors[i]}; font-weight: 800; font-size: 1.1rem; letter-spacing: 0.5px;">${Number(u.total_hours || 0).toFixed(1)} hrs</div>
        </div>
      `).join("");
    }

    // 3. Render Table
    tbody.innerHTML = "";
    
    // Rank Color Helper
    const getRankColor = (rank: string) => {
      const r = rank.toUpperCase();
      if (r.includes("LEGEND")) return "#f43f5e";
      if (r.includes("GRANDMASTER")) return "#a855f7";
      if (r.includes("MASTER")) return "#ef4444";
      if (r.includes("DIAMOND")) return "#0ea5e9";
      if (r.includes("PLATINUM")) return "#10b981";
      if (r.includes("GOLD")) return "#eab308";
      if (r.includes("SILVER")) return "#94a3b8";
      if (r.includes("BRONZE")) return "#d97706";
      return "#64748b"; // default recruit/unranked
    };

    users.forEach((u: any) => {
      const daysInactive = Math.floor((Date.now() - new Date(u.last_active).getTime()) / (1000 * 60 * 60 * 24));
      
      const rankDisplay = u.rank ? u.rank.split(' ')[0] : 'Unranked';
      const rankColor = getRankColor(rankDisplay);
      
      const roundedTotalHrs = Number(u.total_hours || 0).toFixed(1);
      const rounded7DayHrs = Number(u.last_7_days_hours || 0).toFixed(1);
      
      // Format created_at date
      const joinedDate = new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="user-ident">
            <span class="username">${u.username}</span>
            <span class="email">${u.email}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
            <span class="table-pill" style="color: ${rankColor}; border-color: ${rankColor}40; background: ${rankColor}15; text-shadow: 0 0 10px ${rankColor}80;">
              ${rankDisplay}
            </span>
            <span style="font-size: 0.8rem; font-weight: 600; color: #f97316; display: flex; align-items: center; gap: 4px;">
              🔥 ${u.current_streak} Streak
            </span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <strong style="color: #f8fafc;">${roundedTotalHrs} hrs <span style="font-weight: normal; color: #94a3b8; font-size: 0.8rem;">total</span></strong>
            <span style="color: #38bdf8; font-size: 0.8rem; font-weight: 600;">${rounded7DayHrs} hrs (7d)</span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="color: ${daysInactive > 7 ? '#ef4444' : '#f8fafc'}; font-weight: 600;">${daysInactive} days ago</span>
            <span style="font-size: 0.75rem; font-weight: 600; color: ${u.last_reengagement_sent_at ? '#10b981' : '#64748b'};">
              ${u.last_reengagement_sent_at ? '✓ Roasted' : '• Not Roasted'}
            </span>
          </div>
        </td>
        <td>
          <span style="color: #cbd5e1; font-size: 0.85rem;">${joinedDate}</span>
        </td>
        <td>
          <div class="action-group">
            <button class="btn btn-sm btn-nuke" style="background: rgba(239,68,68,0.15);" onclick="sendTargetedRoast('${u.profile_id}', this)">Roast</button>
            <button class="btn btn-sm btn-primary" style="background: rgba(56,189,248,0.15);" onclick="sendTargetedPush('${u.profile_id}')">Push</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (dbStatsResponse.ok) {
      const dbStatsData = await dbStatsResponse.json();
      const stats = dbStatsData.stats;
      
      const statDbSessions = document.getElementById("stat-db-sessions");
      const statDbTasks = document.getElementById("stat-db-tasks");
      const statDbFeed = document.getElementById("stat-db-feed");
      const statDbBadges = document.getElementById("stat-db-badges");
      
      if (statDbSessions) statDbSessions.textContent = stats.totalStudySessions.toLocaleString();
      if (statDbTasks) statDbTasks.textContent = stats.totalTasks.toLocaleString();
      if (statDbFeed) statDbFeed.textContent = stats.totalFeedPosts.toLocaleString();
      if (statDbBadges) statDbBadges.textContent = stats.totalBadges.toLocaleString();
    }
  } catch (err) {
    status.textContent = "Error connecting to server.";
  }
}

// Modal Logic
let currentTargetProfileId: string | null = null;
let currentTargetBtn: HTMLButtonElement | null = null;

const modal = document.getElementById("email-modal");
const cancelBtn = document.getElementById("modal-cancel-btn");
const sendBtn = document.getElementById("modal-send-btn");
const input = document.getElementById("custom-msg-input") as HTMLTextAreaElement;

if (cancelBtn && modal && input) {
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    input.value = "";
    currentTargetProfileId = null;
    currentTargetBtn = null;
  });
}

if (sendBtn && modal && input) {
  sendBtn.addEventListener("click", async () => {
    const input = document.getElementById("custom-msg-input") as HTMLTextAreaElement;
    const subjectInput = document.getElementById("custom-subject-input") as HTMLInputElement;
    const customMessage = input ? input.value : "";
    const customSubject = subjectInput ? subjectInput.value : "";
    
    if (!currentTargetProfileId || !currentTargetBtn) return;
    
    const profileId = currentTargetProfileId;
    const btn = currentTargetBtn;

    // Close modal
    modal.style.display = "none";
    if (input) input.value = "";
    if (subjectInput) subjectInput.value = "";
    currentTargetProfileId = null;
    currentTargetBtn = null;

    btn.disabled = true;
    btn.textContent = "Sending...";
    
    try {
      const response = await fetch("/api/app/ankit/send-roast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profile_id: profileId, custom_message: customMessage, custom_subject: customSubject })
      });

      if (response.ok) {
        btn.textContent = "Sent!";
        btn.style.background = "var(--primary)";
        btn.style.color = "white";
        setTimeout(() => {
          btn.textContent = "Send Roast";
          btn.style.background = "";
          btn.style.color = "";
          btn.disabled = false;
        }, 3000);
      } else {
        const err = await response.json();
        btn.textContent = "Failed";
        btn.style.background = "var(--danger)";
        alert("Error: " + err.error);
        setTimeout(() => {
          btn.textContent = "Send Roast";
          btn.style.background = "";
          btn.disabled = false;
        }, 3000);
      }
    } catch (e) {
      btn.textContent = "Error";
      btn.style.background = "var(--danger)";
      setTimeout(() => {
        btn.textContent = "Send Roast";
        btn.style.background = "";
        btn.disabled = false;
      }, 3000);
    }
  });
}

// @ts-ignore
window.sendTargetedRoast = async (profileId: string, btn: HTMLButtonElement) => {
  if (modal) {
    currentTargetProfileId = profileId;
    currentTargetBtn = btn;
    modal.style.display = "flex";
    if (input) input.focus();
  }
}

// @ts-ignore
window.sendTargetedPush = async (profileId: string) => {
  const title = window.prompt('Push title:', 'Maamu: reality check');
  if (title === null) return;
  const message = window.prompt('Push message:');
  if (!message?.trim()) return;
  const response = await fetch('/api/app/ankit/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, title, message }),
  });
  const result = await response.json();
  if (!response.ok) return alert(`Push failed: ${result.error || 'Unknown error'}`);
  alert(result.sent > 0 ? `Push sent to ${result.sent} device(s).` : 'No active push subscription found for this user.');
}

document.getElementById("nuke-btn")?.addEventListener("click", async (e) => {
  const btn = e.target as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Launching automated roasts...";

  alert("For security reasons, full-scale automated cron jobs must be triggered from the Vercel Dashboard or wait for 12:00 PM. Use the Targeted Roast buttons for individual users.");
  btn.textContent = "🔥 Nuke: Send All Pending Roasts";
  btn.disabled = false;
});

fetchUsers();
