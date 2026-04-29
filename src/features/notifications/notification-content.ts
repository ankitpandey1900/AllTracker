import { QUOTES } from '../../data/quotes.data';
import { calculatePaceProjections, calculateSummaryStats } from '@/utils/calc.utils';
import { appState } from '@/state/app-state';

/**
 * Zomato-Style Notification Content Engine
 * 
 * Mixes Hinglish, humor, and gentle roasting to keep users engage.
 * Standardized for Indian students.
 */

export type NotificationMood = 'roast' | 'king' | 'motivate' | 'last_chance' | 'peer_pressure' | 'wisdom';

interface NotificationMessage {
  title: string;
  body: string;
}

const DAILY_BRIEFING_MESSAGES: NotificationMessage[] = [
  { title: "Naya Din, Nayi Jung 🌅", body: "Kal jo hua so hua. Aaj ka target set hai? The squad is waiting for you to lead." },
  { title: "Aaj Ka Mission ⚡", body: "Platform pe activity shuru ho chuki hai. Don't be the last one to log in today." },
  { title: "Wake Up, Soldier! 🪖", body: "Aaj ka din decide karega kal ka rank. Get your first session in before the others." },
  { title: "Leaderboard Reset 🔄", body: "Aaj sab equal hain. It's time to build your lead and dominate the day." },
  { title: "Aankh khuli? 👀", body: "Duniya padh ke aage nikal rahi hai. The board is waiting for your move." },
  { title: "Daily Mission Active 🎯", body: "Routine check karo aur shuru ho jao. Aaj streak break nahi honi chahiye." },
  { title: "Time to Grind ⚔️", body: "No excuses today. Your rivals are already planning their sessions." },
  { title: "Good Morning, Operative ☕", body: "Coffee peeyo aur zone mein aao. The dashboard is waiting." }
];

const ROAST_MESSAGES: NotificationMessage[] = [
  { title: "Bhai tu rehn de... 🤡", body: "Pure din mein 0 hours? Reels dekhne ke liye All Tracker install kiya tha kya?" },
  { title: "Sapne bade, kaam zero? 📚", body: "IAS banne chale the, par session empty hai. Thoda sharam karo!" },
  { title: "Books wait kar rahi hain 😤", body: "Aaj ka quota kab shuru hoga? Kal pe mat taalo, varna kal bhi yahi roast milega." },
  { title: "Dukan band karein? 🏪", body: "Activity zero hai. Nahi padhna toh bata do, hum app delete kar dete hain!" },
  { title: "Netflix hi dekh lo... 📺", body: "Padhai toh ho nahi rahi, chalo koi series hi khatam karlo. Username-password du?" },
  { title: "Ghar walo ko kya bologe? 🏠", body: "Ki 'Mummy aaj All Tracker pe roast hoke aaya hu'? Padh le bhai!" },
  { title: "Aaram haram hai! 🚫", body: "Itna aaram? Lagta hai Ambani ki agli shortlist mein aapka naam hai." },
];

const KING_MESSAGES: NotificationMessage[] = [
  { title: "Raja Ji, aap toh cha gaye! 🔥", body: "Mast padhai chal rahi hai. Maintain the streak, Soldier!" },
  { title: "Khatarnaak Momentum! 🚀", body: "Itne hours? Lagta hai aaj koi nahi rok sakta aapko. King feel!" },
  { title: "Legendary Progress! 🏆", body: "Sahi ja rahe ho. Top rank loading... Party kab hai?" },
  { title: "Focus Level: GOD! ✨", body: "Aapki consistency dekh ke humein bhi garv ho raha hai. Jhukna mat!" },
  { title: "Topper ki nishaani! 🔝", body: "History likhi ja rahi hai. Keep pushing, you are unstoppable today." },
];

const MOTIVATE_MESSAGES: NotificationMessage[] = [
  { title: "Thoda aur push karle! 💪", body: "Good start, par abhi toh party shuru hui hai. Ek session aur?" },
  { title: "Rank badh sakti hai! 📈", body: "Aapka focus sahi ja raha hai. Bas 1 ghanta aur, and you'll climb higher." },
  { title: "Kya baat hai! ✨", body: "Activity detected. Keep it flowing, break mat hone dena streak ko." },
  { title: "Bas thoda aur... 🏁", body: "Target dikh raha hai. Rukna mana hai. You are doing great!" },
];

