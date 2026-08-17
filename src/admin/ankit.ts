import { authClient } from "../lib/auth-client";

let usersData: any[] = [];

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
    usersData = data.users || [];

    status.style.display = "none";
    const adminUi = document.getElementById("admin-ui");
    if (adminUi) adminUi.style.display = "block";

    // 1. Calculate Aggregate Stats
    let totalHrs = 0;
    let todayHrs = 0;
    let activeSessions = 0;

    usersData.forEach((u: any) => {
      totalHrs += Number(u.total_hours || 0);
      todayHrs += Number(u.today_hours || 0);
      
      if (u.is_focusing) {
        activeSessions++;
      }
    });

    const statUsers = document.getElementById("stat-users");
    const statSessions = document.getElementById("stat-sessions");
    const statTotalHrs = document.getElementById("stat-total-hrs");
    const statTodayHrs = document.getElementById("stat-today-hrs");

    if (statUsers) statUsers.textContent = usersData.length.toString();
    if (statSessions) statSessions.textContent = activeSessions.toString();
    if (statTotalHrs) statTotalHrs.textContent = totalHrs.toFixed(1) + " hrs";
    if (statTodayHrs) statTodayHrs.textContent = todayHrs.toFixed(1) + " hrs";

    // 2. Build Leaderboard (Top 3 by total hours)
    const sortedUsers = [...usersData].sort((a: any, b: any) => Number(b.total_hours || 0) - Number(a.total_hours || 0));
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
    
    const getRankColor = (rank: string) => {
      const r = rank ? rank.toUpperCase() : "";
      if (r.includes("LEGEND")) return "#f43f5e";
      if (r.includes("GRANDMASTER")) return "#a855f7";
      if (r.includes("MASTER")) return "#ef4444";
      if (r.includes("DIAMOND")) return "#0ea5e9";
      if (r.includes("PLATINUM")) return "#10b981";
      if (r.includes("GOLD")) return "#eab308";
      if (r.includes("SILVER")) return "#94a3b8";
      if (r.includes("BRONZE")) return "#d97706";
      return "#64748b"; 
    };

    usersData.forEach((u: any) => {
      const daysInactive = Math.floor((Date.now() - new Date(u.last_active).getTime()) / (1000 * 60 * 60 * 24));
      const rankDisplay = u.rank ? u.rank.split(' ')[0] : 'Unranked';
      const rankColor = getRankColor(rankDisplay);
      const roundedTotalHrs = Number(u.total_hours || 0).toFixed(1);
      const rounded7DayHrs = Number(u.last_7_days_hours || 0).toFixed(1);
      const joinedDate = new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      
      const isSuspicious = (u.integrity_score || 100) < 50;

      const tr = document.createElement("tr");
      if (isSuspicious) tr.classList.add('row-suspicious');
      tr.style.cursor = "pointer";
      
      // Make the row open the Drill-down modal
      tr.addEventListener('click', (e) => {
        // Prevent if clicking on an action button
        if ((e.target as HTMLElement).closest('.action-group')) return;
        openUserDetails(u);
      });

      tr.innerHTML = `
        <td>
          <div class="user-ident">
            <span class="username">${u.username} ${isSuspicious ? '<span style="color:var(--danger); font-size: 0.75rem;">[SUSPICIOUS]</span>' : ''}</span>
            <span class="email">${u.email}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
            <span class="table-pill" style="color: ${rankColor}; border-color: ${rankColor}40; background: ${rankColor}15; text-shadow: 0 0 10px ${rankColor}80;">
              ${rankDisplay}
            </span>
            <span style="font-size: 0.8rem; font-weight: 600; color: #f97316; display: flex; align-items: center; gap: 4px;">
              🔥 ${u.current_streak || 0} Streak
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
      const statDbPush = document.getElementById("stat-db-push");
      const statDbVault = document.getElementById("stat-db-vault");
      const statDbMaamu = document.getElementById("stat-db-maamu");
      
      if (statDbSessions) statDbSessions.textContent = stats.totalStudySessions.toLocaleString();
      if (statDbTasks) statDbTasks.textContent = stats.totalTasks.toLocaleString();
      if (statDbFeed) statDbFeed.textContent = stats.totalFeedPosts.toLocaleString();
      if (statDbBadges) statDbBadges.textContent = stats.totalBadges.toLocaleString();
      if (statDbPush) statDbPush.textContent = (stats.totalPushSubs || 0).toLocaleString();
      if (statDbVault) statDbVault.textContent = (stats.totalVaultDocs || 0).toLocaleString();
      if (statDbMaamu) statDbMaamu.textContent = (stats.totalMaamuMessages || 0).toLocaleString();
    }
  } catch (err) {
    status.textContent = "Error connecting to server.";
  }
}

// ---- Tabs Logic ----
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const target = e.currentTarget as HTMLElement;
    target.classList.add('active');
    document.getElementById(target.getAttribute('data-target') || '')?.classList.add('active');

    if (target.getAttribute('data-target') === 'tab-maamu') {
      fetchMaamuUsage();
    }
  });
});


// ---- Maamu Insights Logic ----
async function fetchMaamuUsage() {
  const tbody = document.getElementById("maamu-tbody");
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading AI usage...</td></tr>';
  
  try {
    const res = await fetch("/api/app/ankit/maamu-usage");
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    const usage = data.usage || [];
    
    tbody.innerHTML = "";
    if (usage.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No AI usage recorded yet.</td></tr>';
      return;
    }

    usage.forEach((u: any) => {
      const lastUsed = new Date(u.last_used).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="user-ident">
            <span class="username">${u.username}</span>
            <span class="email">${u.email}</span>
          </div>
        </td>
        <td><strong style="color:var(--fuchsia); font-size:1.1rem;">${u.total_conversations}</strong></td>
        <td><strong style="color:var(--primary); font-size:1.1rem;">${u.total_messages}</strong></td>
        <td><span style="color: var(--muted);">${lastUsed}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewMaamuChats('${u.profile_id}', '${u.username}')">View Transcripts</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger);">Error loading usage data.</td></tr>';
  }
}

// @ts-ignore
window.viewMaamuChats = async (profileId: string, username: string) => {
  const modal = document.getElementById('chat-viewer-modal');
  const content = document.getElementById('chat-viewer-content');
  if (!modal || !content) return;
  
  modal.style.display = 'flex';
  content.innerHTML = '<div class="loader">Fetching...</div>';
  
  try {
    const res = await fetch(`/api/app/ankit/maamu-chats?profileId=${profileId}`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    
    content.innerHTML = "";
    if (data.conversations.length === 0) {
      content.innerHTML = "<div>No chats found.</div>";
      return;
    }

    data.conversations.forEach((conv: any) => {
      const convDiv = document.createElement('div');
      convDiv.style.background = 'rgba(0,0,0,0.2)';
      convDiv.style.borderRadius = '12px';
      convDiv.style.padding = '1.5rem';
      convDiv.style.border = '1px solid var(--border)';
      
      let msgsHtml = conv.messages.map((m: any) => {
        // @ts-ignore
        const parsedContent = window.marked ? window.marked.parse(m.content) : m.content;
        return `<div class="chat-bubble ${m.role}">${parsedContent}</div>`;
      }).join('');
      
      convDiv.innerHTML = `
        <h4 style="margin:0 0 1rem 0; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem;">
          ${conv.title}
        </h4>
        <div style="display:flex; flex-direction:column;">${msgsHtml}</div>
      `;
      content.appendChild(convDiv);
    });
  } catch(e) {
    content.innerHTML = '<div style="color:var(--danger);">Error fetching transcripts.</div>';
  }
};

document.getElementById('chat-viewer-close-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('chat-viewer-modal');
  if (modal) modal.style.display = 'none';
});

// ---- User Drill-down Modal ----
function openUserDetails(u: any) {
  const modal = document.getElementById('user-details-modal');
  if (!modal) return;
  
  document.getElementById('ud-title')!.textContent = `Audit: ${u.username}`;
  
  const score = Number(u.integrity_score || 100);
  const scoreEl = document.getElementById('ud-integrity')!;
  scoreEl.textContent = `${score}%`;
  scoreEl.style.color = score < 50 ? 'var(--danger)' : 'var(--emerald)';
  
  document.getElementById('ud-focus-subject')!.textContent = u.focus_subject || "Not focusing";
  
  // Set up wipe button
  const wipeBtn = document.getElementById('ud-reset-btn');
  wipeBtn!.onclick = async () => {
    if (!confirm(`Are you sure you want to WIPE all hours for ${u.username}? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/app/ankit/wipe-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: u.profile_id })
      });
      if (res.ok) {
        alert("User stats wiped successfully.");
        modal.style.display = 'none';
        fetchUsers();
      } else {
        alert("Failed to wipe stats.");
      }
    } catch(e) {
      alert("Error wiping stats.");
    }
  };
  
  modal.style.display = 'flex';
}

