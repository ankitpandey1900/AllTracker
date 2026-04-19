
/**
 * Zomato-Style Notification Content Engine
 * 
 * Mixes Hinglish, humor, and gentle roasting to keep users engage.
 * Standardized for Indian students.
 */

export type NotificationMood = 'roast' | 'king' | 'motivate' | 'last_chance' | 'peer_pressure';

interface NotificationMessage {
  title: string;
  body: string;
}

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

export function getDeedMessage(hours: number, hourOfDay: number): NotificationMessage {
  if (hours === 0) {
    if (hourOfDay >= 20) return getRandom(LAST_CHANCE_MESSAGES);
    return getRandom(ROAST_MESSAGES);
  }
  if (hours >= 4) return getRandom(KING_MESSAGES);
  return getRandom(MOTIVATE_MESSAGES);
}

export function getPeerPressureMessage(topUser: string, focusingUser?: string): NotificationMessage {
  const pools = [
    { title: "Oye! Jaldi aao 🏃‍♂️", body: `@${topUser} is #1 right now. Tumhe peeche nahi chhodna kya?` },
    { title: "Sharam karo thodi! 😰", body: `@${focusingUser || topUser} is studying right now. Aur aap abhi tak idle ho?` },
    { title: "Fight for Rank 1! ⚔️", body: `@${topUser} aage nikal gaya. Jaldi books kholo and claim your spot!` },
    { title: "Peeche dekho... 🕵️", body: `@${focusingUser || topUser} is chasing you! Woh padh raha hai, tum kab jaagoge?` },
    { title: "Competition is LIVE! 🔥", body: `@${focusingUser || topUser} ne countdown shuru kar diya hai. Don't let them win!` },
  ];
  return getRandom(pools);
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