const LAST_CHANCE_MESSAGES: NotificationMessage[] = [
  { title: "Final Call! 🚨", body: "9 PM ho gaya aur 0 hours? 30 mins padh lo, varna streak tut jayegi." },
  { title: "Bachalo apni streak! ⌛", body: "Din khatam hone wala hai. Thoda toh padh lo, varna kal pachtawa hoga." },
  { title: "Ab toh sharam karlo! 🫣", body: "Poora din nikal gaya. Kam se kam 15 minute padh lo profile bachane ke liye." },
];

export function getWisdomNotification(): NotificationMessage {
  const projections = calculatePaceProjections(appState.trackerData, appState.totalDays);
  const { paceDiff, projectedTotalDays, projectedEndDate } = projections;
  
  const endStr = projectedEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let pool = QUOTES;
  let prefix = "";
  let title = "Titan Wisdom ⚡";

  if (paceDiff < -0.05) {
    // ROAST MODE
    pool = QUOTES.filter(q => q.category === 'behavior' || q.category === 'SAVAGE_WISDOM');
    title = "Reality Check! 💀";
    prefix = `Pace is slow. Projection: Finish in ${projectedTotalDays} days (${endStr}). `;
  } else if (paceDiff > 0.10) {
    // KING MODE
    pool = QUOTES.filter(q => q.category === 'future' || q.category === 'THE_CRAFT');
    title = "Elite Momentum 👑";
    prefix = `Legendary pace! Projected finish: ${endStr}. `;
  } else {
    // STEADY
    pool = QUOTES.filter(q => q.category === 'EXECUTION' || q.category === 'THE_CRAFT');
    title = "Stay Disciplined ⚔️";
    prefix = `On track. Expected finish: ${endStr}. `;
  }

  const quote = (() => {
    // 🔱 STRATEGIC INJECTION: 15% chance to pick a Bhagavad Gita quote regardless of pace
    if (Math.random() < 0.15) {
      const gitaPool = QUOTES.filter(q => q.a.includes('Bhagavad Gita') || q.a.includes('Lord Krishna'));
      if (gitaPool.length > 0) {
        title = "Sacred Wisdom 🔱";
        return gitaPool[Math.floor(Math.random() * gitaPool.length)];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  })();

  const author = (quote.a === 'Unknown' || quote.a === 'Aap Ka Shubh Chintak' || !quote.a) ? 'All Tracker' : quote.a;

  return {
    title,
    body: `${prefix} "${quote.t}" — ${author}`
  };
}

export function getDeedMessage(hours: number, hourOfDay: number): NotificationMessage {
  if (hours === 0) {
    if (hourOfDay >= 20) return getRandom(LAST_CHANCE_MESSAGES);
    return getRandom(ROAST_MESSAGES);
  }
  if (hours >= 4) return getRandom(KING_MESSAGES);
  return getRandom(MOTIVATE_MESSAGES);
}

export function getPeerPressureMessage(topUser: string, focusingUser: string | undefined, myName: string): NotificationMessage {
  if (topUser === myName) {
    return { 
      title: "King's Throne under threat! 👑", 
      body: focusingUser 
        ? `@${focusingUser} is studying right now! Maintain your lead or lose the crown.`
        : "The squad is logging hours. Don't get too comfortable at the top!" 
    };
  }

  if (focusingUser && focusingUser !== myName) {
    return {
      title: "Peeche dekho... 🕵️",
      body: `@${focusingUser} is chasing you! Woh padh raha hai, tum kab jaagoge?`
    };
  }

  const pools = [
    { title: "Oye! Jaldi aao 🏃‍♂️", body: `@${topUser} is #1 right now. Tumhe peeche nahi chhodna kya?` },
    { title: "Sharam karo thodi! 😰", body: `@${topUser} is leading the board. Aur aap abhi tak idle ho?` },
    { title: "Fight for Rank 1! ⚔️", body: `@${topUser} aage nikal gaya. Jaldi books kholo and claim your spot!` },
  ];
  return getRandom(pools);
}

export function getDailyBriefingMessage(): NotificationMessage {
  return getRandom(DAILY_BRIEFING_MESSAGES);
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
