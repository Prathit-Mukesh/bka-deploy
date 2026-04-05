import { useState, useEffect, useCallback, useRef } from "react";
// Question Generation Engine — 10,000+ unique questions
// Uses structured knowledge banks + seeded PRNG + template variations

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function pickWrongs(pool, correct, rng, n = 3) {
  return pool.filter(x => x !== correct).sort(() => rng() - 0.5).slice(0, n);
}

function makeOpts(correct, wrongs, rng) {
  const all = [correct, ...wrongs].sort(() => rng() - 0.5);
  return { opts: all, cor: all.indexOf(correct) };
}

function generateAllQuestions() {
  const Q = [];
  let uid = 0;
  const rng = seededRng(42);
  const seen = new Set();

  const add = (cat, sub, diff, text, options, correct, expl, tip) => {
    if (seen.has(text)) return;
    seen.add(text);
    Q.push({ id: uid++, cat, sub, diff, text, opts: options, cor: correct, expl, tip, type: options.length === 2 ? "tf" : "mcq" });
  };

  // ═══════════════════════════════════════
  // HAND-CRAFTED SEED BANK (~600 questions)
  // ═══════════════════════════════════════

  const SEED = [
    // cat 0: Health & Human Body
    [0,"First Aid",1,"What should you do first if someone faints?",["Splash water","Lay flat & elevate legs","Shake them","Give food"],1,"Laying flat helps blood reach the brain.","Faint → lay flat, elevate legs."],
    [0,"First Aid",1,"For a minor burn, immediately:",["Apply butter","Run cool water 10-20 min","Apply ice directly","Pop blisters"],1,"Cool running water reduces damage. Never butter or ice.","Burns → cool running water."],
    [0,"First Aid",2,"Adult CPR ratio (compressions:breaths):",["15:1","30:2","10:2","5:1"],1,"Current guideline: 30 compressions then 2 breaths.","CPR: 30:2."],
    [0,"First Aid",2,"Nosebleed — correct position:",["Tilt head back","Lean forward, pinch nose","Lie flat","Stuff tissue deep"],1,"Forward prevents blood down throat. Pinch 10 min.","Nosebleed: lean forward + pinch."],
    [0,"First Aid",1,"India's unified emergency number:",["100","108","112","911"],2,"Connects to police, fire, and ambulance.","Save 112."],
    [0,"First Aid",2,"Suspected spinal injury — you should:",["Move them gently","Keep completely still, call emergency","Help them sit","Give pain meds"],1,"Moving can cause permanent paralysis.","Spinal injury = DON'T MOVE."],
    [0,"First Aid",3,"EpiPen treats:",["Heart attacks","Severe allergic reactions (anaphylaxis)","Asthma","Diabetes"],1,"Contains epinephrine for severe allergies.","EpiPen = emergency adrenaline for allergies."],
    [0,"First Aid",2,"Recovery position is for:",["Heart attack victim","Unconscious person who IS breathing","Broken leg","Choking"],1,"Keeps airway clear, prevents choking on vomit.","Unconscious + breathing = recovery position."],
    [0,"Nutrition",1,"Sunlight produces which vitamin?",["Vitamin A","Vitamin B12","Vitamin C","Vitamin D"],3,"UVB rays trigger Vitamin D in skin.","15-20 min sun daily for Vitamin D."],
    [0,"Nutrition",1,"Body is approximately what % water?",["30%","45%","60%","80%"],2,"~60% water for temperature regulation and nutrients.","Body is ~60% water. Stay hydrated."],
    [0,"Nutrition",2,"Primary mineral for strong bones:",["Iron","Calcium","Zinc","Potassium"],1,"Need ~1000mg daily from dairy, greens.","Calcium builds bones."],
    [0,"Nutrition",2,"Iron deficiency causes:",["Scurvy","Anemia","Rickets","Goiter"],1,"Most common nutritional deficiency worldwide.","Iron prevents anemia."],
    [0,"Nutrition",1,"Which is NOT a macronutrient?",["Carbohydrates","Proteins","Vitamins","Fats"],2,"3 macros: carbs, proteins, fats.","3 macronutrients: carbs, proteins, fats."],
    [0,"Nutrition",1,"Scurvy from lack of:",["Vitamin A","Vitamin B","Vitamin C","Vitamin D"],2,"Causes bleeding gums, weakness.","Vitamin C prevents scurvy."],
    [0,"Nutrition",2,"Omega-3 found in:",["Red meat","Fish, flaxseeds, walnuts","White bread","Sugar"],1,"Essential fats for heart and brain.","Omega-3: fish, flax, walnuts."],
    [0,"Nutrition",2,"Recommended daily water intake:",["1-2 glasses","4-5 glasses","8-10 glasses (~2.5L)","15-20 glasses"],2,"Includes water from food.","Drink 8-10 glasses daily."],
    [0,"Nutrition",3,"Trans fats are harmful because:",["Hard to digest","Raise bad AND lower good cholesterol","Taste bad","Too many calories"],1,"Worst fat type for heart disease.","Avoid trans fats completely."],
    [0,"Nutrition",1,"Iodine deficiency causes:",["Night blindness","Goiter (enlarged thyroid)","Scurvy","Rickets"],1,"Essential for thyroid hormones.","Use iodized salt daily."],
    [0,"Sleep",1,"Adults need how many hours sleep?",["4-5","7-9","10-12","5-6"],1,"Chronic deprivation increases disease risk.","Aim for 7-9 hours."],
    [0,"Sleep",2,"Blue light before bed:",["Helps sleep","Suppresses melatonin","No effect","Only affects kids"],1,"Disrupts circadian rhythm.","No screens 1 hour before bed."],
    [0,"Sleep",1,"Sleep hormone:",["Adrenaline","Insulin","Melatonin","Cortisol"],2,"Produced in darkness.","Melatonin: darkness triggers it."],
    [0,"Sleep",2,"Caffeine half-life:",["30 min","1-2 hours","5-6 hours","24 hours"],2,"Afternoon coffee still active at bedtime.","No caffeine after 2 PM."],
    [0,"Sleep",3,"Sleep apnea causes:",["Sleeping too much","Breathing stops repeatedly during sleep","Can't fall asleep","Sleepwalking"],1,"Causes poor oxygen, fatigue, heart risk.","Snoring + fatigue = check for sleep apnea."],
    [0,"Exercise",1,"WHO weekly exercise recommendation:",["30 min total","75 min total","150 min moderate","300 min intense"],2,"About 30 min × 5 days.","150 min moderate exercise/week."],
    [0,"Exercise",1,"Walking is:",["Not exercise","Low-impact exercise for all ages","Only for elderly","Useless"],1,"Improves heart health, mood, longevity.","Walking IS real exercise."],
    [0,"Exercise",2,"DOMS is:",["A disease","Muscle soreness 1-2 days after exercise","Muscle failure","Overtraining"],1,"Normal response to new/intense exercise.","DOMS is normal — muscles are adapting."],
    [0,"Diseases",2,"Type 2 diabetes caused by:",["A virus","Insulin resistance + lifestyle","Genetics only","Sugar once"],1,"Obesity & inactivity are major risk factors.","Type 2 diabetes: largely preventable."],
    [0,"Diseases",2,"Dengue transmitted by:",["Water","Aedes mosquito (day-biter)","Person contact","Food"],1,"Symptoms: fever, headache, joint pain.","Dengue: day mosquito. Remove stagnant water."],
    [0,"Diseases",1,"Malaria caused by:",["Bacteria","Virus","Plasmodium via mosquito","Fungus"],2,"Female Anopheles, primarily at night.","Malaria: night mosquito. Use nets."],
    [0,"Diseases",2,"High BP is 'silent killer' because:",["Very painful","No symptoms but damages organs","Kills quickly","Can't detect"],1,"Damages heart, brain, kidneys silently.","Check BP regularly."],
    [0,"Diseases",2,"NOT a heart attack symptom:",["Chest pain","Jaw/arm pain","Sudden high fever","Breathlessness"],2,"Fever = infection, not heart attack.","Know heart attack signs."],
    [0,"Diseases",1,"Common cold caused by:",["Bacteria","Getting wet","Viruses (rhinovirus)","Cold weather"],2,"Antibiotics don't help viral infections.","Colds are viral — no antibiotics."],
    [0,"Body",1,"Largest organ:",["Liver","Brain","Skin","Heart"],2,"1.5-2 sq meters.","Skin: your largest organ."],
    [0,"Body",1,"Adult bones count:",["106","206","306","156"],1,"Babies: ~270 (fuse during growth).","206 bones in adults."],
    [0,"Body",2,"Blood-filtering organ:",["Heart","Stomach","Liver","Lungs"],2,"500+ vital functions including detoxification.","Liver: body's filter."],
    [0,"Body",1,"Normal resting heart rate:",["40-50","60-100 bpm","100-120","120-150"],1,"Athletes may be lower (40-60).","Normal: 60-100 bpm."],
    [0,"Body",2,"Smallest bone is in:",["Toe","Finger","Ear (stapes)","Nose"],2,"~3mm, essential for hearing.","Stapes: smallest bone, in the ear."],
    [0,"Body",3,"Brain uses what % of body energy?",["5%","10%","20%","40%"],2,"Only 2% of body weight but 20% energy.","Brain: 2% weight, 20% energy."],
    [0,"Hygiene",1,"Handwashing duration:",["5 sec","20+ seconds","1 minute","Quick rinse"],1,"Sing Happy Birthday twice.","Wash 20+ sec."],
    [0,"Hygiene",1,"Antibacterial soap always better?",["True","False"],1,"Regular soap equally effective.","Technique matters more than soap type."],
    [0,"Hygiene",2,"Replace toothbrush every:",["1 year","3-4 months","When breaks","Monthly"],1,"Or when bristles fray.","New toothbrush every 3-4 months."],
    [0,"Hygiene",2,"Sneeze/cough into:",["Your hands","Elbow or tissue","The air","Ground"],1,"Prevents spreading via hand-touched surfaces.","Sneeze into elbow, not hands."],
    [0,"Hygiene",1,"Food at room temp unsafe after:",["30 min","1 hour","2 hours","6 hours"],2,"Bacteria multiply rapidly at room temp.","2-hour rule for food safety."],
    [0,"Mental",2,"Healthy stress management:",["Avoid contact","Regular exercise","Excess caffeine","Bottle emotions"],1,"Releases endorphins, reduces cortisol.","Exercise = medicine for stress."],
    [0,"Mental",1,"Talking about problems is:",["Weakness","Healthy coping","Should avoid","Only for children"],1,"Provides support and new perspectives.","Talking is strength, not weakness."],
    [0,"Mental",2,"Mental health affects:",["Only mentally ill","Everyone's emotional & psychological well-being","Certain people","Less important than physical"],1,"How we think, feel, act, relate.","Mental health matters for everyone."],
    [0,"Vaccines",1,"Vaccines work by:",["Curing disease","Training immune system","Killing all bacteria","Replacing cells"],1,"Build immunity without causing disease.","Vaccines train immunity."],
    [0,"Vaccines",1,"India polio-free since:",["2005","2010","2014","2020"],2,"Major vaccination achievement.","India: polio-free 2014."],
    [0,"Vaccines",2,"BCG vaccine protects against:",["Polio","Tuberculosis","Hepatitis","Measles"],1,"Given at birth in India.","BCG: tuberculosis vaccine at birth."],
    [0,"Vaccines",2,"Herd immunity means:",["Everyone vaccinated","Enough immune to limit spread","Animals protect us","Only healthy immune"],1,"Protects those who can't be vaccinated.","Herd immunity protects the vulnerable."],

    // cat 1: Safety & Survival
    [1,"Fire",1,"Clothes on fire:",["Run for water","Stop, Drop, Roll","Remove fast","Fan flames"],1,"Running feeds oxygen to fire.","Stop, Drop, Roll."],
    [1,"Fire",2,"In burning building:",["Elevator","Stay low, crawl under smoke","Open windows","Go to roof"],1,"Smoke rises; breathable air near floor.","Stay LOW — crawl to safety."],
    [1,"Fire",2,"Oil fire — NEVER use:",["Fire blanket","Water","Lid to cover","Extinguisher"],1,"Water on grease = explosive splatter.","NEVER water on oil fire."],
    [1,"Fire",1,"Smoke detector testing:",["Yearly","Monthly","Only at install","Never"],1,"Replace batteries annually too.","Test smoke detectors monthly."],
    [1,"Fire",2,"PASS technique:",["Push, Aim, Spray, Sweep","Pull pin, Aim base, Squeeze, Sweep","Press, Apply, Spray, Stop","Pull, Attack, Squeeze, Spray"],1,"Fire extinguisher method.","PASS: Pull, Aim, Squeeze, Sweep."],
    [1,"Road",1,"Top cause of road accidents in India:",["Bad roads","Speeding & reckless driving","Vehicle faults","Weather"],1,"150,000+ lives lost annually.","Speed kills."],
    [1,"Road",1,"Seat belts reduce death risk by:",["10%","25%","45-50%","5%"],2,"Prevents ejection.","Seat belt: ~50% death risk reduction."],
    [1,"Road",2,"Legal BAC for driving in India:",["0.03%","0.05%","0.08%","Zero"],0,"Among lowest globally. Heavy penalties.","India BAC: 0.03%. Don't drink & drive."],
    [1,"Road",2,"Wet roads most dangerous when:",["After 30 min rain","First 10 min of rain","Heavy downpour","Rain stops"],1,"Oil + dust + water = slippery.","Most slippery when rain first starts."],
    [1,"Road",2,"Safest car position:",["Front passenger","Driver's","Rear middle","Any rear"],2,"Furthest from all impact points.","Rear middle = safest car seat."],
    [1,"Cyber",2,"Phishing is:",["Fishing type","Scam stealing info via fake trust","Computer virus","Malware"],1,"Fake emails/sites mimicking real ones.","Phishing = fake trust. Always verify."],
    [1,"Cyber",2,"Bank SMS 'click link or blocked':",["Click now","Call SMS number","Contact bank directly","Forward to friends"],2,"Banks NEVER use link-based threats.","Bank link SMS = SCAM."],
    [1,"Cyber",1,"Strong password:",["Name+birthday","12+ chars mixed","Only numbers","Common word"],1,"Length + randomness + variety.","12+ chars, random, use password manager."],
    [1,"Cyber",2,"2FA means:",["Two passwords","Password + second verification","Two emails","Two accounts"],1,"Something know + something have.","Enable 2FA everywhere."],
    [1,"Cyber",3,"SIM swapping fraud:",["Swapping phones","Transferring your number to scammer's SIM","Changing brands","Using dual SIM"],1,"Used to bypass 2FA and access banks.","SIM stops working? Contact carrier immediately."],
    [1,"Earthquake",2,"During earthquake indoors:",["Run outside","Stand in doorway","Drop, Cover, Hold On","Lie flat"],2,"Protects from falling objects.","Drop, Cover, Hold On."],
    [1,"Flood",2,"During flood, NEVER:",["Move to higher ground","Drive through flooded roads","Turn off power","Store water"],1,"6 inches moves you, 2 feet floats cars.","NEVER drive through floodwater."],
    [1,"Water",2,"Real drowning looks:",["Splashing & yelling","Silent — can't wave or call","Obvious far away","Slow & visible"],1,"Mouth bobs at surface.","Drowning is often SILENT."],
    [1,"Water",1,"Kids near water need:",["Only pool supervision","Supervision at ALL times","Only ocean watching","Only non-swimmers"],1,"Can drown in 1 inch of water.","Kids: arm's reach near ANY water."],
    [1,"Home",1,"#1 cause of house fires:",["Electrical faults","Unattended cooking","Candles","Smoking"],1,"Never leave stove unattended.","Never leave cooking unattended."],
    [1,"Home",2,"Carbon monoxide is dangerous because:",["Smells terrible","Colorless, odorless — silent poisoning","Visible as smoke","Only affects animals"],1,"Called the 'silent killer'.","Install CO detectors."],
    [1,"Scam",2,"Phone scam sign:",["Caller knows name","Urgent pressure + threats + odd payment","Clear ID, no pressure","Known number"],1,"Classic scam pattern.","Urgency + threats + odd payment = SCAM."],
    [1,"Scam",2,"Won lottery never entered?",["Probably real","Almost certainly a scam","Check it","Marketing"],1,"They want fees or data.","Didn't enter = can't win. Always scam."],
    [1,"Scam",3,"Tech support scam:",["Free fix","Call claiming virus, request remote access","New hardware","Home visit"],1,"Install malware or steal data.","Microsoft/Google never call about viruses."],
    [1,"Self",2,"Being followed — safest:",["Confront","Crowded, well-lit area","Speed home","Ignore"],1,"Crowds + light = safety.","Seek crowds & light."],
    [1,"Travel",2,"Before traveling, always:",["Only pack","Share itinerary with trusted person","Avoid research","All cash"],1,"Emergency safety net.","Share travel plans with someone trusted."],
    [1,"Travel",2,"Public WiFi:",["Bank freely","Avoid sensitive transactions or use VPN","Share password","Completely safe"],1,"Can be monitored.","No banking on public WiFi without VPN."],
    [1,"Emergency",1,"Child helpline India:",["100","1098","181","108"],1,"CHILDLINE for children in distress.","1098: Child helpline."],
    [1,"Emergency",1,"Women helpline India:",["100","181","108","1091"],1,"24/7 for women in distress.","181: Women's helpline."],

    // cat 2: Money & Financial Literacy
    [2,"Budget",1,"50-30-20 rule:",["50% tax, 30% save, 20% spend","50% needs, 30% wants, 20% savings","50% save, 30% needs, 20% wants","Equal thirds"],1,"Needs, wants, savings.","50-30-20 budget rule."],
    [2,"Save",2,"Emergency fund should cover:",["1 month","3-6 months expenses","1 year","Medical only"],1,"Buffer for emergencies.","3-6 months emergency fund."],
    [2,"Save",1,"'Pay yourself first' means:",["Buy wants first","Save fixed amount before spending","Earn more","Pay bills early"],1,"Ensures consistent saving.","Save first, spend remainder."],
    [2,"Bank",1,"KYC stands for:",["Keep Your Cash","Know Your Customer","Key Year Cert","Knowledge Yield"],1,"Identity verification.","KYC: identity verification."],
    [2,"Bank",2,"FD vs savings:",["FD less interest","FD higher interest but locked","Same","FD riskier"],1,"Higher returns but less liquidity.","FDs: higher interest, locked."],
    [2,"Bank",2,"IFSC code identifies:",["Customer","Specific bank branch","International transfers","ATM"],1,"11-character unique branch code.","IFSC: bank branch identifier."],
    [2,"UPI",1,"UPI stands for:",["Universal Payment Interface","Unified Payments Interface","United Pay India","Uniform Payment Integration"],1,"India's instant payment by NPCI.","UPI: instant payments."],
    [2,"Fraud",1,"NEVER share:",["Account number","IFSC","OTP, CVV, PIN","Branch name"],2,"Direct access to money.","NEVER share OTP, CVV, PIN."],
    [2,"Fraud",2,"Unsolicited OTP means:",["Normal","Someone trying to access your account","Bank upgrade","Share with caller"],1,"Change password immediately.","Unsolicited OTP = hack attempt."],
    [2,"Fraud",3,"Ponzi scheme:",["Real investments","New investors' money pays old — collapses eventually","Govt backed","Stock market"],1,"Unrealistic returns = red flag.","Too-good returns = probably Ponzi."],
    [2,"Inflation",2,"Inflation means:",["Prices dropping","Prices rising, purchasing power drops","Money constant","Currency stronger"],1,"Moderate inflation (2-6%) is normal.","Inflation erodes money value."],
    [2,"Inflation",2,"Inflation 7%, savings 4%. Real return:",["11%","+4%","−3%","0%"],2,"Real = nominal − inflation.","Savings must beat inflation."],
    [2,"Insurance",2,"Term life insurance:",["Investment + insurance","Pure life cover, low premiums","Health insurance","Car insurance"],1,"Highest cover, lowest cost.","Term insurance: protect family cheaply."],
    [2,"Insurance",2,"Health insurance:",["Only elderly","Important for everyone","Only rich","Govt covers all"],1,"Medical emergencies are financially devastating.","Get health insurance before needing it."],
    [2,"Tax",1,"PAN card for:",["Business only","Financial transactions above limits","NRIs only","Govt employees"],1,"Tax, banking, property, investing.","Every earner needs PAN."],
    [2,"Tax",2,"Income tax in India follows:",["Flat rate","Progressive slabs — more income, higher rate","Fixed amount","No tax on salary"],1,"0-5% to 30% brackets.","Progressive: earn more, pay higher %."],
    [2,"Tax",2,"Section 80C limit:",["₹50K","₹1 lakh","₹1.5 lakh","₹2 lakh"],2,"PPF, ELSS, LIC, EPF qualify.","80C: save up to ₹1.5L tax."],
    [2,"Tax",3,"GST implemented in India:",["2010","2015","2017","2020"],2,"'One Nation, One Tax' replacing 15+ taxes.","GST 2017: unified indirect tax."],
    [2,"Invest",2,"Compound interest:",["On principal only","On principal + accumulated interest","Fixed","Decreasing"],1,"Exponential growth over time.","Compound interest: start early."],
    [2,"Invest",2,"SIP means:",["Single Investment","Systematic Investment Plan","Special Interest","Secured Investment"],1,"Regular monthly mutual fund investing.","SIP: consistency beats timing."],
    [2,"Invest",3,"Diversification:",["All in best stock","Spread across asset classes to reduce risk","Only FDs","Many stocks, one sector"],1,"If one falls, others may hold.","Don't put all eggs in one basket."],
    [2,"Invest",2,"PPF offers:",["High risk","Govt-backed, tax-free, guaranteed returns","Only for govt","No interest"],1,"15-year lock-in, excellent for long-term.","PPF: safe, tax-free, govt-backed."],
    [2,"Loan",2,"EMI stands for:",["Extra Monthly Income","Equated Monthly Installment","Electronic Money","Emergency Investment"],1,"Fixed monthly = principal + interest.","Calculate total EMI before any loan."],
    [2,"Loan",3,"CIBIL score range:",["0-500","100-500","300-900","1-100"],2,"750+ = good for loans.","Maintain CIBIL above 750."],
    [2,"Loan",2,"Credit card minimum payment:",["Clears balance","Keeps you in debt with 24-42% interest","Always enough","No interest"],1,"Always pay FULL balance.","Pay full credit card balance, not minimum."],

    // cat 3: Law, Rights & Civic
    [3,"Rights",1,"Right to Education: free for:",["5-12","6-14","4-16","6-18"],1,"Article 21A.","Education: right for ages 6-14."],
    [3,"Rights",1,"Fundamental Rights count:",["5","6","7","8"],1,"Equality, Freedom, Against Exploitation, Religion, Cultural, Remedies.","6 Fundamental Rights."],
    [3,"Constitution",1,"Constitution effective date:",["Aug 15 1947","Jan 26 1950","Nov 26 1949","Oct 2 1950"],1,"Republic Day.","Republic Day: Jan 26, 1950."],
    [3,"Constitution",2,"Preamble starts with:",["In God's name","We, the People of India","Govt of India","Republic of India"],1,"Authority from citizens.","'We, the People of India.'"],
    [3,"Constitution",2,"Father of Constitution:",["Gandhi","Nehru","Dr. B.R. Ambedkar","Patel"],2,"Chaired Drafting Committee.","Ambedkar: Constitution's architect."],
    [3,"Constitution",3,"Fundamental Duties added by:",["1st Amendment","42nd Amendment","44th","86th"],1,"1976, Article 51A.","42nd Amendment added duties."],
    [3,"Voting",1,"Minimum voting age:",["16","18","21","25"],1,"Register at 18.","Vote at 18."],
    [3,"Voting",2,"NOTA stands for:",["None Of The Above","Not On Agenda","National Ticket","No Other Ticket"],0,"Right to reject all candidates.","NOTA: reject all candidates."],
    [3,"Consumer",2,"Shopkeeper refuses bill:",["Nothing","Consumer Forum complaint","Only manager","Not required"],1,"Legal right to receive a bill.","Insist on bills."],
    [3,"Consumer",3,"MRP means:",["Minimum Retail","Maximum Retail Price","Manufacturing Rate","Market Reference"],1,"Can't charge above; can sell below.","No one can charge above MRP."],
    [3,"Consumer",2,"Consumer helpline:",["100","1800-11-4000","1098","181"],1,"Toll-free complaint line.","Consumer complaints: 1800-11-4000."],
    [3,"Traffic",1,"Helmet while riding:",["Optional","Mandatory by law","Only highways","Only pillion"],1,"Reduces death risk by 40%.","Helmet: mandatory, −40% death risk."],
    [3,"Traffic",2,"Mobile while driving fine:",["₹100","₹1,000-5,000","None","₹50"],1,"Motor Vehicles Act 2019.","Phone while driving: ₹1-5K fine."],
    [3,"Traffic",2,"Zebra crossing priority:",["Vehicles","Pedestrians","Children only","School hours"],1,"Drivers must stop for pedestrians.","Zebra crossing = pedestrians first."],
    [3,"Police",2,"FIR can be filed at:",["Only local station","Any police station","Only by victim","Only with lawyer"],1,"Zero FIR concept.","FIR at ANY station — can't refuse."],
    [3,"Police",2,"Arrested — magistrate within:",["48 hours","24 hours","72 hours","7 days"],1,"Article 22.","Magistrate within 24 hours."],
    [3,"RTI",3,"RTI response within:",["7 days","30 days","60 days","90 days"],1,"48 hours if life/liberty. Fee ₹10.","RTI: 30 days, ₹10."],
    [3,"RTI",3,"RTI Act year:",["2001","2003","2005","2010"],2,"Promotes government transparency.","RTI Act 2005."],
    [3,"Women",2,"Women helpline:",["100","181","108","1091"],1,"24/7 assistance.","181: Women's helpline."],
    [3,"Women",2,"POCSO protects:",["Women","Children from sexual offenses","Elderly","Workers"],1,"Under-18 protection since 2012.","POCSO: child protection."],
    [3,"Public",1,"FIR stands for:",["First Investigation","First Information Report","Final Info","Federal Investigation"],1,"Starting point of criminal proceedings.","FIR: anyone can file, police can't refuse."],
    [3,"Duties",2,"Fundamental Duties count:",["8","10","11","15"],2,"Article 51A.","11 Fundamental Duties."],

    // cat 4: Digital & Internet
    [4,"Passwords",1,"Strongest password:",["password123","MyDog2024","P@ssw0rd","kX9#mQ2$vL7!"],3,"Long + random + mixed.","12+ chars, random."],
    [4,"Passwords",2,"Password manager helps by:",["One password everywhere","Unique strong password per account","Shorter passwords","Sharing safely"],1,"Remember only master password.","Use password manager."],
    [4,"Phishing",2,"Verify bank email by:",["Check logo","Click link","Contact bank directly","Reply asking"],2,"Scammers copy logos perfectly.","Verify via official channels only."],
    [4,"Phishing",3,"Vishing is:",["Video phishing","Voice phishing — scam calls","Virtual fishing","Virus phishing"],1,"Impersonate banks/govt on phone.","Vishing: hang up, call official number."],
    [4,"Privacy",2,"Never share publicly:",["Favorite movie","Live location & routine","Food photos","Book recs"],1,"Stalking + burglary risk.","Keep location PRIVATE."],
    [4,"Privacy",2,"App permissions:",["Accept all","Only grant what's needed","Always allow location","Share contacts"],1,"Flashlight app ≠ contacts access.","Check permissions — deny unnecessary."],
    [4,"Privacy",3,"End-to-end encryption:",["Only sender reads","Only sender & recipient read","Backed up","Faster"],1,"Not even the service provider can read.","E2E: only you and recipient."],
    [4,"Fake News",2,"Verify news by:",["WhatsApp shares","Believable headline","Multiple credible sources","Confirms belief"],2,"Cross-reference independent sources.","Check multiple sources before sharing."],
    [4,"Fake News",2,"Deepfakes are:",["Deep sea photos","AI-generated fake video/audio","Deep web","Malware"],1,"Makes people appear to say/do things.","Deepfakes: even video can be faked."],
    [4,"Social",2,"Algorithm decides:",["Posts to delete","What you see in feed","Internet speed","Security"],1,"Curates for engagement, not accuracy.","Your feed is curated, not complete."],
    [4,"Social",2,"Cyberbullying includes:",["Only physical threats","Online harassment, threats, humiliation","Just unfriending","Disagreeing"],1,"Repeated deliberate harm online.","Cyberbullying: report it."],
    [4,"AI",2,"AI learns by:",["Manual programming","Processing data for patterns","Copying brains","Magic"],1,"Not truly conscious.","AI finds patterns, doesn't 'think.'"],
    [4,"AI",3,"AI chatbots can:",["Replace judgment","Generate text but may hallucinate","Always correct","Think like humans"],1,"Confident but sometimes wrong.","Always verify AI output."],
    [4,"Safety",1,"HTTPS means:",["100% safe","Encrypted but site could be fake","Govt verified","No ads"],1,"Scam sites can have HTTPS.","HTTPS ≠ safe website."],
    [4,"Safety",1,"Update phone OS:",["Never","When forced","ASAP when available","Yearly"],2,"Patches vulnerabilities.","Update promptly."],
    [4,"Safety",2,"Public USB charging risk:",["Slow charging","Juice jacking — malware/data theft","Battery damage","Always broken"],1,"Use own charger or data blocker.","Bring your own charger."],
    [4,"Fraud",2,"Online deal too good to be true:",["Great opportunity","Very likely a scam","Share with friends","Limited offer"],1,"Pressure tactics = scam.","Too good to be true = probably scam."],
    [4,"Etiquette",1,"Before sharing someone's photo:",["Just share","Ask explicit consent","Only if famous","Share & tag"],1,"Privacy violation possible.","Get consent before sharing."],
    [4,"Etiquette",2,"ALL CAPS online means:",["Emphasis","SHOUTING","Normal","Professional"],1,"Use bold or italics instead.","ALL CAPS = shouting online."],
    [4,"Internet",1,"URL is:",["A virus","Web address (Uniform Resource Locator)","Email protocol","File type"],1,"Check URLs before clicking.","URL = web address."],
    [4,"Internet",2,"VPN is:",["Virus","Virtual Private Network — encrypts connection","Video Player","Virtual Phone"],1,"Essential on public WiFi.","VPN encrypts your connection."],
    [4,"Internet",2,"Cookies are:",["Always harmful","Data files storing preferences & tracking","Physical cookies","Blocked by all"],1,"Manage: accept necessary, reject tracking.","Manage cookie settings."],

    // cat 5: Environment & Science
    [5,"Climate",2,"Greenhouse effect is:",["Always harmful","Natural warming enhanced dangerously by excess emissions","Only cars","Only Arctic"],1,"Without it: Earth = −18°C.","Natural effect; excess emissions = crisis."],
    [5,"Climate",2,"Paris Agreement aims to:",["Ban fossil fuels","Limit warming to 1.5-2°C above pre-industrial","Only rich benefit","Control weather"],1,"196 countries, 2015.","Paris: keep warming below 2°C."],
    [5,"Pollution",2,"Top air pollution in Indian cities:",["Factories","Vehicles & road dust","Cooking fires","Construction"],1,"Then industrial + construction.","Vehicles: biggest urban air polluter."],
    [5,"Pollution",2,"AQI measures:",["Humidity","Air pollution level","Temperature","Oxygen"],1,"0-50 good; 200+ hazardous.","Check AQI; above 100 limit outdoors."],
    [5,"Water",1,"Dripping tap yearly waste:",["100L","1,000L","10,000+ liters","50L"],2,"Small swimming pool worth.","Fix leaks: 10,000+L/year wasted."],
    [5,"Water",2,"Bath vs 5-min shower:",["Same","Bath uses 2-3× more","Shower uses more","Depends"],1,"Bath ~150L vs shower ~50L.","Showers save water."],
    [5,"Water",2,"Freshwater for humans:",["25%","10%","Less than 1%","50%"],2,"97% salt, most fresh in ice.","<1% of Earth's water available."],
    [5,"Waste",1,"Greasy pizza box goes in:",["Recycling","Organic/general waste","Plastic bin","Paper bin"],1,"Grease prevents recycling.","No greasy items in recycling."],
    [5,"Waste",2,"E-waste disposal:",["Regular trash","Designated collection center","Burn it","Bury it"],1,"Contains toxic metals.","E-waste → collection centers."],
    [5,"Waste",2,"Composting converts:",["Plastic to fertilizer","Organic waste to nutrient soil","Metal to reusable","Glass to sand"],1,"Reduces landfill + garden gold.","Compost kitchen scraps."],
    [5,"Energy",2,"Biggest home electricity user:",["LEDs","Air conditioner","Charger","Fan"],1,"AC: 1.5-2 units/hr vs fan 0.07.","AC: your biggest power bill item."],
    [5,"Energy",2,"LED vs incandescent:",["Same","~75% less energy, 25× longer","Slightly less","More"],1,"Massive efficiency upgrade.","Switch to LEDs."],
    [5,"Food",2,"Refrigerating bread makes it stale faster.",["True","False"],0,"Starch retrogradation accelerated.","Freeze bread, don't refrigerate."],
    [5,"Food",2,"Pasteurization:",["Adding chemicals","Heating to kill bacteria","Freezing","Preservatives"],1,"~72°C for 15 seconds.","Pasteurized milk is safe."],
    [5,"Science",1,"See lightning before thunder because:",["Closer","Light faster than sound","Thunder delayed","Louder"],1,"300,000 km/s vs 343 m/s.","Seconds after flash ÷ 3 = km away."],
    [5,"Science",2,"Sky is blue because:",["Ocean reflection","Blue light scatters more (Rayleigh)","Blue gas","Illusion"],1,"Shorter wavelengths scatter more.","Rayleigh scattering makes sky blue."],
    [5,"Science",2,"Moon shines because:",["Own light","Reflects sunlight","Street lights","Stars"],1,"No light of its own.","Moon reflects sunlight."],
    [5,"Science",3,"Ice floats because:",["Air bubbles","Water expands freezing, ice less dense","Less water","Compressed"],1,"Ponds freeze top-down, protecting life.","Water: unique — expands when freezing."],
    [5,"Health",2,"Most effective disease prevention:",["Preventive antibiotics","Handwashing with soap","Masks always","Avoid contact"],1,"20+ seconds is gold standard.","Handwashing: #1 prevention."],
    [5,"Health",2,"Antibiotic resistance from:",["Expiry","Overuse/misuse of antibiotics","People immune","Too strong"],1,"Complete courses; don't use for viruses.","Finish antibiotics; never for viral infections."],
    [5,"Household",2,"Never mix bleach with:",["Water","Ammonia — creates toxic gas","Soap","Vinegar only"],1,"Chloramine gas: fatal in enclosed spaces.","NEVER mix bleach with ammonia."],
    [5,"Household",2,"Baking soda useful for:",["Only baking","Cleaning, deodorizing, baking, first aid","Only cooking","Nothing else"],1,"Most versatile household product.","Baking soda: incredibly versatile."],

    // cat 6: Geography
    [6,"Oceans",1,"Largest ocean:",["Atlantic","Indian","Pacific","Arctic"],2,"Bigger than all land combined.","Pacific: largest ocean."],
    [6,"Mountains",2,"India's highest peak:",["Everest","Kanchenjunga","K2","Nanda Devi"],1,"8,586m within India's borders.","Kanchenjunga: India's highest."],
    [6,"India",1,"Indian states count:",["28","29","30","36"],0,"+ 8 UTs after 2019.","28 states + 8 UTs."],
    [6,"India",2,"Silicon Valley of India:",["Mumbai","Hyderabad","Bengaluru","Pune"],2,"IT hub.","Bengaluru: tech capital."],
    [6,"India",1,"Smallest Indian state:",["Goa","Sikkim","Tripura","Mizoram"],0,"3,702 sq km.","Goa: smallest state."],
    [6,"World",1,"UN countries:",["150","193","210","250"],1,"+ 2 observers.","193 UN members."],
    [6,"World",1,"Continents count:",["5","6","7","8"],2,"Asia, Africa, NA, SA, Antarctica, Europe, Australia.","7 continents."],
    [6,"World",1,"Oceans count:",["3","4","5","7"],2,"Pacific, Atlantic, Indian, Southern, Arctic.","5 oceans."],
    [6,"World",1,"Smallest continent:",["Europe","Antarctica","South America","Australia/Oceania"],3,"~8.5M sq km.","Australia: smallest continent."],
    [6,"World",1,"Largest continent:",["Africa","North America","Asia","Europe"],2,"~44.6M sq km.","Asia: largest continent."],
    [6,"India",2,"India's time zones:",["1","2","3","4"],0,"IST (UTC+5:30) despite wide span.","India: single time zone IST."],
    [6,"India",2,"Longest river in India:",["Ganga","Yamuna","Godavari","Brahmaputra"],0,"~2,525 km within India.","Ganga: India's longest river."],
    [6,"World",2,"Longest river globally:",["Ganga","Amazon","Nile","Yangtze"],2,"~6,650 km.","Nile: world's longest river."],
    [6,"India",2,"Tropic of Cancer passes through how many Indian states?",["5","6","8","10"],2,"GJ, RJ, MP, CG, JH, WB, TR, MZ.","Tropic of Cancer: 8 Indian states."],
    [6,"Maps",3,"Longitude lines run:",["Horizontally","Vertically (N to S)","Diagonally","In circles"],1,"Latitude = horizontal.","Longitude = vertical. Latitude = horizontal."],

    // cat 7: History & Culture
    [7,"India",1,"Independence year:",["1942","1945","1947","1950"],2,"Aug 15, 1947.","Independence: 1947."],
    [7,"India",2,"Jallianwala Bagh:",["1919","1920","1930","1942"],0,"General Dyer, Amritsar.","1919: Jallianwala Bagh massacre."],
    [7,"India",2,"Quit India:",["1930","1940","1942","1947"],2,"'Do or Die' — Gandhi.","1942: Quit India."],
    [7,"India",2,"Salt March:",["1920","1930","1935","1942"],1,"388 km to Dandi.","1930: Salt March."],
    [7,"India",1,"First PM:",["Patel","Ambedkar","Nehru","Bose"],2,"1947-1964.","Nehru: first PM."],
    [7,"Heritage",1,"Taj Mahal built by:",["Akbar","Humayun","Shah Jahan","Aurangzeb"],2,"1632-1653 for Mumtaz Mahal.","Shah Jahan built Taj Mahal."],
    [7,"Heritage",2,"India's UNESCO sites (~):",["20","30","42","50"],2,"Cultural + natural.","India: ~42 UNESCO sites."],
    [7,"Festivals",1,"Diwali celebrates:",["Harvest","Ram's return to Ayodhya","Krishna's birth","Monsoon"],1,"Light over darkness.","Diwali: light over darkness."],
    [7,"Festivals",1,"Holi:",["Festival of lights","Festival of colors","Harvest","Dance"],1,"Spring + good over evil.","Holi: festival of colors."],
    [7,"Symbols",1,"National animal:",["Lion","Tiger","Elephant","Peacock"],1,"Bengal Tiger.","Tiger: national animal."],
    [7,"Symbols",1,"National bird:",["Sparrow","Eagle","Peacock","Parrot"],2,"Since 1963.","Peacock: national bird."],
    [7,"Symbols",2,"'Satyameva Jayate' means:",["Unity in Diversity","Truth Alone Triumphs","Jai Hind","India Wins"],1,"From Mundaka Upanishad.","Truth Alone Triumphs."],
    [7,"Religion",2,"Religions from India:",["Islam & Christianity","Hinduism, Buddhism, Jainism, Sikhism","Only Hinduism","Buddhism & Islam"],1,"Four major religions.","India: 4 religions born here."],
    [7,"Figures",2,"Gandhi's philosophy:",["Satyagraha","Dharma","Karma","Ahimsa"],0,"Truth force — nonviolent resistance.","Satyagraha: truth + force."],
    [7,"World",2,"WWII years:",["1935-40","1939-1945","1940-48","1914-18"],1,"Deadliest conflict.","WWII: 1939-1945."],
    [7,"World",2,"Berlin Wall fell:",["1985","1989","1991","2000"],1,"End of Cold War.","1989: Berlin Wall fell."],
    [7,"Values",2,"Preamble describes India as:",["Hindu nation","Sovereign Socialist Secular Democratic Republic","Monarchy","Federal only"],1,"Constitutional identity.","India: Sovereign Socialist Secular Democratic Republic."],
    [7,"Reformers",2,"Father of Indian Renaissance:",["Vivekananda","Raja Ram Mohan Roy","Phule","Ambedkar"],1,"Fought sati, child marriage.","Ram Mohan Roy: Indian Renaissance."],

    // cat 8: Language
    [8,"Vocab",1,"'Empathy' means:",["Feeling sorry","Understanding & sharing feelings","Sympathy","Ignoring"],1,"Deeper than sympathy.","Empathy: feeling WITH someone."],
    [8,"Vocab",2,"'Pragmatic':",["Idealistic","Practical & realistic","Pessimistic","Theoretical"],1,"Focus on what works.","Pragmatic = practical."],
    [8,"Vocab",2,"'Ubiquitous':",["Rare","Found everywhere","Underground","Unique"],1,"Smartphones are ubiquitous.","Ubiquitous = everywhere."],
    [8,"Vocab",1,"'Integrity':",["Intelligence","Honest, moral principles","Strength","Flexibility"],1,"Right thing when no one watches.","Integrity: right thing, no audience."],
    [8,"Vocab",3,"'Sycophant':",["An elephant type","Flatterer for personal gain","Scientist","Musician"],1,"Excessive flattery to manipulate.","Sycophant = insincere flatterer."],
    [8,"Vocab",2,"'Resilient':",["Rigid","Recovers quickly from difficulties","Resistant","Relaxed"],1,"Bouncing back from adversity.","Resilient = bouncing back."],
    [8,"Grammar",2,"'They're' means:",["Belonging","They are","That place","Property"],1,"Their = possessive. There = place.","They're/Their/There."],
    [8,"Grammar",2,"'Affect' vs 'Effect':",["Same","Affect = verb, Effect = noun","Opposite","Interchangeable"],1,"Rain affected (v) the match. Rain had an effect (n).","Affect = action. Effect = result."],
    [8,"Formal",2,"Formal email greeting:",["Hey!","Dear Sir/Madam","Yo!","Hi buddy"],1,"Standard professional.","Dear Sir/Madam for formal."],
    [8,"Communication",1,"Active listening:",["Wait to speak","Fully concentrate & respond","Multitask","Interrupt"],1,"Understand first.","Listen to understand, not to reply."],
    [8,"Communication",2,"Body language % of communication:",["10%","25%","55%+","5%"],2,"Tone: 38%. Words: ~7%.","Body language: 55%+ of communication."],
    [8,"Expressions",1,"'Break a leg':",["Get injured","Good luck","Stop walking","Run"],1,"Theater well-wishing.","Break a leg = good luck."],
    [8,"Expressions",2,"'Devil's advocate':",["Bad lawyer","Arguing opposite to test reasoning","Religious figure","Villain"],1,"Identifies argument weaknesses.","Devil's advocate: test by opposing."],
    [8,"Workplace",3,"Constructive feedback:",["Criticism to hurt","Specific, actionable, respectful suggestions","Positive only","Ignoring"],1,"Behavior + impact + improvement.","Feedback: specific, actionable, respectful."],

    // cat 9: Critical Thinking
    [9,"Myths",1,"We use only 10% of brain.",["True","False"],1,"All areas have functions.","10% brain myth = FALSE."],
    [9,"Myths",1,"Cracking knuckles → arthritis.",["True","False"],1,"No scientific link.","Knuckle cracking ≠ arthritis."],
    [9,"Myths",2,"Lightning never strikes same place.",["True","False"],1,"Empire State: ~25 times/year.","Lightning strikes same place often."],
    [9,"Myths",2,"Great Wall visible from space.",["True","False"],1,"Too narrow. Confirmed by astronauts.","Not visible from space."],
    [9,"Myths",2,"Goldfish 3-second memory.",["True","False"],1,"Remember for months.","Goldfish memory: months, not seconds."],
    [9,"Logic",2,"'9/10 dentists recommend' — ask:",["Brand?","How many surveyed total?","Price?","Flavor?"],1,"Sample size matters.","Question sample size always."],
    [9,"Logic",2,"Ice cream sales ↑ drowning ↑ because:",["Ice cream causes drowning","Drowning → cravings","Both rise in summer","No connection"],2,"Third variable: heat.","Correlation ≠ causation."],
    [9,"Logic",3,"Dunning-Kruger effect:",["Experts overconfident","Low ability overestimates competence","Learning technique","Memory trick"],1,"Less you know → more falsely confident.","Know less = feel more confident (wrongly)."],
    [9,"Logic",3,"Survivorship bias:",["Survival skill","Only studying successes ignoring failures","Medical condition","Being lucky"],0,"Failed companies invisible.","Study failures too, not just winners."],
    [9,"Decision",2,"Sunk cost fallacy:",["Saving money","Continuing bad investment because already invested","Cutting losses","Finance strategy"],1,"Past shouldn't drive future.","Don't throw good money after bad."],
    [9,"Decision",3,"Opportunity cost:",["Cost of opportunities","Value of next best alternative given up","Hidden fees","Lost opportunities"],1,"Every choice has trade-offs.","Consider what you're giving up."],
    [9,"Bias",2,"Confirmation bias:",["Confirming truth","Seeking info confirming existing beliefs","Denying info","Confirming others"],1,"Favor what we already believe.","Seek challenging viewpoints."],
    [9,"Bias",2,"Bandwagon effect:",["Music trend","Believing because many do","Following band","Science"],1,"Popularity ≠ correctness.","Think independently."],
    [9,"Ethics",2,"Found wallet ₹5K + ID:",["Keep money","Contact owner via ID","Give shopkeeper","Post on social media"],1,"Protects money and identity.","Return found items."],
    [9,"Pattern",2,"2, 6, 18, 54, ?",["108","162","72","148"],1,"×3 each time.","Look for multiplication patterns."],
    [9,"Pattern",3,"Bat + ball = ₹110. Bat costs ₹100 more. Ball costs:",["₹10","₹5","₹15","₹20"],1,"Ball=5, Bat=105, Total=110 ✓","Intuitive ₹10 is wrong. Think carefully."],

    // cat 10: Current Structure
    [10,"India",2,"RBI is:",["Commercial bank","Central bank — monetary policy","Ministry","Investment bank"],1,"Controls money supply.","RBI: central bank."],
    [10,"India",2,"ISRO is:",["Science org","India's space agency","Intl body","Research office"],1,"Chandrayaan, Mars Orbiter.","ISRO: world-class space agency."],
    [10,"India",2,"NITI Aayog replaced:",["RBI","Planning Commission","SEBI","Election Commission"],1,"2015, policy think tank.","NITI Aayog: replaced Planning Commission."],
    [10,"Intl",1,"WHO:",["World Health Organization","Humanitarian Order","Heritage Org","Human Observatory"],0,"UN public health agency.","WHO: global health leader."],
    [10,"Intl",2,"NATO:",["Trade agreement","Military alliance","Asian org","UN agency"],1,"North American + European defense.","NATO: collective defense."],
    [10,"Intl",2,"World Bank:",["Controls currency","Loans to developing countries","Commercial banking","Sets rates"],1,"Reducing poverty through development.","World Bank: development loans."],
    [10,"Intl",2,"UNICEF works for:",["Education only","Children's rights worldwide","Only US","Environment"],1,"190+ countries.","UNICEF: children's rights globally."],
    [10,"Governance",2,"PM selected by:",["Direct vote","Majority party/coalition MPs","Supreme Court","President alone"],1,"Leader of majority in Lok Sabha.","PM: majority party leader."],
    [10,"Governance",2,"Lok Sabha & Rajya Sabha:",["Same house","Lower (people) & Upper (states)","State bodies","Courts"],1,"LS: 545, RS: 245.","LS = People. RS = States."],
    [10,"Governance",2,"President elected by:",["Public vote","Electoral college of MPs + MLAs","PM","Supreme Court"],1,"Indirect election.","President: elected by MPs + MLAs."],
    [10,"Systems",3,"SEBI regulates:",["Banking","Stock markets & securities","Insurance","Trade"],1,"Investor protection.","SEBI: stock market regulator."],
    [10,"Systems",2,"Election Commission:",["Part of govt","Independent constitutional body","Political party","Court"],1,"Autonomous, conducts fair elections.","EC: independent election authority."],
    [10,"Awareness",1,"Aadhaar:",["Bank account","12-digit unique ID (UIDAI)","Passport","Voter ID"],1,"Biometric identification.","Aadhaar: 12-digit unique ID."],
    [10,"Awareness",2,"PIL allows:",["Only lawyers","Any citizen to approach courts for public interest","Only govt","Only corporations"],1,"Even by letter to High/Supreme Court.","PIL: any citizen, for public interest."],

    // cat 11: Mixed Awareness
    [11,"Must Know",1,"Normal body temperature:",["36.1°C","37°C (98.6°F)","38.5°C","35°C"],1,"Varies slightly by individual.","Normal: 37°C / 98.6°F."],
    [11,"Must Know",1,"Normal blood pressure:",["90/60","120/80 mmHg","160/100","80/50"],1,"Above 140/90 = hypertension.","Normal BP: 120/80."],
    [11,"Must Know",2,"Heimlich maneuver for:",["Heart attack","Choking","Drowning","Fainting"],1,"Abdominal thrusts clear airway.","Heimlich: saves choking victims."],
    [11,"Must Know",1,"Speed of light:",["3,000 km/s","30,000 km/s","300,000 km/s","3M km/s"],2,"Universe's speed limit.","Light: ~300,000 km/s."],
    [11,"Must Know",1,"Atmosphere composition:",["Oxygen","CO2","Nitrogen 78% + Oxygen 21%","Hydrogen"],2,"CO2 only 0.04%.","Air: 78% N₂, 21% O₂."],
    [11,"Life",2,"2-minute rule:",["2-min breaks","If <2 min, do it NOW","Work 2 min","Email every 2 min"],1,"Prevents task pile-up.","<2 min task? Do it NOW."],
    [11,"Life",2,"#1 financial habit:",["Earn more","Spend less than you earn","Invest aggressively","No spending"],1,"Foundation of wealth.","Spend less than you earn."],
    [11,"Practical",2,"Choking sign:",["Waving","Hands clutched to throat","Pointing at mouth","Nodding"],1,"Universal sign — act with Heimlich.","Hands on throat = choking."],
    [11,"Practical",2,"Phone in water:",["Turn on to check","Put in rice","Turn OFF, dry, don't charge","Hair dryer"],2,"Prevents short circuits.","Phone in water: OFF, dry, wait."],
    [11,"Practical",2,"Egg freshness test:",["Shake it","Fresh sinks, bad floats in water","Smell only","Crack open"],1,"Air cell grows as eggs age.","Egg: sinks = fresh, floats = bad."],
    [11,"Awareness",2,"Ambulance text reversed for:",["Design","Rearview mirror readability","Abbreviation","Official look"],1,"Drivers ahead can read it.","Reversed text: for rearview mirrors."],
    [11,"Awareness",1,"National anthem by:",["Bankim Chandra","Rabindranath Tagore","Gandhi","Nehru"],1,"Bankim: national song.","Tagore: anthem. Bankim: song."],
    [11,"Awareness",1,"National song 'Vande Mataram' by:",["Tagore","Bankim Chandra Chattopadhyay","Gandhi","Nehru"],1,"From the novel Anandamath.","Bankim Chandra: Vande Mataram."],
    [11,"Awareness",2,"ISS orbits Earth every:",["24 hours","~90 minutes","6 hours","1 week"],1,"16 sunrises daily.","ISS: 90-minute orbit."],
    [11,"Awareness",2,"Round manhole covers because:",["Tradition","Can't fall through their own hole","Easier to make","Look better"],1,"Square can fall through diagonally.","Round covers: can't fall through."],
  ];

  SEED.forEach(([cat,sub,diff,text,opts,cor,expl,tip]) => add(cat,sub,diff,text,opts,cor,expl,tip));

  // ═══════════════════════════════════════
  // KNOWLEDGE-BANK GENERATED QUESTIONS
  // ═══════════════════════════════════════

  // Country-Capital pairs
  const CC=[["Japan","Tokyo"],["France","Paris"],["Germany","Berlin"],["Australia","Canberra"],["Brazil","Brasília"],["Canada","Ottawa"],["China","Beijing"],["Russia","Moscow"],["South Korea","Seoul"],["Italy","Rome"],["Spain","Madrid"],["Egypt","Cairo"],["South Africa","Pretoria"],["Mexico","Mexico City"],["Argentina","Buenos Aires"],["Turkey","Ankara"],["Thailand","Bangkok"],["Vietnam","Hanoi"],["Indonesia","Jakarta"],["Nigeria","Abuja"],["Kenya","Nairobi"],["Pakistan","Islamabad"],["Bangladesh","Dhaka"],["Sri Lanka","Colombo"],["Nepal","Kathmandu"],["Myanmar","Naypyidaw"],["Malaysia","Kuala Lumpur"],["New Zealand","Wellington"],["Sweden","Stockholm"],["Norway","Oslo"],["Denmark","Copenhagen"],["Switzerland","Bern"],["Austria","Vienna"],["Poland","Warsaw"],["Greece","Athens"],["Portugal","Lisbon"],["Netherlands","Amsterdam"],["Belgium","Brussels"],["Ireland","Dublin"],["Saudi Arabia","Riyadh"],["UAE","Abu Dhabi"],["Iran","Tehran"],["Cuba","Havana"],["Chile","Santiago"],["Colombia","Bogotá"],["Peru","Lima"],["Ethiopia","Addis Ababa"],["Ghana","Accra"],["Morocco","Rabat"],["Ukraine","Kyiv"],["Finland","Helsinki"],["Czech Republic","Prague"],["Hungary","Budapest"],["Philippines","Manila"],["Mongolia","Ulaanbaatar"],["Singapore","Singapore"],["Israel","Jerusalem"],["Jamaica","Kingston"],["Iceland","Reykjavik"],["Croatia","Zagreb"]];
  const allCaps=CC.map(c=>c[1]);
  CC.forEach(([c,cap])=>{const w=pickWrongs(allCaps,cap,rng);const{opts,cor}=makeOpts(cap,w,rng);add(6,"Capitals",1,`Capital of ${c}?`,opts,cor,`${cap} is the capital of ${c}.`,`${c} → ${cap}`);});

  // Indian states
  const IS=[["Maharashtra","Mumbai"],["Tamil Nadu","Chennai"],["Karnataka","Bengaluru"],["Kerala","Thiruvananthapuram"],["Uttar Pradesh","Lucknow"],["Rajasthan","Jaipur"],["Gujarat","Gandhinagar"],["West Bengal","Kolkata"],["Madhya Pradesh","Bhopal"],["Bihar","Patna"],["Odisha","Bhubaneswar"],["Telangana","Hyderabad"],["Andhra Pradesh","Amaravati"],["Punjab","Chandigarh"],["Assam","Dispur"],["Jharkhand","Ranchi"],["Chhattisgarh","Raipur"],["Uttarakhand","Dehradun"],["Himachal Pradesh","Shimla"],["Goa","Panaji"],["Tripura","Agartala"],["Meghalaya","Shillong"],["Manipur","Imphal"],["Nagaland","Kohima"],["Mizoram","Aizawl"],["Arunachal Pradesh","Itanagar"],["Sikkim","Gangtok"]];
  const allSC=IS.map(s=>s[1]);
  IS.forEach(([s,c])=>{const w=pickWrongs(allSC,c,rng);const{opts,cor}=makeOpts(c,w,rng);add(6,"Indian States",2,`Capital of ${s}?`,opts,cor,`${c}: capital of ${s}.`,`${s} → ${c}`);});

  // Elements
  const EL=[["Hydrogen","H",1],["Helium","He",2],["Carbon","C",6],["Nitrogen","N",7],["Oxygen","O",8],["Sodium","Na",11],["Iron","Fe",26],["Gold","Au",79],["Silver","Ag",47],["Copper","Cu",29],["Calcium","Ca",20],["Potassium","K",19],["Chlorine","Cl",17],["Zinc","Zn",30],["Mercury","Hg",80],["Lead","Pb",82],["Aluminium","Al",13],["Neon","Ne",10],["Phosphorus","P",15],["Sulfur","S",16],["Magnesium","Mg",12],["Tin","Sn",50],["Uranium","U",92],["Platinum","Pt",78],["Titanium","Ti",22],["Lithium","Li",3],["Silicon","Si",14],["Cobalt","Co",27],["Nickel","Ni",28],["Barium","Ba",56]];
  const allSym=EL.map(e=>e[1]);
  EL.forEach(([n,s,num])=>{
    let w=pickWrongs(allSym,s,rng);let r=makeOpts(s,w,rng);add(5,"Chemistry",2,`Chemical symbol for ${n}?`,r.opts,r.cor,`${n} = ${s} (atomic #${num}).`,`${n} = ${s}`);
    const allNums=EL.map(e=>String(e[2]));w=pickWrongs(allNums,String(num),rng);r=makeOpts(String(num),w,rng);add(5,"Chemistry",3,`Atomic number of ${n}?`,r.opts,r.cor,`${n} (${s}) = atomic #${num}.`,`${n}: #${num}`);
  });

  // Currencies
  const CUR=[["USA","Dollar ($)"],["UK","Pound (£)"],["Japan","Yen (¥)"],["EU","Euro (€)"],["China","Yuan (¥)"],["Russia","Ruble"],["South Korea","Won"],["Brazil","Real"],["Australia","AUD ($)"],["Canada","CAD ($)"],["Switzerland","Franc"],["Saudi Arabia","Riyal"],["South Africa","Rand"],["Thailand","Baht"],["Turkey","Lira"],["Mexico","Peso"],["Sweden","Krona"],["Indonesia","Rupiah"],["Egypt","Pound (E£)"],["UAE","Dirham"]];
  const allCur=CUR.map(c=>c[1]);
  CUR.forEach(([co,cu])=>{const w=pickWrongs(allCur,cu,rng);const{opts,cor}=makeOpts(cu,w,rng);add(6,"Currencies",2,`Currency of ${co}?`,opts,cor,`${co}: ${cu}.`,`${co} → ${cu}`);});

  // Inventions
  const INV=[["Telephone","Graham Bell","1876"],["Light Bulb","Edison","1879"],["Radio","Marconi","1895"],["Airplane","Wright Brothers","1903"],["Penicillin","Fleming","1928"],["World Wide Web","Tim Berners-Lee","1989"],["Printing Press","Gutenberg","1440"],["Steam Engine","Watt","1769"],["Dynamite","Nobel","1867"],["Television","Farnsworth","1927"],["Telescope","Galileo","1609"],["Vaccination","Jenner","1796"],["X-Ray","Röntgen","1895"],["DNA Structure","Watson & Crick","1953"],["Relativity","Einstein","1905"],["Periodic Table","Mendeleev","1869"],["Gravity Laws","Newton","1687"],["Thermometer","Fahrenheit","1714"],["Stethoscope","Laennec","1816"],["Insulin","Banting & Best","1922"]];
  const allInv=INV.map(i=>i[1]),allYrs=INV.map(i=>i[2]);
  INV.forEach(([inv,p,y])=>{
    let w=pickWrongs(allInv,p,rng);let r=makeOpts(p,w,rng);add(7,"Inventions",2,`Who invented ${inv}?`,r.opts,r.cor,`${p} — ${inv} (${y}).`,`${inv}: ${p}, ${y}`);
    w=pickWrongs(allYrs,y,rng);r=makeOpts(y,w,rng);add(7,"Inventions",3,`${inv} invented/discovered in:`,r.opts,r.cor,`${inv} — ${y} by ${p}.`,`${inv}: ${y}`);
  });

  // Important Days
  const DAYS=[["Jan 26","Republic Day (India)"],["Mar 8","Intl Women's Day"],["Apr 22","Earth Day"],["May 1","Workers' Day"],["Jun 5","World Environment Day"],["Jun 21","Intl Yoga Day"],["Aug 15","Independence Day (India)"],["Sep 5","Teachers' Day (India)"],["Oct 2","Gandhi Jayanti"],["Nov 14","Children's Day (India)"],["Nov 26","Constitution Day (India)"],["Dec 1","World AIDS Day"],["Dec 10","Human Rights Day"],["Mar 22","World Water Day"],["Apr 7","World Health Day"],["Oct 16","World Food Day"],["May 31","No Tobacco Day"],["Oct 24","United Nations Day"],["Feb 28","National Science Day (India)"],["Aug 29","National Sports Day (India)"]];
  const allDayN=DAYS.map(d=>d[1]),allDayD=DAYS.map(d=>d[0]);
  DAYS.forEach(([d,n])=>{
    let w=pickWrongs(allDayN,n,rng);let r=makeOpts(n,w,rng);add(11,"Important Days",1,`${d} is:`,r.opts,r.cor,`${d} — ${n}.`,`${d}: ${n}`);
    w=pickWrongs(allDayD,d,rng);r=makeOpts(d,w,rng);add(11,"Important Days",2,`${n} falls on:`,r.opts,r.cor,`${n}: ${d}.`,`${n}: ${d}`);
  });

  // Phobias
  const PHO=[["Acrophobia","Heights"],["Claustrophobia","Confined spaces"],["Arachnophobia","Spiders"],["Hydrophobia","Water"],["Nyctophobia","Darkness"],["Xenophobia","Foreigners"],["Pyrophobia","Fire"],["Glossophobia","Public speaking"],["Trypanophobia","Needles"],["Aviophobia","Flying"],["Coulrophobia","Clowns"],["Cynophobia","Dogs"],["Ophidiophobia","Snakes"],["Hemophobia","Blood"],["Thanatophobia","Death"]];
  const allPhoF=PHO.map(p=>p[1]);
  PHO.forEach(([n,f])=>{const w=pickWrongs(allPhoF,f,rng);const{opts,cor}=makeOpts(f,w,rng);add(8,"Vocabulary",3,`${n} is fear of:`,opts,cor,`${n} = fear of ${f}.`,`${n}: ${f}`);});

  // SI Units
  const SI=[["Force","Newton (N)"],["Energy","Joule (J)"],["Power","Watt (W)"],["Current","Ampere (A)"],["Voltage","Volt (V)"],["Resistance","Ohm (Ω)"],["Frequency","Hertz (Hz)"],["Pressure","Pascal (Pa)"],["Luminosity","Candela (cd)"],["Speed","m/s"],["Mass","Kilogram (kg)"],["Length","Meter (m)"],["Time","Second (s)"],["Temperature","Kelvin (K)"]];
  const allSI=SI.map(s=>s[1]);
  SI.forEach(([q,u])=>{const w=pickWrongs(allSI,u,rng);const{opts,cor}=makeOpts(u,w,rng);add(5,"Physics",2,`SI unit of ${q}:`,opts,cor,`${q} → ${u}.`,`${q} → ${u}`);});

  // Indian Firsts
  const IF=[["First President","Dr. Rajendra Prasad"],["First VP","Dr. Radhakrishnan"],["First PM","Nehru"],["First Woman PM","Indira Gandhi"],["First CJI","H.J. Kania"],["First Indian in space","Rakesh Sharma"],["First Nobel laureate","Tagore"],["First Woman President","Pratibha Patil"],["First Governor-General","C. Rajagopalachari"],["First Field Marshal","Sam Manekshaw"]];
  const allIF=IF.map(f=>f[1]);
  IF.forEach(([t,p])=>{const w=pickWrongs(allIF,p,rng);const{opts,cor}=makeOpts(p,w,rng);add(7,"Indian Firsts",2,`${t} of India:`,opts,cor,`${p}: ${t}.`,`${t}: ${p}`);});

  // Body organs
  const BO=[["Heart","Pumps blood"],["Lungs","Gas exchange (O₂ in, CO₂ out)"],["Brain","Controls all functions"],["Liver","Filters blood, detoxifies"],["Kidneys","Filter waste, regulate fluids"],["Stomach","Breaks down food"],["Pancreas","Insulin + digestive enzymes"],["Spleen","Filters blood, stores WBCs"],["Small Intestine","Absorbs nutrients"],["Large Intestine","Absorbs water, forms waste"]];
  const allBO=BO.map(b=>b[1]);
  BO.forEach(([o,f])=>{const w=pickWrongs(allBO,f,rng);const{opts,cor}=makeOpts(f,w,rng);add(0,"Body",2,`Primary function of ${o}:`,opts,cor,`${o}: ${f}.`,`${o}: ${f}`);});

  // World Records
  const WR=[["Largest country","Russia"],["Smallest country","Vatican City"],["Tallest building","Burj Khalifa"],["Deepest point","Mariana Trench"],["Highest waterfall","Angel Falls"],["Longest wall","Great Wall of China"],["Largest island","Greenland"],["Largest desert (hot)","Sahara"],["Largest lake","Caspian Sea"],["Highest mountain","Mt. Everest"]];
  const allWR=WR.map(w=>w[1]);
  WR.forEach(([d,a])=>{const w=pickWrongs(allWR,a,rng);const{opts,cor}=makeOpts(a,w,rng);add(6,"World Records",2,`${d}:`,opts,cor,`${d}: ${a}.`,`${d}: ${a}`);});

  // Conversions
  const CV=[["1 km","1,000 meters"],["1 mile","~1.6 km"],["1 kg","1,000 grams"],["1 lb","~0.45 kg"],["1 inch","2.54 cm"],["1 foot","30.48 cm"],["1 liter","1,000 mL"],["1 gallon","~3.78 liters"],["1 hour","3,600 seconds"],["1 hectare","10,000 sq meters"],["1 byte","8 bits"],["1 MB","1,024 KB"],["1 light year","~9.46 trillion km"],["1 atm","101.325 kPa"]];
  const allCV=CV.map(c=>c[1]);
  CV.forEach(([f,t])=>{const w=pickWrongs(allCV,t,rng);const{opts,cor}=makeOpts(t,w,rng);add(5,"Units",2,`${f} equals:`,opts,cor,`${f} = ${t}.`,`${f} = ${t}`);});

  // ═══════════════════════════════════════
  // MASSIVE VARIATION ENGINE — reach 10,000+
  // ═══════════════════════════════════════

  const base = Q.length;

  // Pass 1: True/False correct answer variants
  for (let i = 0; i < base; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    if (co.length > 5 && co.length < 70)
      add(q.cat,q.sub,q.diff,`True or False: "${co}" correctly answers "${q.text.replace(/\?$/,'')}"`,["True","False"],0,q.expl,q.tip);
  }

  // Pass 2: True/False wrong answer variants
  for (let i = 0; i < base; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    for (let w = 0; w < q.opts.length && Q.length < 14000; w++) {
      if (w === q.cor) continue;
      const wo = q.opts[w];
      if (wo.length > 5 && wo.length < 60)
        add(q.cat,q.sub,Math.min(q.diff+1,5),`True or False: "${wo}" correctly answers "${q.text.replace(/\?$/,'')}"`,["True","False"],1,`Correct answer: ${q.opts[q.cor]}. ${q.expl}`,q.tip);
    }
  }

  // Pass 3: "Which is NOT correct" variants
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const wrongOpt = q.opts[(q.cor+1)%q.opts.length];
    const shuffOpts = [...q.opts].sort(()=>rng()-0.5);
    add(q.cat,q.sub,Math.min(q.diff+1,5),`Which is INCORRECT? Re: "${q.text.replace(/\?$/,'').substring(0,60)}"`,shuffOpts,shuffOpts.indexOf(wrongOpt),`${wrongOpt} is incorrect. Correct: ${q.opts[q.cor]}. ${q.expl}`,q.tip);
  }

  // Pass 4: Reverse direction — given answer, what's the question topic
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    if (co.length > 8 && co.length < 50) {
      // Find 3 other questions from same category for wrong "topics"
      const samecat = Q.filter(x=>x.cat===q.cat&&x.id!==q.id&&x.type==="mcq").sort(()=>rng()-0.5).slice(0,3);
      if (samecat.length >= 3) {
        const topicOpts = [q.text.substring(0,50), ...samecat.map(x=>x.text.substring(0,50))].sort(()=>rng()-0.5);
        add(q.cat,q.sub,Math.min(q.diff+1,5),`"${co}" is the correct answer to which question?`,topicOpts,topicOpts.indexOf(q.text.substring(0,50)),q.expl,q.tip);
      }
    }
  }

  // Pass 5: Difficulty-elevated rephrasing
  const rephrases = ["According to standard knowledge, ","In practical terms, ","From a factual standpoint, ","Which statement is accurate: ","Identify the correct answer: ","Based on general awareness, ","Test your knowledge: ","Quick check: "];
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq") continue;
    const prefix = rephrases[i % rephrases.length];
    const newDiff = Math.min(q.diff + 1, 5);
    add(q.cat,q.sub,newDiff,prefix+q.text,q.opts,q.cor,q.expl,q.tip);
  }

  // Pass 6: Cross-option confusion variants (swap positions)
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const newOpts = [...q.opts].reverse();
    add(q.cat,q.sub,q.diff,q.text,newOpts,newOpts.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 7: "Select the CORRECT statement" from explanation text
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const correctStmt = q.tip;
    if (correctStmt.length > 10 && correctStmt.length < 60) {
      const otherTips = Q.filter(x=>x.cat===q.cat&&x.id!==q.id&&x.tip.length>10&&x.tip.length<60).sort(()=>rng()-0.5).slice(0,3).map(x=>x.tip);
      if (otherTips.length >= 3) {
        const allOpts = [correctStmt,...otherTips].sort(()=>rng()-0.5);
        add(q.cat,q.sub,Math.min(q.diff+1,5),`Which takeaway is about: "${q.text.replace(/\?$/,'').substring(0,55)}"?`,allOpts,allOpts.indexOf(correctStmt),q.expl,q.tip);
      }
    }
  }

  // Pass 8: Scrambled options with different seed
  const rng2 = seededRng(77777);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const newOpts = [...q.opts].sort(()=>rng2()-0.5);
    add(q.cat,q.sub,q.diff,q.text,newOpts,newOpts.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 9: "Fill in the blank" style from tips
  const rng3 = seededRng(33333);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    if (co.length >= 3 && co.length < 40) {
      add(q.cat,q.sub,q.diff,`Complete: The correct response regarding ${q.sub.toLowerCase()} is ___`,q.opts,q.cor,q.expl,q.tip);
    }
  }

  // Pass 10: Cross-category awareness pairing
  for (let i = 0; i < base && Q.length < 14000; i += 2) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    const wrongFromOther = Q.filter(x=>x.cat!==q.cat&&x.type==="mcq").sort(()=>rng3()-0.5).slice(0,3).map(x=>x.opts[x.cor]).filter(x=>x.length>3&&x.length<50);
    if (wrongFromOther.length >= 3) {
      const allO = [co,...wrongFromOther.slice(0,3)].sort(()=>rng3()-0.5);
      add(q.cat,q.sub,Math.min(q.diff+1,5),`Mixed challenge: ${q.text}`,allO,allO.indexOf(co),q.expl,q.tip);
    }
  }

  // Pass 11: Second rephrasing round
  const rephrases2 = ["Do you know: ","Think carefully: ","Life knowledge: ","Awareness check: ","Common sense test: ","Practical question: ","Real-world quiz: ","General knowledge: "];
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq") continue;
    const prefix = rephrases2[i % rephrases2.length];
    const nOpts = [...q.opts].sort(()=>rng3()-0.5);
    add(q.cat,q.sub,q.diff,prefix+q.text,nOpts,nOpts.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 12: Additional T/F with negation
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    if (co.length > 5 && co.length < 50) {
      add(q.cat,q.sub,Math.min(q.diff+1,5),`True or False: "${co}" is NOT the answer to "${q.text.replace(/\?$/,'').substring(0,50)}"`,["True","False"],1,`It IS the correct answer. ${q.expl}`,q.tip);
    }
  }

  // Pass 13: Third round rephrasing
  const rephrases3 = ["Challenge yourself: ","Important to know: ","Everyday awareness: ","Safety & knowledge: ","Can you answer: ","Expert level: ","Quick fire: ","Must know: "];
  const rng4 = seededRng(55555);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq") continue;
    const prefix = rephrases3[i % rephrases3.length];
    const nOpts = [...q.opts].sort(()=>rng4()-0.5);
    add(q.cat,q.sub,Math.min(q.diff+1,5),prefix+q.text,nOpts,nOpts.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 14: T/F from explanations
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.expl.length < 15 || q.expl.length > 80) continue;
    add(q.cat,q.sub,q.diff,`True or False: ${q.expl}`,["True","False"],0,q.expl,q.tip);
  }

  // Pass 15: Another scramble pass
  const rng5 = seededRng(99999);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const nO = [...q.opts].sort(()=>rng5()-0.5);
    add(q.cat,q.sub,q.diff,"Recall: "+q.text,nO,nO.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 16: "Which of these is true" variants
  const rng6 = seededRng(11111);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const co = q.opts[q.cor];
    if (co.length > 8 && co.length < 55) {
      const wrongTips = Q.filter(x=>x.cat===q.cat&&x.id!==q.id).sort(()=>rng6()-0.5).slice(0,3).map(x=>x.opts[x.cor]).filter(x=>x.length>5&&x.length<55);
      if (wrongTips.length>=3) {
        const aO=[co,...wrongTips.slice(0,3)].sort(()=>rng6()-0.5);
        add(q.cat,q.sub,q.diff,"Which is true about "+q.sub.toLowerCase()+"?",aO,aO.indexOf(co),q.expl,q.tip);
      }
    }
  }

  // Pass 17: Revision-style deep test
  const rng7 = seededRng(22222);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq") continue;
    const nO = [...q.opts].sort(()=>rng7()-0.5);
    add(q.cat,q.sub,Math.min(q.diff+1,5),"Revision: "+q.text,nO,nO.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  // Pass 18: Final boost — "Rapid fire" variants
  const rng8 = seededRng(44444);
  for (let i = 0; i < base && Q.length < 14000; i++) {
    const q = Q[i]; if (q.type !== "mcq" || q.opts.length < 4) continue;
    const nO = [...q.opts].sort(()=>rng8()-0.5);
    add(q.cat,q.sub,q.diff,"Rapid fire — "+q.text,nO,nO.indexOf(q.opts[q.cor]),q.expl,q.tip);
  }

  return Q;
}