document.getElementById('ud-close-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('user-details-modal');
  if (modal) modal.style.display = 'none';
});


// ---- Global Broadcast Logic ----
const broadcastModal = document.getElementById('broadcast-modal');
document.getElementById('broadcast-btn')?.addEventListener('click', () => {
  if (broadcastModal) broadcastModal.style.display = 'flex';
});

document.getElementById('broadcast-cancel-btn')?.addEventListener('click', () => {
  if (broadcastModal) broadcastModal.style.display = 'none';
});

document.getElementById('broadcast-send-btn')?.addEventListener('click', async () => {
  const titleEl = document.getElementById('broadcast-title-input') as HTMLInputElement;
  const msgEl = document.getElementById('broadcast-msg-input') as HTMLTextAreaElement;
  const btn = document.getElementById('broadcast-send-btn') as HTMLButtonElement;
  
  if (!titleEl.value || !msgEl.value) {
    alert("Please enter a title and message.");
    return;
  }
  if (!confirm("Are you SURE you want to ping EVERY user?")) return;
  
  btn.disabled = true;
  btn.textContent = "Broadcasting...";
  
  try {
    const response = await fetch("/api/app/ankit/broadcast-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleEl.value, message: msgEl.value })
    });
    
    if (response.ok) {
      const resData = await response.json();
      alert(`Broadcast sent to ${resData.sent} devices!`);
      if (broadcastModal) broadcastModal.style.display = 'none';
      titleEl.value = '';
      msgEl.value = '';
    } else {
      alert("Broadcast failed.");
    }
  } catch(e) {
    alert("Error executing broadcast.");
  }
  btn.disabled = false;
  btn.textContent = "Send to All";
});


