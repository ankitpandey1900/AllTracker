export interface RoastStats {
  current_streak: number;
  total_hours: number;
  last_7_days_hours: number;
  rank: string;
  integrity_score: number;
  days_inactive: number;
}

export interface RoastResult {
  roastBody: string;
  dynamicSubject: string;
}

function getRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoast(stats: RoastStats): RoastResult {
  const { current_streak, total_hours, last_7_days_hours, rank, integrity_score, days_inactive } = stats;
  
  const roundedTotalHrs = Number(total_hours || 0).toFixed(1);
  const rounded7DayHrs = Number(last_7_days_hours || 0).toFixed(1);

  // 10. Nuclear / Rare Roast (5% chance if they are doing terribly)
  if (current_streak === 0 && total_hours < 20 && days_inactive > 14 && Math.random() < 0.05) {
    return {
      roastBody: getRandom([
        "Itne reminders ke baad bhi kuch nahi badla. Bhai problem motivation ki nahi hai. Tu bas discipline-less chutiya ban ke baitha hai.",
        "System tujhe baar-baar track kar raha hai. Har baar same shit. At this point tera biggest achievement consistency nahi, inconsistency maintain karna hai.",
        "Tere stats dekh ke ek cheez clear hai: potential waste karne mein tu genuinely consistent hai.",
        "Padhai karne ke liye app bana diya, timer de diya, stats de diye, rank de di. Ab aur kya chahiye? Maa-baap ko server pe bithayein kya?"
      ]),
      dynamicSubject: "system warning: stop wasting your potential ⚠️"
    };
  }

  // 4. Integrity Score < 50
  if (integrity_score < 50) {
    return {
      roastBody: getRandom([
        `Integrity: ${integrity_score}. Hours fake karne se tu smart nahi lag raha. Bas chutiya ban raha hai — khud ko.`,
        `${integrity_score} integrity. Timer chalaya, padhai nahi ki. System ko chuna laga diya toh kya achievement unlock ho gayi?`,
        `Integrity ${integrity_score}. Khud ke future ke saath fraud karke leaderboard pe hero ban raha hai. Wah.`,
        `Fake hours daal ke khud ko convince kar raha hai ki grind kar raha hai. Bhai, itni self-deception se exam nahi niklega.`
      ]),
      dynamicSubject: "we see you faking those hours 👀 stop playing"
    };
  }

  // 7. Long inactivity
  if (days_inactive >= 7) {
    return {
      roastBody: getRandom([
        `${days_inactive} days se inactive. Padhai chhod di ya bas apne future ki maa-behen ek karne ka plan hai?`,
        `${days_inactive} din gayab. Ye break nahi hai bhai, ye academic suicide ka slow version hai.`,
        `Last session ${days_inactive} days ago. Syllabus tera wait nahi kar raha. Tu bas apni gand pe baitha hai.`
      ]),
      dynamicSubject: `u alive? ${days_inactive} days of nothing 💀`
    };
  }

  // 5. Studying well, then suddenly stopped (Good total hours, but 0 in last week)
  if (total_hours > 30 && Number(last_7_days_hours) < 2) {
    return {
      roastBody: getRandom([
        `${roundedTotalHrs} hrs karke achanak ruk gaya. Kya hua? Gand phat gayi consistency maintain karne mein?`,
        `Itna grind karke beech mein gayab. Momentum mila aur tune khud hi maa chuda di.`,
        `${roundedTotalHrs} hrs complete. Phir disappear. Tu progress se zyada apni inconsistency ko maintain karta hai.`,
        `Ek baar laga banda serious hai. Phir usual bakchodi start. Wapas padhai pe aa.`
      ]),
      dynamicSubject: "momentum lost 📉 wtf happened?"
    };
  }

  // 8. Good total hours, terrible consistency (Good total hours, low 7 day hours)
  if (total_hours > 50 && Number(last_7_days_hours) >= 2 && Number(last_7_days_hours) < 10) {
    return {
      roastBody: getRandom([
        `${roundedTotalHrs} hrs total. Number dekh ke impressive lagta hai. Daily consistency dekh ke pura illusion toot jaata hai.`,
        `Kabhi 8 ghante, phir 3 din zero. Ye discipline nahi, random bakchodi hai.`,
        `Potential hai. Hours bhi hain. Bas consistency har baar maa chudwa deti hai.`
      ]),
      dynamicSubject: "your consistency is a joke right now 🤡"
    };
  }

  // 6. Very low daily study time (7 days average is very low)
  if (Number(last_7_days_hours) > 0 && Number(last_7_days_hours) < 5 && days_inactive < 7) {
    return {
      roastBody: getRandom([
        `Pichle 7 din mein sirf ${rounded7DayHrs} hrs. Isko study session bol raha hai? Bhai ye toh attendance lagana hua.`,
        `${rounded7DayHrs} hrs in a week. Itna toh laptop kholne mein bhi warm-up ho gaya hoga.`,
        `Weekly ${rounded7DayHrs} hrs. Agar padhna nahi hai toh timer band kar. Fake productivity ka drama dekh ke server bhi thak gaya.`
      ]),
      dynamicSubject: "fake productivity much? 🤨"
    };
  }

  // 1. Streak = 0
  if (current_streak === 0 && total_hours >= 10) {
    return {
      roastBody: getRandom([
        "Streak: 0. Ek fucking din consistently nahi padh sakta? Phir result kharab aaye toh system ko blame mat karna.",
        "0 streak. Padhai se itni gaand phat rahi hai kya ki ek din bhi discipline maintain nahi hota?",
        "Streak 0. Bhai tu student hai ya professional procrastinator? Har din bas kal se start karna hai.",
        "Ek din bhi continuity nahi. Aise hi chalta raha toh degree se pehle excuses mein PhD ho jayegi."
      ]),
      dynamicSubject: "bruh, your streak is literally 0 🤡 time to lock in"
    };
  }

  // 2. Total study time < 10 hours
  if (total_hours < 10) {
    return {
      roastBody: getRandom([
        `Sirf ${roundedTotalHrs} hrs? Ye padhai nahi hai, ye bas timer ke saath bakchodi hai.`,
        `${roundedTotalHrs} hours total. Itna time toh tu reels scroll karke bina realize kiye uda deta hai. Ab padhai mein bhi wahi kar raha hai.`,
        `Total ${roundedTotalHrs} hrs. Bhai seriously? Syllabus tera wait kar raha hai aur tu apni maa chudwane mein busy hai.`,
        `${roundedTotalHrs} hrs. Is speed pe tera syllabus complete nahi hoga, bas semester khatam ho jayega.`
      ]),
      dynamicSubject: `you're slacking bestie 😔 only ${roundedTotalHrs} hours?`
    };
  }

  // 3. Still IRON rank
  if (rank && rank.includes('IRON') && total_hours >= 10) {
    return {
      roastBody: getRandom([
        "Abhi bhi IRON? Gand laga rakhi hai kya grind ke naam pe?",
        "IRON rank mein itna time? Bhai tu climb nahi kar raha, neeche permanent address bana ke baitha hai.",
        "Still IRON. BGMI ka random noob bhi itne time mein rank push kar leta. Tu padhai mein bhi beginner mode se bahar nahi aa raha.",
        "IRON. Itni buri consistency ke baad bhi rank badhne ki expectation rakhna alag level ki delusion hai."
      ]),
      dynamicSubject: "still stuck in iron rank? embarrassing 💀"
    };
  }

  // 9. Generic fallback
  return {
    roastBody: getRandom([
      "Stats dekh liye. Problem ye nahi ki tu kar nahi sakta. Problem ye hai ki jab kaam karne ka time aata hai, tu chutiya banne lagta hai.",
      "Tera biggest enemy syllabus nahi hai. Tu khud hai — aur unfortunately tu roz jeet raha hai.",
      "Excuses ka output solid hai. Padhai ka thoda improve kar le.",
      "Bhai seedhi baat: ya toh genuinely grind kar, ya timer band kar. Ye half-assed bakchodi kisi ko fool nahi kar rahi."
    ]),
    dynamicSubject: "reality check from all tracker 🎯"
  };
}
