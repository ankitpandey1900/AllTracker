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
        <div style="flex: 1; background: #27272a; padding: 1rem; border-radius: 8px; border-top: 4px solid ${colors[i]}; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${medals[i]}</div>
          <div style="font-weight: bold; font-size: 1.1rem; color: #fff;">${u.username}</div>
          <div style="color: ${colors[i]}; font-weight: bold; margin-top: 0.5rem;">${Number(u.total_hours || 0).toFixed(1)} hrs</div>
        </div>
      `).join("");
    }

    // 3. Render Table
    tbody.innerHTML = "";
    users.forEach((u: any) => {
      const daysInactive = Math.floor((Date.now() - new Date(u.last_active).getTime()) / (1000 * 60 * 60 * 24));
      
      const rankDisplay = u.rank ? u.rank.split(' ')[0] : 'Unranked';
      const roundedTotalHrs = Number(u.total_hours || 0).toFixed(1);
      const rounded7DayHrs = Number(u.last_7_days_hours || 0).toFixed(1);
      
      // Format created_at date
      const joinedDate = new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${u.username}</strong><br/>
          <span style="color: #a1a1aa; font-size: 0.9em;">${u.email}</span>
        </td>
        <td>
          <span style="color: #fbbf24; font-weight: bold;">${rankDisplay}</span><br/>
          🔥 ${u.current_streak} streak
        </td>
        <td>
          <strong>${roundedTotalHrs} hrs</strong> total<br/>
          <span style="color: #a1a1aa; font-size: 0.9em;">${rounded7DayHrs} hrs (7d)</span>
        </td>
        <td>
          ${daysInactive} days ago<br/>
          <span style="font-size: 0.8em; color: ${u.last_reengagement_sent_at ? '#10b981' : '#a1a1aa'}">
            ${u.last_reengagement_sent_at ? 'Roasted' : 'Not Roasted'}
          </span>
        </td>
        <td>
          ${joinedDate}
        </td>
        <td>
          <button class="btn" onclick="sendTargetedRoast('${u.profile_id}', this)">Send Roast</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
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
    if (!currentTargetProfileId || !currentTargetBtn) return;
    
    const customMessage = input.value;
    const profileId = currentTargetProfileId;
    const btn = currentTargetBtn;

    // Close modal
    modal.style.display = "none";
    input.value = "";
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
        body: JSON.stringify({ profile_id: profileId, custom_message: customMessage })
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

document.getElementById("nuke-btn")?.addEventListener("click", async (e) => {
  const btn = e.target as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Launching automated roasts...";

  alert("For security reasons, full-scale automated cron jobs must be triggered from the Vercel Dashboard or wait for 12:00 PM. Use the Targeted Roast buttons for individual users.");
  btn.textContent = "🔥 Nuke: Send All Pending Roasts";
  btn.disabled = false;
});

fetchUsers();