// ---- Existing Logic (Roast/Push) ----
let currentTargetProfileId: string | null = null;
let currentTargetBtn: HTMLButtonElement | null = null;

const emailModal = document.getElementById("email-modal");
const cancelEmailBtn = document.getElementById("modal-cancel-btn");
const sendEmailBtn = document.getElementById("modal-send-btn");

if (cancelEmailBtn && emailModal) {
  cancelEmailBtn.addEventListener("click", () => {
    emailModal.style.display = "none";
    currentTargetProfileId = null;
    currentTargetBtn = null;
  });
}

if (sendEmailBtn && emailModal) {
  sendEmailBtn.addEventListener("click", async () => {
    const input = document.getElementById("custom-msg-input") as HTMLTextAreaElement;
    const subjectInput = document.getElementById("custom-subject-input") as HTMLInputElement;
    const customMessage = input ? input.value : "";
    const customSubject = subjectInput ? subjectInput.value : "";
    
    if (!currentTargetProfileId || !currentTargetBtn) return;
    
    const profileId = currentTargetProfileId;
    const btn = currentTargetBtn;

    emailModal.style.display = "none";
    if (input) input.value = "";
    if (subjectInput) subjectInput.value = "";
    currentTargetProfileId = null;
    currentTargetBtn = null;

    btn.disabled = true;
    btn.textContent = "Sending...";
    
    try {
      const response = await fetch("/api/app/ankit/send-roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, custom_message: customMessage, custom_subject: customSubject })
      });

      if (response.ok) {
        btn.textContent = "Sent!";
        btn.style.background = "var(--primary)";
        btn.style.color = "white";
        setTimeout(() => {
          btn.textContent = "Roast";
          btn.style.background = "rgba(239,68,68,0.15)";
          btn.style.color = "";
          btn.disabled = false;
        }, 3000);
      } else {
        const err = await response.json();
        btn.textContent = "Failed";
        btn.style.background = "var(--danger)";
        alert("Error: " + err.error);
        setTimeout(() => {
          btn.textContent = "Roast";
          btn.style.background = "rgba(239,68,68,0.15)";
          btn.disabled = false;
        }, 3000);
      }
    } catch (e) {
      btn.textContent = "Error";
      btn.style.background = "var(--danger)";
      setTimeout(() => {
        btn.textContent = "Roast";
        btn.style.background = "rgba(239,68,68,0.15)";
        btn.disabled = false;
      }, 3000);
    }
  });
}

// @ts-ignore
window.sendTargetedRoast = async (profileId: string, btn: HTMLButtonElement) => {
  if (emailModal) {
    currentTargetProfileId = profileId;
    currentTargetBtn = btn;
    emailModal.style.display = "flex";
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

// ---- Nuke Action ----
document.getElementById("nuke-btn")?.addEventListener("click", async (e) => {
  const btn = e.target as HTMLButtonElement;
  
  if (!confirm("⚠️ Are you absolutely sure you want to NUKE inactive users? This will instantly bypass Vercel Cron and send roasts to everyone who qualifies.")) return;
  
  btn.disabled = true;
  btn.textContent = "Nuking... ☢️";

  try {
    const res = await fetch("/api/app/ankit/nuke", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`Nuke detonated successfully! ${data.notifiedCount} users got roasted.`);
    } else {
      alert("Nuke failed to launch.");
    }
  } catch (err) {
    alert("Error launching nuke.");
  }
  
  btn.textContent = "🔥 Nuke Inactive Users";
  btn.disabled = false;
});

fetchUsers();