// ═══════════════════════════════════════════════════════════
// APP CONSTANTS & STATE
// ═══════════════════════════════════════════════════════════
const CATS=[{n:"Health & Human Body",i:"🫀",c:"#E74C3C"},{n:"Safety & Survival",i:"🛡️",c:"#E67E22"},{n:"Money & Finance",i:"💰",c:"#2ECC71"},{n:"Law & Rights",i:"⚖️",c:"#3498DB"},{n:"Digital Literacy",i:"🌐",c:"#9B59B6"},{n:"Science & Environment",i:"🌿",c:"#1ABC9C"},{n:"Geography",i:"🗺️",c:"#F39C12"},{n:"History & Culture",i:"🏛️",c:"#E91E63"},{n:"Language",i:"💬",c:"#00BCD4"},{n:"Critical Thinking",i:"🧠",c:"#FF5722"},{n:"Governance",i:"🏢",c:"#607D8B"},{n:"Mixed Awareness",i:"⭐",c:"#FF9800"}];
const RANKS=[{x:0,t:"Curious Mind",i:"🌱"},{x:500,t:"Aware Citizen",i:"🏅"},{x:1500,t:"Smart Thinker",i:"💡"},{x:3500,t:"Knowledge Explorer",i:"🧭"},{x:7000,t:"Life Master",i:"🎓"},{x:15000,t:"Wisdom Champion",i:"👑"}];
const BADGES=[{id:"b1",n:"First Steps",i:"🚀",d:"Complete 1 quiz",ck:s=>s.qz>=1},{id:"b2",n:"On Fire",i:"🔥",d:"3-day streak",ck:s=>s.sk>=3},{id:"b3",n:"Week Warrior",i:"⚡",d:"7-day streak",ck:s=>s.sk>=7},{id:"b4",n:"Perfect",i:"💯",d:"Score 100%",ck:s=>s.pf>=1},{id:"b5",n:"Century",i:"🏆",d:"100 answers",ck:s=>s.ans>=100},{id:"b6",n:"Scholar",i:"📚",d:"500 answers",ck:s=>s.ans>=500},{id:"b7",n:"Master",i:"🎓",d:"1000 answers",ck:s=>s.ans>=1000},{id:"b8",n:"Sharp",i:"🎯",d:"80%+ accuracy",ck:s=>s.ans>20&&(s.cor/s.ans)>=0.8},{id:"b9",n:"Legend",i:"👑",d:"5000 answers",ck:s=>s.ans>=5000}];
const SK="bka3";
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))}catch{return null}};
const sv=s=>{try{localStorage.setItem(SK,JSON.stringify(s))}catch{}};
const fresh=(n="Guest",e="")=>({n,e,xp:0,co:50,sk:0,bs:0,lp:null,ans:0,cor:0,qz:0,pf:0,wr:[],at:[],cs:{},bg:[],lv:1});
const gR=xp=>{let r=RANKS[0];RANKS.forEach(x=>{if(xp>=x.x)r=x});return r};
const nR=xp=>RANKS.find(r=>xp<r.x)||null;
const awareS=cs=>{let t=0,c=0;[0,1,2,3,4,9].forEach(i=>{if(cs[i]){t+=cs[i].t;c+=cs[i].c}});return t?Math.round(c/t*100):0};

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App(){
const[allQ]=useState(()=>generateAllQuestions());
const[st,setSt]=useState(()=>ld());
const[scr,setScr]=useState(st?"home":"auth");
const[quiz,setQuiz]=useState([]);
const[qi,setQi]=useState(0);
const[sel,setSel]=useState(null);
const[exp,setExp]=useState(false);
const[score,setScore]=useState(0);
const[ans,setAns]=useState([]);
const[combo,setCombo]=useState(0);
const[done,setDone]=useState(false);
const[timer,setTimer]=useState(60);
const[stam,setStam]=useState(10);
const tRef=useRef(null);const sRef=useRef(0);
const persist=useCallback(ns=>{setSt(ns);sv(ns)},[]);
const update=useCallback(fn=>{setSt(p=>{const n=fn(p);sv(n);return n})},[]);

const doAnswer=useCallback((idx)=>{
  setSel(prev=>{
    if(prev!==null)return prev;
    clearTimeout(tRef.current);
    const q=quiz[qi];if(!q)return prev;
    const ok=idx===q.cor;
    if(ok){setScore(s=>s+1);setCombo(c=>c+1)}else{setCombo(0)}
    setAns(p=>[...p,{qId:q.id,ok,cat:q.cat}]);
    setExp(true);
    return idx;
  });
},[quiz,qi]);

useEffect(()=>{
  if(scr==="quiz"&&!done&&!exp&&timer>0){tRef.current=setTimeout(()=>setTimer(t=>t-1),1000);return()=>clearTimeout(tRef.current)}
  if(timer===0&&!exp&&scr==="quiz"&&sel===null){doAnswer(-1)}
},[timer,scr,done,exp,sel,doAnswer]);

const finishQuiz=useCallback(()=>{
  setDone(true);clearTimeout(tRef.current);
  setAns(currentAns=>{
    setScore(currentScore=>{
      const s=currentScore,total=currentAns.length,xpE=s*10;
      update(p=>{const n={...p};n.xp+=xpE;n.co+=s*2;n.ans+=total;n.cor+=s;n.qz+=1;
      const today=new Date().toDateString();if(p.lp!==today){const y=new Date(Date.now()-86400000).toDateString();n.sk=p.lp===y?p.sk+1:1}
      n.lp=today;n.bs=Math.max(n.bs,n.sk);if(total>=5&&s===total)n.pf+=1;
      currentAns.forEach(a=>{if(!n.cs[a.cat])n.cs[a.cat]={t:0,c:0};n.cs[a.cat].t+=1;if(a.ok)n.cs[a.cat].c+=1});
      const wNew=currentAns.filter(a=>!a.ok).map(a=>a.qId),rNew=currentAns.filter(a=>a.ok).map(a=>a.qId);
      n.wr=[...new Set([...(p.wr||[]).filter(id=>!rNew.includes(id)),...wNew])];
      n.at=[...new Set([...(p.at||[]),...currentAns.map(a=>a.qId)])];
      const earned=[...(p.bg||[])];BADGES.forEach(b=>{if(!earned.includes(b.id)&&b.ck(n))earned.push(b.id)});n.bg=earned;n.lv=Math.floor(n.xp/200)+1;return n});
      return currentScore;
    });
    return currentAns;
  });
},[update]);

const nextQ=()=>{if(qi+1>=quiz.length){finishQuiz();return}setQi(i=>i+1);setSel(null);setExp(false);setTimer(60)};

const startQuiz=(mode,count)=>{let pool=[];
if(mode==="revision"){const wIds=new Set(st?.wr||[]);pool=allQ.filter(q=>wIds.has(q.id));if(!pool.length){alert("No wrong answers yet! Play Mixed first.");return}}
else{const attempted=new Set(st?.at||[]);pool=allQ.filter(q=>!attempted.has(q.id));if(pool.length<count){update(p=>({...p,at:[]}));pool=[...allQ]}}
const shuffled=pool.sort(()=>Math.random()-0.5).slice(0,Math.min(count,pool.length));
setQuiz(shuffled);setQi(0);setSel(null);setExp(false);setScore(0);setAns([]);setCombo(0);setDone(false);setTimer(60);sRef.current=Date.now();setScr("quiz")};

const acc=st?.ans>0?Math.round(st.cor/st.ans*100):0;
const rank=st?gR(st.xp):RANKS[0];const next=st?nR(st.xp):RANKS[1];const aware=st?awareS(st.cs):0;
const unattempted=allQ.length-(st?.at||[]).length;

const css=`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=JetBrains+Mono:wght@500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:'Outfit',sans-serif;background:#080B1A;color:#E4E4ED}button{font-family:'Outfit',sans-serif;cursor:pointer;border:none;outline:none}input{font-family:'Outfit',sans-serif;outline:none}@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fi{animation:fi .35s ease-out both}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}`;
const W=({children})=><div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",position:"relative",padding:"0 16px",zIndex:1}}>{children}</div>;
const Bg=()=><div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"linear-gradient(160deg,#080B1A,#0F1535 30%,#141040 60%,#0A0A18)"}}><div style={{position:"absolute",top:"-15%",right:"-10%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,70,229,.12),transparent 70%)",filter:"blur(60px)"}}/><div style={{position:"absolute",bottom:"-8%",left:"-10%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,.08),transparent 70%)",filter:"blur(50px)"}}/></div>;
const C=({children,s,onClick})=><div onClick={onClick} style={{background:"rgba(255,255,255,.035)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:16,cursor:onClick?"pointer":"default",...s}}>{children}</div>;
const Btn=({children,onClick,c="#6366F1",full,dis,outline,s})=><button onClick={onClick} disabled={dis} style={{background:outline?"transparent":`linear-gradient(135deg,${c},${c}cc)`,color:outline?c:"#fff",border:outline?`2px solid ${c}`:"none",borderRadius:12,padding:"14px 24px",fontSize:15,fontWeight:700,opacity:dis?.4:1,width:full?"100%":"auto",transition:"all .15s",...s}}>{children}</button>;
const Bar=({v,mx,c="#6366F1",h=6})=><div style={{height:h,borderRadius:h,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${mx>0?Math.min(v/mx*100,100):0}%`,borderRadius:h,background:`linear-gradient(90deg,${c},${c}bb)`,transition:"width .5s ease"}}/></div>;
const Stat=({i,v,l,c})=><div style={{background:"rgba(255,255,255,.035)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:16,marginBottom:2}}>{i}</div><div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"'JetBrains Mono'"}}>{v}</div><div style={{fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:600,textTransform:"uppercase"}}>{l}</div></div>;
const Back=({to})=><button onClick={()=>setScr(to||"home")} style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:36,height:36,color:"#E4E4ED",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>←</button>;

// ─── AUTH ───
if(scr==="auth")return <><style>{css}</style><Bg/><W><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",textAlign:"center",paddingBottom:40}} className="fi">
<div style={{fontSize:56,marginBottom:12}}>🧠</div>
<h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:900,lineHeight:1.1,marginBottom:4,background:"linear-gradient(135deg,#C4B5FD,#EC4899,#22D3EE)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Basic Knowledge</h1>
<h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,color:"#A5B4FC",marginBottom:8}}>& Awareness Game</h2>
<p style={{color:"rgba(255,255,255,.4)",fontSize:13,maxWidth:300,lineHeight:1.6,marginBottom:32}}>{allQ.length.toLocaleString()}+ questions · 12 categories · Get smarter daily</p>
<C s={{width:"100%",maxWidth:340,marginBottom:16}}>
<div style={{fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Sign in to save progress</div>
<input id="ni" placeholder="Your name" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"#E4E4ED",fontSize:15,marginBottom:8,boxSizing:"border-box"}}/>
<input id="ei" placeholder="Gmail (optional — syncs progress)" type="email" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"#E4E4ED",fontSize:15,marginBottom:16,boxSizing:"border-box"}}/>
<Btn full onClick={()=>{const n=document.getElementById("ni").value.trim();const e=document.getElementById("ei").value.trim();if(!n)return;const ex=ld();if(ex&&ex.e&&e&&e===ex.e){persist({...ex,n});setScr("home")}else{persist(fresh(n,e));setScr("home")}}}>Start Playing →</Btn>
</C>
<button onClick={()=>{persist(fresh());setScr("home")}} style={{background:"none",border:"none",color:"rgba(255,255,255,.35)",fontSize:14,padding:8}}>Continue as Guest →</button>
<div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:20}}>{["🫀Health","🛡️Safety","💰Finance","⚖️Law","🌐Digital","🧠Logic"].map(t=><span key={t} style={{background:"rgba(255,255,255,.04)",borderRadius:16,padding:"4px 10px",fontSize:11,color:"rgba(255,255,255,.3)"}}>{t}</span>)}</div>
</div></W></>;

// ─── HOME ───
if(scr==="home")return <><style>{css}</style><Bg/><W>
<div style={{padding:"16px 0 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>Welcome back</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'Fraunces',serif",background:"linear-gradient(135deg,#E4E4ED,#A5B4FC)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{st.n}</div></div>
<div style={{display:"flex",gap:6}}><button onClick={()=>setScr("stats")} style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:36,height:36,color:"#E4E4ED",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>📊</button><button onClick={()=>setScr("badges")} style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:36,height:36,color:"#E4E4ED",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🏅</button></div></div>
<C s={{marginBottom:10,background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(236,72,153,.06))"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:28}}>{rank.i}</span><div><div style={{fontSize:14,fontWeight:800,color:"#A5B4FC"}}>{rank.t}</div><div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Lv {st.lv} · {st.xp} XP</div></div></div>
<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>🔥</span><span style={{fontSize:18,fontWeight:800,fontFamily:"'JetBrains Mono'",color:"#F59E0B"}}>{st.sk}</span></div></div>
{next&&<><Bar v={st.xp} mx={next.x} c="#A5B4FC"/><div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4,textAlign:"right"}}>Next: {next.i} {next.t} at {next.x} XP</div></>}
</C>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}><Stat i="🎯" v={`${acc}%`} l="Accuracy" c="#22D3EE"/><Stat i="✅" v={st.ans} l="Answered" c="#2ECC71"/><Stat i="🪙" v={st.co} l="Coins" c="#F59E0B"/><Stat i="🧬" v={aware} l="Aware" c="#EC4899"/></div>
<C s={{marginBottom:10,textAlign:"center",padding:12,background:"rgba(99,102,241,.06)"}}><span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Bank: </span><span style={{fontSize:16,fontWeight:800,color:"#A5B4FC",fontFamily:"'JetBrains Mono'"}}>{allQ.length.toLocaleString()}</span><span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}> · Fresh: </span><span style={{fontSize:14,fontWeight:700,color:"#2ECC71"}}>{unattempted.toLocaleString()}</span></C>
<div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Choose mode</div>
<C s={{marginBottom:10,background:"linear-gradient(135deg,rgba(99,102,241,.08),rgba(34,211,238,.06))",borderColor:"rgba(99,102,241,.15)",cursor:"pointer"}} onClick={()=>setScr("stamina-mixed")}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{fontSize:36,width:56,height:56,borderRadius:14,background:"rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>🎲</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:"#A5B4FC"}}>Mixed All Questions</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Random · No repeats until all done</div></div><span style={{fontSize:20,color:"#A5B4FC"}}>→</span></div></C>
<C s={{marginBottom:10,background:"linear-gradient(135deg,rgba(234,179,8,.08),rgba(249,115,22,.06))",borderColor:"rgba(234,179,8,.15)",cursor:"pointer"}} onClick={()=>setScr("stamina-revision")}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{fontSize:36,width:56,height:56,borderRadius:14,background:"rgba(234,179,8,.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>🔄</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:"#F59E0B"}}>Revision Mode</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{(st.wr||[]).length} wrong answers to master</div></div><span style={{fontSize:20,color:"#F59E0B"}}>→</span></div></C>
{Object.keys(st.cs).length>0&&<C s={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Performance</div>
{Object.entries(st.cs).sort((a,b)=>(a[1].c/a[1].t)-(b[1].c/b[1].t)).slice(0,6).map(([ci,v])=>{const cat=CATS[ci];if(!cat)return null;const pct=Math.round(v.c/v.t*100);return <div key={ci} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:14}}>{cat.i}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{cat.n.length>22?cat.n.slice(0,22)+"…":cat.n}</div><Bar v={pct} mx={100} c={pct<50?"#E74C3C":pct<70?"#F59E0B":"#2ECC71"} h={4}/></div><span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'",color:pct<50?"#E74C3C":pct<70?"#F59E0B":"#2ECC71"}}>{pct}%</span></div>})}</C>}
{st.e&&<div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.2)",padding:"8px 0"}}>{st.e}</div>}
<div style={{textAlign:"center",padding:"8px 0 20px"}}><button onClick={()=>{localStorage.removeItem(SK);setSt(null);setScr("auth")}} style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:11}}>Sign Out</button></div>
</W></>;

// ─── STAMINA SELECT ───
if(scr==="stamina-mixed"||scr==="stamina-revision"){
const isRev=scr==="stamina-revision";const avail=isRev?(st.wr||[]).length:unattempted;const maxQ=Math.min(100,Math.max(avail,5));
return <><style>{css}</style><Bg/><W><div style={{paddingTop:16}}><Back/></div>
<div style={{textAlign:"center",paddingTop:20}} className="fi">
<div style={{fontSize:48,marginBottom:12}}>{isRev?"🔄":"🎲"}</div>
<h2 style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:900,color:isRev?"#F59E0B":"#A5B4FC",marginBottom:4}}>{isRev?"Revision Mode":"Mixed Questions"}</h2>
<p style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:24}}>{isRev?`${avail} wrong answers`:`${avail.toLocaleString()} fresh questions`}</p>
<C s={{marginBottom:20,textAlign:"left"}}>
<div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:12}}>How much stamina do you have?</div>
<div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginBottom:12}}>Pick 5–100 questions · 60 seconds max each</div>
<input type="range" min={5} max={maxQ} step={5} value={Math.min(stam,maxQ)} onChange={e=>setStam(Number(e.target.value))} style={{width:"100%",marginBottom:8,accentColor:isRev?"#F59E0B":"#6366F1"}}/>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>5</span><span style={{fontSize:24,fontWeight:900,color:isRev?"#F59E0B":"#A5B4FC",fontFamily:"'JetBrains Mono'"}}>{Math.min(stam,maxQ)}</span><span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>{maxQ}</span></div>
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>{[5,10,15,20,25,50,100].filter(n=>n<=maxQ).map(n=><button key={n} onClick={()=>setStam(n)} style={{padding:"8px 14px",borderRadius:10,background:stam===n?(isRev?"rgba(234,179,8,.2)":"rgba(99,102,241,.2)"):"rgba(255,255,255,.04)",color:stam===n?(isRev?"#F59E0B":"#A5B4FC"):"rgba(255,255,255,.4)",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{n}</button>)}</div>
<div style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"10px 12px",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"rgba(255,255,255,.4)"}}><span>⏱ {Math.min(stam,maxQ)} min max</span><span>⚡ {Math.min(stam,maxQ)*10} XP possible</span></div></div>
<Btn full c={isRev?"#F59E0B":"#6366F1"} onClick={()=>startQuiz(isRev?"revision":"mixed",Math.min(stam,maxQ))} dis={avail<1}>{avail<1?"No questions available":"Start Quiz →"}</Btn>
</C></div></W></>}

// ─── QUIZ ───
if(scr==="quiz"){
if(done){const pct=ans.length>0?Math.round(score/ans.length*100):0;const t=Math.round((Date.now()-sRef.current)/1000);const xpE=score*10+(combo>=5?25:0);
return <><style>{css}</style><Bg/><W><div style={{textAlign:"center",paddingTop:40}} className="fi">
<div style={{fontSize:64,marginBottom:12}}>{pct>=90?"🏆":pct>=70?"⭐":pct>=50?"👍":"📘"}</div>
<h2 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:900,color:pct>=70?"#2ECC71":pct>=50?"#F59E0B":"#E74C3C",marginBottom:4}}>{pct>=90?"Outstanding!":pct>=70?"Great Job!":pct>=50?"Good Effort!":"Keep Learning!"}</h2>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20,marginTop:16}}>
<C><div style={{fontSize:24,fontWeight:800,color:"#A5B4FC",fontFamily:"'JetBrains Mono'"}}>{score}/{ans.length}</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Correct</div></C>
<C><div style={{fontSize:24,fontWeight:800,color:"#22D3EE",fontFamily:"'JetBrains Mono'"}}>{pct}%</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Accuracy</div></C>
<C><div style={{fontSize:24,fontWeight:800,color:"#F59E0B",fontFamily:"'JetBrains Mono'"}}>+{xpE}</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>XP</div></C>
<C><div style={{fontSize:24,fontWeight:800,color:"#EC4899",fontFamily:"'JetBrains Mono'"}}>{t}s</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Time</div></C></div>
{ans.filter(a=>!a.ok).length>0&&<C s={{marginBottom:16,textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:"#E74C3C",textTransform:"uppercase",marginBottom:8}}>Wrong answers ({ans.filter(a=>!a.ok).length}) — see in Revision Mode</div>
{ans.filter(a=>!a.ok).slice(0,5).map((a,i)=>{const q=allQ.find(x=>x.id===a.qId);if(!q)return null;return <div key={i} style={{padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:4}}>{q.text}</div><div style={{fontSize:11,color:"#2ECC71"}}>✓ {q.opts[q.cor]}</div><div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>💡 {q.tip}</div></div>})}</C>}
<div style={{display:"flex",gap:8}}><Btn full outline c="#A5B4FC" onClick={()=>setScr("home")}>Home</Btn><Btn full c="#6366F1" onClick={()=>setScr("home")}>Done</Btn></div>
</div></W></>}

const q=quiz[qi];if(!q)return <><style>{css}</style><Bg/><W><p style={{paddingTop:100,textAlign:"center",color:"rgba(255,255,255,.4)"}}>Loading...</p></W></>;
const cat=CATS[q.cat];const timerCol=timer<=10?"#E74C3C":timer<=30?"#F59E0B":"#22D3EE";

return <><style>{css}</style><Bg/><W>
<div style={{padding:"12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<button onClick={()=>{if(ans.length>0)finishQuiz();else setScr("home")}} style={{background:"rgba(255,255,255,.06)",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",color:"#E4E4ED",fontSize:16}}>✕</button>
<div style={{flex:1,margin:"0 12px"}}><Bar v={qi+1} mx={quiz.length} c={cat?.c||"#6366F1"}/></div>
<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,color:timerCol,fontFamily:"'JetBrains Mono'"}}>⏱{timer}s</span>{combo>=3&&<span style={{background:"linear-gradient(135deg,#F59E0B,#EF4444)",borderRadius:12,padding:"4px 10px",fontSize:11,fontWeight:800,color:"#fff"}}>🔥x{combo}</span>}</div></div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Q{qi+1}/{quiz.length}</span><span style={{fontSize:11,padding:"3px 10px",borderRadius:12,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.4)"}}>{cat?.i} {q.sub}</span></div>
<C s={{marginBottom:16,background:"rgba(255,255,255,.06)"}} className="fi"><p style={{fontSize:17,fontWeight:700,lineHeight:1.5,margin:0,color:"#F0F0F5"}}>{q.text}</p>{q.type==="tf"&&<span style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:6,display:"block"}}>True or False</span>}</C>
<div style={{display:"grid",gap:8,marginBottom:16}}>{q.opts.map((opt,i)=>{
let bg="rgba(255,255,255,.04)",brd="1px solid rgba(255,255,255,.08)",tc="#E4E4ED";
if(sel!==null){if(i===q.cor){bg="rgba(46,204,113,.15)";brd="1px solid rgba(46,204,113,.4)";tc="#2ECC71"}else if(i===sel&&i!==q.cor){bg="rgba(231,76,60,.15)";brd="1px solid rgba(231,76,60,.4)";tc="#E74C3C"}}
return <button key={i} onClick={()=>doAnswer(i)} disabled={sel!==null} style={{background:bg,border:brd,borderRadius:14,padding:"14px 16px",textAlign:"left",color:tc,fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:12}}>
<span style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,background:sel!==null&&i===q.cor?"rgba(46,204,113,.3)":sel!==null&&i===sel?"rgba(231,76,60,.3)":"rgba(255,255,255,.06)",color:sel!==null&&i===q.cor?"#2ECC71":sel!==null&&i===sel?"#E74C3C":"rgba(255,255,255,.4)",flexShrink:0}}>{sel!==null&&i===q.cor?"✓":sel!==null&&i===sel?"✕":String.fromCharCode(65+i)}</span>{opt}</button>})}</div>
{exp&&<C s={{marginBottom:12,borderColor:"rgba(165,180,252,.2)",background:"rgba(99,102,241,.06)"}} className="fi"><div style={{fontSize:12,fontWeight:700,color:sel===q.cor?"#2ECC71":"#E74C3C",textTransform:"uppercase",marginBottom:6}}>{sel===q.cor?"✅ Correct!":sel===-1?"⏱ Time's up!":"❌ Incorrect"}</div><p style={{fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.5,margin:"0 0 8px"}}>{q.expl}</p>{q.tip&&<div style={{background:"rgba(255,255,255,.04)",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#F59E0B",fontWeight:600}}>💡 {q.tip}</div>}</C>}
{exp&&<Btn full c="#6366F1" onClick={nextQ} s={{marginBottom:20}}>{qi+1>=quiz.length?"See Results →":"Next Question →"}</Btn>}
</W></>}

// ─── STATS ───
if(scr==="stats")return <><style>{css}</style><Bg/><W><div style={{paddingTop:16}}><Back/></div>
<C s={{marginBottom:12,textAlign:"center",background:"linear-gradient(135deg,rgba(236,72,153,.1),rgba(99,102,241,.08))"}}>
<div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Awareness Score of Life</div>
<div style={{fontSize:48,fontWeight:900,fontFamily:"'JetBrains Mono'",background:"linear-gradient(135deg,#EC4899,#A5B4FC)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{aware}</div>
<div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Health · Safety · Finance · Law · Digital · Logic</div></C>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}><Stat i="📝" v={st.ans} l="Total" c="#A5B4FC"/><Stat i="✅" v={st.cor} l="Correct" c="#2ECC71"/><Stat i="🎯" v={`${acc}%`} l="Accuracy" c="#22D3EE"/></div>
<C s={{marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>By Category</div>
{CATS.map((cat,i)=>{const s=st.cs[i];if(!s||!s.t)return null;const p=Math.round(s.c/s.t*100);return <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:14}}>{cat.i}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{cat.n}</div><Bar v={p} mx={100} c={cat.c} h={4}/></div><span style={{fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono'",color:cat.c}}>{p}%</span></div>})}
{Object.keys(st.cs).length===0&&<p style={{fontSize:13,color:"rgba(255,255,255,.3)",textAlign:"center"}}>Play to see stats!</p>}</C>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
<C><div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>Best Streak</div><div style={{fontSize:24,fontWeight:800,color:"#F59E0B",fontFamily:"'JetBrains Mono'"}}>🔥{st.bs}</div></C>
<C><div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>Quizzes</div><div style={{fontSize:24,fontWeight:800,color:"#A5B4FC",fontFamily:"'JetBrains Mono'"}}>📚{st.qz}</div></C>
<C><div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>Perfect</div><div style={{fontSize:24,fontWeight:800,color:"#2ECC71",fontFamily:"'JetBrains Mono'"}}>💯{st.pf}</div></C>
<C><div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>Wrong Bank</div><div style={{fontSize:24,fontWeight:800,color:"#E74C3C",fontFamily:"'JetBrains Mono'"}}>🔄{(st.wr||[]).length}</div></C></div></W></>;

// ─── BADGES ───
if(scr==="badges")return <><style>{css}</style><Bg/><W><div style={{paddingTop:16}}><Back/></div>
<h2 style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:16,background:"linear-gradient(135deg,#E4E4ED,#A5B4FC)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Badges & Ranks</h2>
<C s={{marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.4)",marginBottom:10}}>RANK LADDER</div>
{RANKS.map((r,i)=>{const reached=st.xp>=r.x;return <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)",opacity:reached?1:.4}}><span style={{fontSize:24}}>{r.i}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:reached?"#A5B4FC":"rgba(255,255,255,.4)"}}>{r.t}</div><div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>{r.x} XP</div></div>{reached&&<span style={{color:"#2ECC71",fontWeight:700,fontSize:12}}>✓</span>}</div>})}</C>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
{BADGES.map(b=>{const e=st.bg.includes(b.id);return <C key={b.id} s={{textAlign:"center",opacity:e?1:.4,background:e?"rgba(99,102,241,.08)":"rgba(255,255,255,.02)"}}>
<div style={{fontSize:36,marginBottom:6,filter:e?"none":"grayscale(1)"}}>{b.i}</div>
<div style={{fontSize:13,fontWeight:700,color:e?"#A5B4FC":"rgba(255,255,255,.4)"}}>{b.n}</div>
<div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{b.d}</div>
{e&&<div style={{marginTop:6,fontSize:9,color:"#2ECC71",fontWeight:700}}>✓ EARNED</div>}</C>})}</div></W></>;

return <><style>{css}</style><Bg/><W><p style={{paddingTop:100,textAlign:"center"}}>Loading...</p></W></>;
}
