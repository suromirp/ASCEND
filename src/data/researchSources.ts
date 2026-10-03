// ASCEND — sources from the training-progression research (October 2026)
// that the app's advice draws on but that aren't cited in a guide yet.
// Filled from the research report; shown in the Bronnen library
// (engine/sourceLibrary.ts) next to every other source.

import type { SourceCategory } from '../engine/sourceLibrary';

export interface ResearchSource {
  title: string;
  publisher: string;
  url: string;
  category: SourceCategory;
  meta?: string;
  usedIn: string[];
}

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    "title": "Minetti e.a. 2002, Energy cost of walking and running at extreme uphill and downhill slopes, Journal of Applied Physiology",
    "publisher": "J Appl Physiol",
    "url": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.01177.2001",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Bontemps e.a. 2020, Downhill Running: What Are the Effects and How Can We Adapt? A Narrative Review, Sports Medicine",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Giovanelli e.a., The metabolic costs of walking and running up a 30-degree incline: implications for vertical kilometer foot races",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/318378893_The_metabolic_costs_of_walking_and_running_up_a_30-degree_incline_implications_for_vertical_kilometer_foot_races",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Pandolf equation (Wikipedia)",
    "publisher": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Pandolf_equation",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Metabolic Costs of Military Load Carriage over Complex Terrain, Military Medicine 2018",
    "publisher": "Military Medicine",
    "url": "https://academic.oup.com/milmed/article/183/9-10/e357/5025891",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Ehrström e.a. 2019, Frontiers in Physiology (determinanten van trailprestatie)",
    "publisher": "Frontiers",
    "url": "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.01306/full",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Physiological Indicators of Trail Running Performance: A Systematic Review",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/348853460_Physiological_Indicators_of_Trail_Running_Performance_A_Systematic_Review",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, Muscular Endurance for Mountain Athletes",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/strength-training/muscular-endurance-for-mountain-athletes/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Physiological factors determining downhill vs uphill running, Journal of Science and Medicine in Sport",
    "publisher": "JSAMS",
    "url": "https://www.jsams.org/article/S1440-2440(20)30664-2/fulltext",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Maeo e.a. 2017, Muscle damage after downhill walking and its prevention by a prior bout, PLoS One",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Mountain Hiking: Prolonged Eccentric Muscle Contraction during Simulated Downhill Walking Perturbs Sensorimotor Control (2023)",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10094178/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "HPRC, Load carriage strategies to improve military fitness",
    "publisher": "HPRC",
    "url": "https://www.hprc-online.org/physical-fitness/training-performance/load-carriage-strategies-improve-military-fitness",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Effects of Four Days Hiking on Postural Control, PLoS One",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4406731/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Bohm e.a. 2015, Human tendon adaptation in response to mechanical loading: a systematic review and meta-analysis, Sports Medicine Open",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1186/s40798-015-0009-9",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Knapik e.a. 2012, A Systematic Review of the Effects of Physical Training on Load Carriage Performance, JSCR",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/51842989_A_Systematic_Review_of_the_Effects_of_Physical_Training_on_Load_Carriage_Performance",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, Training for Trekking and Hiking",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/trekking/training-for-trekking-and-hiking/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, Vertical Beast Mode: What Is Muscular Endurance and how do you train it",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/aerobic-training/vertical-beast-mode-what-is-muscular-endurance-why-it-is-important-for-any-alpinist-or-mountaineer-and-how-do-you-train-it/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Effect of a prior bout of preconditioning exercise on muscle damage from downhill walking, Applied Physiology, Nutrition, and Metabolism 2015",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/25693898/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "The Effects of Pre-conditioning on Exercise-Induced Muscle Damage: A Systematic Review and Meta-analysis",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10356650/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Prevention of downhill walking-induced muscle damage by non-damaging downhill walking, PLoS One 2017",
    "publisher": "PLoS One",
    "url": "https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0173909",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Schwameder e.a. 1999, Knee joint forces during downhill walking with hiking poles, Journal of Sports Sciences",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/12692643_Knee_joint_forces_during_downhill_walking_with_hiking_poles",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Howatson e.a., Trekking poles reduce exercise-induced muscle injury during mountain walking (ScienceDaily-samenvatting)",
    "publisher": "ScienceDaily",
    "url": "https://www.sciencedaily.com/releases/2010/06/100602121000.htm",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Hawke en Jensen 2020, Are Trekking Poles Helping or Hindering Your Hiking Experience? A Review, Wilderness and Environmental Medicine",
    "publisher": "SAGE",
    "url": "https://journals.sagepub.com/doi/10.1016/j.wem.2020.06.009",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Eihara e.a. 2022, Heavy Resistance Training Versus Plyometric Training for Improving Running Economy and Running Time Trial Performance, Sports Medicine Open",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9653533/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Llanos-Lagos e.a. 2024, Effect of Strength Training Programs in Middle- and Long-Distance Runners' Economy at Different Running Speeds, Sports Medicine",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11052887/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Coyle, Pope en Orr, Load carriage: minimising soldier injuries through physical conditioning, a narrative review, JMVH",
    "publisher": "JMVH",
    "url": "https://jmvh.org/article/load-carriage-minimising-soldier-injuries-through-physical-conditioning-a-narrative-review-2/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Buist e.a., GRONORUN: graded training programme versus standard programme for novice runners (PubMed)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/17940147/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Damsted e.a. 2018, Is There Evidence for an Association Between Changes in Training Load and Running-Related Injuries? A Systematic Review",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6253751/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Nielsen e.a. 2014, A prospective study on time to recovery and excessive progression in novice runners, JOSPT",
    "publisher": "jospt.org",
    "url": "https://www.jospt.org/doi/10.2519/jospt.2014.5164",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Frandsen, Nielsen e.a. 2025, How much running is too much? Identifying high-risk running sessions (Garmin-RUNSAFE), BJSM",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Frandsen e.a. 2025, volledige tekst BJSM 59:1203-1210 (SDU)",
    "publisher": "findresearcher.sdu.dk",
    "url": "https://findresearcher.sdu.dk/ws/files/295073070/1203.full.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Impellizzeri e.a. 2020, Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls, IJSPP",
    "publisher": "journals.humankinetics.com",
    "url": "https://journals.humankinetics.com/view/journals/ijspp/15/6/article-p907.xml",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Lolli e.a., Mathematical coupling causes spurious correlation within the conventional acute-to-chronic workload ratio calculations",
    "publisher": "semanticscholar.org",
    "url": "https://www.semanticscholar.org/paper/Mathematical-coupling-causes-spurious-correlation-Lolli-Batterham/82ac20419732a7838501199915536bb11bc66c7a",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Alpine Ascents, Mount Kilimanjaro Training",
    "publisher": "alpineascents.com",
    "url": "https://www.alpineascents.com/climbs/mount-kilimanjaro/training/",
    "category": "bergsport",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Oliveira e.a. 2024, Polarized training intensity distribution: a systematic review and meta-analysis",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Casado e.a. 2022, Training Periodization, Methods, Intensity Distribution, and Volume in Highly Trained and Elite Distance Runners: A Systematic Review, IJSPP",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/359923898_Training_Periodization_Methods_Intensity_Distribution_and_Volume_in_Highly_Trained_and_Elite_Distance_Runners_A_Systematic_Review",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Reed en Pipe 2014, The talk test: a useful tool for prescribing and monitoring exercise intensity, Current Opinion in Cardiology",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/263814983_The_talk_test_A_useful_tool_for_prescribing_and_monitoring_exercise_intensity",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Barnes e.a. 2013, Effects of different uphill interval-training programs on running economy and performance, IJSPP",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/23538293/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Outside Run, Hill Repeat Progression",
    "publisher": "run.outsideonline.com",
    "url": "https://run.outsideonline.com/training/workouts/hill-repeat-progression/?scope=anon",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Coach Ray, Jack Daniels' Running Intensity",
    "publisher": "coachray.nz",
    "url": "https://www.coachray.nz/2023/05/03/jack-daniels-running-intensity/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Stew Smith, Rucking Progression: Rules of Rucking",
    "publisher": "stewsmithfitness.com",
    "url": "https://www.stewsmithfitness.com/blogs/news/rucking-progression-rules-of-rucking",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Orr e.a., Soldier Load Carriage, Injuries, Rehabilitation and Physical Conditioning (PMC)",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Coleman e.a. 2024, Gaining more from doing less? The effects of a one-week deload period during supervised resistance training",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10809978/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Mølmen e.a. 2019, Block periodization of endurance training: a systematic review and meta-analysis (PubMed)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/31802956",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, Training for Mountaineering",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/mountaineering/training-for-mountaineering/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Bosquet e.a. 2007, Effects of tapering on performance: a meta-analysis (samenvatting SDSU Coaching Science Abstracts)",
    "publisher": "coachsci.sdsu.edu",
    "url": "https://coachsci.sdsu.edu/csa/vol131/bosquet.htm",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Training for a (half-)marathon: training volume and longest endurance run related to performance and running injuries, Scand J Med Sci Sports",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7496388/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Trail Runner, Mastering the Long Run",
    "publisher": "trailrunnermag.com",
    "url": "https://www.trailrunnermag.com/training/mastering-the-long-run/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Saw, Main en Gastin 2016, Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures, BJSM",
    "publisher": "semanticscholar.org",
    "url": "https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Haddad e.a. 2017, Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors, Frontiers in Neuroscience",
    "publisher": "Frontiers",
    "url": "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Buchheit 2014, Monitoring training status with HR measures: do all roads lead to Rome?, Frontiers in Physiology",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Nuuttila e.a. 2022, Individualized Endurance Training Based on Recovery and Training Status in Recreational Runners, MSSE",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "TrainingPeaks, Aerobic Endurance and Decoupling",
    "publisher": "trainingpeaks.com",
    "url": "https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Düking e.a. 2021, Heart rate variability-guided training: a systematic review and meta-analysis, J Sci Med Sport (PubMed)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/34489178/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Manresa-Rocamora e.a. 2021, Heart Rate Variability-Guided Training for Enhancing Cardiac-Vagal Modulation, Aerobic Fitness, and Endurance Performance: A Methodological Systematic Review with Meta-Analysis, IJERPH",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Vesterinen e.a. 2016, Individual Endurance Training Prescription with Heart Rate Variability, MSSE (PubMed)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/26909534/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Meeusen e.a. 2013, Prevention, diagnosis and treatment of the overtraining syndrome: joint consensus statement of the ECSS and ACSM",
    "publisher": "researchportal.vub.be",
    "url": "https://researchportal.vub.be/en/publications/prevention-diagnosis-and-treatment-of-the-overtraining-syndrome-j/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Garmin Forerunner 255, handleiding: HRV Status",
    "publisher": "Garmin",
    "url": "https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-9282196F-D969-404D-B678-F48A13D8D0CB.html",
    "category": "garmin",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Dial e.a. 2025, validatie van nachtelijke rusthartslag en HRV van vijf wearables tegen ECG, Physiological Reports",
    "publisher": "physoc.onlinelibrary.wiley.com",
    "url": "https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Garmin Forerunner 255, handleiding: Training Status",
    "publisher": "Garmin",
    "url": "https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-4663DDC6-A6DF-4C1B-98E0-270DA60EC4F2-8699.html",
    "category": "garmin",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Validity of VO2max estimates from the Garmin Forerunner 245",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12881131/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Firstbeat, EPOC-based training load white paper",
    "publisher": "firstbeat.com",
    "url": "https://www.firstbeat.com/wp-content/uploads/2015/10/white_paper_epoc.pdf",
    "category": "garmin",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "the5krunner, Garmin Recovery Time",
    "publisher": "the5krunner.com",
    "url": "https://the5krunner.com/garmin-features/training/recovery-time/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "the5krunner, Garmin Body Battery",
    "publisher": "the5krunner.com",
    "url": "https://the5krunner.com/garmin-features/sleep/body-battery/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Garmin-forum, Why doesn't FR 255 have Training Readiness?",
    "publisher": "Garmin",
    "url": "https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/424837/why-doesn-t-fr-255-have-training-readiness",
    "category": "garmin",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Videbæk e.a. 2015, Incidence of Running-Related Injuries Per 1000 h of running in Different Types of Runners: A Systematic Review and Meta-Analysis, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-015-0333-8",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Kakouris, Yener en Fong 2021, A systematic review of running-related musculoskeletal injuries in runners, Journal of Sport and Health Science",
    "publisher": "sciencedirect.com",
    "url": "https://www.sciencedirect.com/science/article/pii/S2095254621000454",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Correia e.a. 2024, umbrella review van risicofactoren voor hardloopblessures, Journal of Sport and Health Science",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11336318/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Orr e.a. 2021, Soldier Load Carriage, Injuries, Rehabilitation and Physical Conditioning: An International Approach, IJERPH",
    "publisher": "mdpi.com",
    "url": "https://www.mdpi.com/1660-4601/18/8/4010",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Knapik e.a. 2004, Soldier load carriage: historical, physiological, biomechanical, and medical aspects, Military Medicine (PubMed)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/14964502/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Schumann e.a. 2022, Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-021-01587-7",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Wilson e.a. 2012, Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises, JSCR",
    "publisher": "journals.lww.com",
    "url": "https://journals.lww.com/nsca-jscr/fulltext/2012/08000/concurrent_training__a_meta_analysis_examining.35.aspx",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Optimizing concurrent training programs: a review, Medicine 2024",
    "publisher": "journals.lww.com",
    "url": "https://journals.lww.com/md-journal/fulltext/2024/12270/optimizing_concurrent_training_programs__a_review.22.aspx",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Blagrove, Howatson en Hayes 2018, Effects of Strength Training on the Physiological Determinants of Middle- and Long-Distance Running Performance: A Systematic Review, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-017-0835-7",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Lauersen, Bertelsen en Andersen 2014, The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials, BJSM",
    "publisher": "static1.squarespace.com",
    "url": "https://static1.squarespace.com/static/55b7ffebe4b0568a75e3316b/t/58331e36e58c627c2abd00b5/1479745080809/Br+J+Sports+Med-2014-Lauersen-871-7.pdf",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Milewski e.a. 2014, Chronic Lack of Sleep is Associated With Increased Sports Injuries in Adolescent Athletes",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/263971781_Chronic_Lack_of_Sleep_is_Associated_With_Increased_Sports_Injuries_in_Adolescent_Athletes",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Chronic lack of sleep is associated with increased sports injury in adolescents: a systematic review and meta-analysis",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/332086833_CHRONIC_LACK_OF_SLEEP_IS_ASSOCIATED_WITH_INCREASED_SPORTS_INJURY_IN_ADOLESCENTS_A_SYSTEMATIC_REVIEW_AND_META-ANALYSIS",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Mountjoy e.a. 2023, IOC consensus statement on Relative Energy Deficiency in Sport (REDs), BJSM",
    "publisher": "IOC",
    "url": "https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/BJSM-IOC-consensus-statement-on-Relative-Energy-Deficiency-in-Sport-REDs.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5",
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Does REDs syndrome exist? (PMC)",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11561064/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Tours du Mont Blanc, Training Plan",
    "publisher": "toursdumontblanc.com",
    "url": "https://toursdumontblanc.com/blog/training-plan",
    "category": "bergsport",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, At-Home Muscular Endurance Workout with Progression",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/strength-training/at-home-muscular-endurance-workout-with-progression/",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Uphill Athlete, ME-workout (PDF)",
    "publisher": "Uphill Athlete",
    "url": "https://uphillathlete.com/wp-content/uploads/2020/04/ME-Uphill-Athlete-Workout-.pdf",
    "category": "training",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Byrnes e.a. 1985, Delayed onset muscle soreness following repeated bouts of downhill running, Journal of Applied Physiology",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/4055561/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Sensorimotorische controle na langdurige excentrische inspanning bij gesimuleerd bergaf wandelen (PMC10094178)",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10094178/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Lauersen e.a. 2018, Strength training as superior, dose-dependent and safe prevention of acute and overuse sports injuries, BJSM",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/327150440_Strength_training_as_superior_dose-dependent_and_safe_prevention_of_acute_and_overuse_sports_injuries_A_systematic_review_qualitative_analysis_and_meta-analysis",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Sports Medicine 2024, meta-analyse van oefenprogramma's ter preventie van hardloopblessures (PMC11127851)",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11127851/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Taddei e.a. 2020, Foot core training to prevent running-related injuries: a survival analysis of a single-blind randomized controlled trial (samenvatting, Lower Extremity Review)",
    "publisher": "lermagazine.com",
    "url": "https://lermagazine.com/issues/february/foot-core-training-to-prevent-running-related-injuries-a-survival-analysis-of-a-single-blind-randomized-controlled-trial",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Trialregistratie voetspiertraining bij lopers, NCT02306148",
    "publisher": "clinicaltrials.gov",
    "url": "https://clinicaltrials.gov/study/NCT02306148",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "CSP, Nordic hamstring exercise halves hamstring injury (samenvatting van van Dyk e.a. 2019)",
    "publisher": "csp.org.uk",
    "url": "https://www.csp.org.uk/frontline/article/nordic-hamstring-exercise-halves-hamstring-injury",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Cuthbert e.a. 2019, The effect of Nordic hamstring exercise intervention volume on eccentric strength and muscle architecture adaptations: a systematic review and meta-analyses",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6942028/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Blagrove, Howatson en Hayes 2018, Effects of strength training on the physiological determinants of middle- and long-distance running performance: a systematic review, Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/29249083/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Llanos-Lagos e.a. 2024, The effect of strength training methods on middle-distance and long-distance runners' athletic performance: a systematic review with meta-analysis, Sports Medicine",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11258194/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Knapik e.a. 2012, A systematic review of the effects of physical training on load carriage performance, JSCR",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/22130400/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "JOSPT 2018, meta-analyse heup- en kniekrachttraining bij patellofemorale pijn",
    "publisher": "jospt.org",
    "url": "https://www.jospt.org/doi/10.2519/jospt.2018.7365",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Systematische review naar heupabductorkracht en blessures bij langeafstandslopers, Journal of Science and Medicine in Sport",
    "publisher": "sciencedirect.com",
    "url": "https://www.sciencedirect.com/science/article/abs/pii/S144024401630202X",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Sportsmith, Training the lower limb for performance and to reduce injury risk",
    "publisher": "sportsmith.co",
    "url": "https://www.sportsmith.co/articles/training-lower-limb-for-performance-and-reduce-injury-risk/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Schumann e.a. 2022, Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis, Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/34757594/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Wilson e.a. 2012, Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises, JSCR",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/51719597_Concurrent_Training_A_Meta-Analysis_Examining_Interference_of_Aerobic_and_Resistance_Exercises",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Behm e.a. 2016, Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals, APNM",
    "publisher": "cdnsciencepub.com",
    "url": "https://cdnsciencepub.com/doi/10.1139/apnm-2015-0235",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Warneke e.a. 2025, meta-analyse rekken en loopeconomie",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12122984/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Ultimate France, Hiking the GR5",
    "publisher": "ultimatefrance.com",
    "url": "https://www.ultimatefrance.com/hiking/french-alps/gr5",
    "category": "bergsport",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "NKBV, De GR5 dwars door de Franse Alpen",
    "publisher": "nkbv.nl",
    "url": "https://nkbv.nl/actueel/blog/de-gr5-dwars-door-de-franse-alpen.html",
    "category": "bergsport",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Luks e.a. 2024, Wilderness Medical Society Clinical Practice Guidelines for the Prevention, Diagnosis, and Treatment of Acute Altitude Illness: 2024 Update",
    "publisher": "SAGE",
    "url": "https://journals.sagepub.com/doi/10.1016/j.wem.2023.05.013",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Wehrlin en Hallén 2006, Linear decrease in VO2max and performance with increasing altitude in endurance athletes, European Journal of Applied Physiology",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/7456729_Linear_decrease_in_VO2max_and_performance_with_increasing_altitude_in_endurance_athletes",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "AAFP 2025, samenvatting van de WMS-richtlijnen voor hitteziekte",
    "publisher": "aafp.org",
    "url": "https://www.aafp.org/pubs/afp/issues/2025/1200/practice-guidelines-heat-illness.html",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Eifling e.a. 2024, Wilderness Medical Society Clinical Practice Guidelines for the Prevention and Treatment of Heat Illness: 2024 Update",
    "publisher": "SAGE",
    "url": "https://journals.sagepub.com/doi/10.1177/10806032241227924",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "GSSI Sports Science Exchange #153, Heat acclimatization to improve athletic performance in warm-hot environments",
    "publisher": "gssiweb.org",
    "url": "https://www.gssiweb.org/sports-science-exchange/article/sse-153-heat-acclimatization-to-improve-athletic-performance-in-warm-hot-environments",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "NATA Position Statement 2017, Fluid replacement for the physically active",
    "publisher": "nata.org",
    "url": "https://www.nata.org/sites/default/files/2025-08/fluid_replacement_for_the_physically_active.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Samenvatting ACSM-aanbevelingen voor vochtvervanging (Race Whitetail)",
    "publisher": "racewhitetail.org",
    "url": "https://www.racewhitetail.org/resources/hydration-new-fluid-replacement-recommendations-acsm",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Échappées Montagnardes, FAQ GR5: tout savoir pour réussir la traversée des Vosges, du Jura et des Alpes",
    "publisher": "echappeesmontagnardes.fr",
    "url": "https://www.echappeesmontagnardes.fr/gr5-grande-traversee-des-vosges-du-jura-et-des-alpes/faq-gr5-tout-savoir-pour-reussir-la-traversee-des-vosges-du-jura-et-des-alpes/",
    "category": "bergsport",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "POWER-studie, energieverbruik met dubbel gelabeld water bij vrouwen op een skitocht naar de Noordpool (PubMed 40588629)",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/40588629/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "American Journal of Physiology 1994, energieverbruik met dubbel gelabeld water op grote hoogte",
    "publisher": "J Appl Physiol",
    "url": "https://journals.physiology.org/doi/abs/10.1152/ajpregu.1994.266.3.R966",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "ACSM, Academy of Nutrition and Dietetics en Dietitians of Canada 2016, Joint Position Statement: Nutrition and Athletic Performance",
    "publisher": "sky.sausport.com",
    "url": "https://sky.sausport.com/wp-content/uploads/2021/02/American-College-of-Sports-Medicine_Joint-Position_Nutrition_and_Athletic_Performance_2016.pdf",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Jones e.a. 1986, The energy cost of women walking and running in shoes and boots, Ergonomics",
    "publisher": "tandfonline.com",
    "url": "https://www.tandfonline.com/doi/abs/10.1080/00140138608968277",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Worthing, Percy en Joslin 2017, Prevention of friction blisters in outdoor pursuits: a systematic review, Wilderness and Environmental Medicine",
    "publisher": "SAGE",
    "url": "https://journals.sagepub.com/doi/10.1016/j.wem.2017.03.007",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Influence of skin hydration level on blisters during hiking (Camino de Santiago)",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11646658/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Prevalence and risk factors of foot dermal lesions during hiking, 2020",
    "publisher": "sciencedirect.com",
    "url": "https://www.sciencedirect.com/science/article/abs/pii/S0965206X20300723",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Plantar pressure responses to backpack load in long-distance hikers",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12821408/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Bohne en Abendroth-Smith 2007, Effects of hiking downhill using trekking poles while carrying external loads, Medicine and Science in Sports and Exercise",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/17218900/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "PLOS ONE, Effects of four days hiking on postural control",
    "publisher": "PLoS One",
    "url": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0123214",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Advnture, How much should your backpack weigh (de 20%-regel)",
    "publisher": "advnture.com",
    "url": "https://www.advnture.com/features/how-much-should-backpack-weigh",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Craven e.a. 2022, Effects of acute sleep loss on physical performance: a systematic and meta-analytical review, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-022-01706-y",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Walsh e.a. 2021, Sleep and the athlete: narrative review and 2021 expert consensus recommendations, BJSM",
    "publisher": "sportgeneeskunde.com",
    "url": "https://www.sportgeneeskunde.com/wp-content/uploads/Br-J-Sports-Med-2021-Walsh-consensus-statement-sleep-and-the-athlete.pdf",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Milewski e.a. 2014, Chronic lack of sleep is associated with increased sports injuries in adolescent athletes",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/25028798/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Johnston e.a. 2020, slaap en leefstijlklachten als risicofactoren voor blessures bij duursporters, Journal of Science and Medicine in Sport (Europe PMC)",
    "publisher": "ebi.ac.uk",
    "url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1016/j.jsams.2019.10.013&resultType=core&format=json",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Jäger e.a. 2017, International Society of Sports Nutrition Position Stand: protein and exercise",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Impey e.a. 2018, Fuel for the work required: a theoretical framework for carbohydrate periodization and the glycogen threshold hypothesis, Sports Medicine",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889771/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Thomas, Erdman en Burke 2016, ACSM Joint Position Statement: Nutrition and Athletic Performance",
    "publisher": "drugfreesport.org.za",
    "url": "http://drugfreesport.org.za/wp-content/uploads/2018/04/Position-stand-on-Nutrition-Athletic-Performance-ACSM-2016-1.pdf",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Nutrients 2024, periodised carbohydrate diet versus high-carbohydrate diet in well-trained cyclists",
    "publisher": "mdpi.com",
    "url": "https://www.mdpi.com/2072-6643/16/2/318",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Murphy en Koehler 2022, Energy deficiency impairs resistance training gains in lean mass but not strength: a meta-analysis and meta-regression, Scandinavian Journal of Medicine and Science in Sports",
    "publisher": "onlinelibrary.wiley.com",
    "url": "https://onlinelibrary.wiley.com/doi/10.1111/sms.14075",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Does REDs syndrome exist? Narratieve review (PMC11561064)",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11561064/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Parr e.a. 2014, Alcohol ingestion impairs maximal post-exercise rates of myofibrillar protein synthesis following a single bout of concurrent training, PLoS One",
    "publisher": "research.bond.edu.au",
    "url": "https://research.bond.edu.au/en/publications/alcohol-ingestion-impairs-maximal-post-exercise-rates-of-myofibri/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Barnes 2014, Alcohol: impact on sports performance and recovery in male athletes, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-014-0192-8",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Pietilä e.a. 2018, Acute effect of alcohol intake on cardiovascular autonomic regulation during the first hours of sleep in a large real-world sample of Finnish employees, JMIR Mental Health",
    "publisher": "mental.jmir.org",
    "url": "https://mental.jmir.org/2018/1/e23/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Return to play after infectious disease (PMC7123245)",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7123245/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Sport and exercise during viral acute respiratory illness: time to revisit, Journal of Sport and Health Science 2023",
    "publisher": "sciencedirect.com",
    "url": "https://www.sciencedirect.com/science/article/pii/S2095254623001187",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "IOC consensus statement on acute respiratory illness in athletes, part 1",
    "publisher": "IOC",
    "url": "https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/Acute-respiratory-illness-in-athletes-part-1.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Triathlete, Exercise after a cold, flu, strep or COVID",
    "publisher": "triathlete.com",
    "url": "https://www.triathlete.com/training/injury-prevention/exercise-after-cold-flu-strep-covid/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Mujika en Padilla, Detraining: loss of training-induced physiological and performance adaptations",
    "publisher": "semanticscholar.org",
    "url": "https://www.semanticscholar.org/paper/Detraining:-Loss-of-Training-Induced-Physiological-Mujika-Padilla/976e67d8710929b988ba84e15d4b1c10e4b09420",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Guest e.a. 2021, International Society of Sports Nutrition position stand: caffeine and exercise performance",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7777221/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Menges, Dindorf, Dully en Fröhlich 2026, systematische review en meta-analyse van fietsen als crosstraining voor lopers, Frontiers in Sports and Active Living",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC13243379/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Paquette e.a. 2018, cross-training op fiets en elliptical bij crosslopers, JSCR",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/29194186/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Foster e.a. 1995, Effects of specific versus cross-training on running performance, European Journal of Applied Physiology",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/7649149/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Tanaka 1994, Effects of cross-training: transfer of training effects on VO2max between cycling, running and swimming, Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/7871294/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Millet, Vleck en Bentley 2009, Physiological differences between cycling and running: lessons from triathletes, Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/19290675/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Pageaux, Theurel en Lepers 2017, neuromusculaire vermoeidheid na fietsen tegenover bergop wandelen, IJSPP",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/28290716/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Olmedillas e.a. 2012, Cycling and bone health: a systematic review, BMC Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/23256921/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Haddad e.a. 2017, Session-RPE method for training load monitoring: validity, ecological usefulness, and influencing factors, Frontiers in Neuroscience",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5673663/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Kodesh e.a. 2024, metabole stress bij fietsen en lopen op gelijke hartslagreserve, European Journal of Sport Science",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11235833",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "run247, How do you convert cross-training time to running miles",
    "publisher": "run247.com",
    "url": "https://run247.com/running-training/how-do-you-convert-cross-training-time-to-running-miles",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Roecker e.a. 2003, Heart-rate recommendations: transfer between running and cycling exercise?, International Journal of Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/12740734/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Wiecha e.a. 2022, maximale hartslag en VO2max op loopband en fiets bij triatleten, IJERPH",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8955092/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Basset en Boulay 2000, Specificity of treadmill and cycle ergometer tests in triathletes, runners and cyclists",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/12676860_Specificity_of_treadmill_and_cycle_ergometer_tests_in_triathletes_runners_and_cyclists",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Vehrs e.a. 2022, vergelijking van maximale hartslag en VO2max op loopband en fiets bij studenten",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9779181/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Garmin fēnix 7, handleiding: hartslagzones instellen per sportprofiel",
    "publisher": "Garmin",
    "url": "https://www8.garmin.com/manuals/webhelp/GUID-C001C335-A8EC-4A41-AB0E-BAC434259F92/EN-US/GUID-30C91919-943C-44E9-8048-901AC0881AEA.html",
    "category": "garmin",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Hansen en Rønnestad 2017, Effects of cycling training at imposed low cadences: a systematic review, IJSPP",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/28095074/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Kristoffersen e.a. 2014, Low cadence interval training at moderate intensity does not improve cycling performance in highly trained veteran cyclists, Frontiers in Physiology",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/24550843/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Doherty e.a. 2020, An evaluation of the training determinants of marathon performance: a meta-analysis with meta-regression, Journal of Science and Medicine in Sport",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/31704026/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Muniz-Pumares e.a. 2025, trainingskenmerken van 119.452 marathonlopers op Strava, Sports Medicine",
    "publisher": "Springer",
    "url": "https://link.springer.com/article/10.1007/s40279-024-02137-7",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Rasmussen e.a. 2013, Weekly running volume and risk of running-related injuries among marathon runners, IJSPT",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/236207919_Weekly_running_volume_and_risk_of_running-related_injuries_among_marathon_runners",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Hal Higdon, Novice 1 marathon training program",
    "publisher": "halhigdon.com",
    "url": "https://www.halhigdon.com/training-programs/marathon-training/novice-1-marathon/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Hal Higdon, Novice base training",
    "publisher": "halhigdon.com",
    "url": "https://www.halhigdon.com/training-programs/base-training/novice-base-training/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "TrainingPeaks, Weekly mileage before starting a marathon training program",
    "publisher": "trainingpeaks.com",
    "url": "https://www.trainingpeaks.com/blog/weekly-mileage-before-starting-a-marathon-training-program/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Esteve-Lanao e.a. 2026, gepolariseerde tegenover piramidale training bij recreatieve marathonlopers, International Journal of Sports Science and Coaching",
    "publisher": "SAGE",
    "url": "https://journals.sagepub.com/doi/10.1177/17479541261468168",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Scientific Reports 2025, piramidale tegenover gepolariseerde training en respondertypes bij recreatieve marathonlopers",
    "publisher": "nature.com",
    "url": "https://www.nature.com/articles/s41598-025-25369-7",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Smyth en Lawlor 2021, Longer disciplined tapers improve marathon performance for recreational runners, Frontiers in Sports and Active Living",
    "publisher": "Frontiers",
    "url": "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2021.735220/full",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "RunnersConnect, Marathon gut training",
    "publisher": "runnersconnect.net",
    "url": "https://runnersconnect.net/marathon-gut-training/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Science in Sport, Inside the science of gut training",
    "publisher": "scienceinsport.com",
    "url": "https://www.scienceinsport.com/sports-nutrition/inside-the-science-of-gut-training/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Viribay e.a. 2020, Effects of 120 g/h of carbohydrates intake during a mountain marathon on exercise-induced muscle damage in elite runners, Nutrients",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7400827/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Marathon Handbook, Cross training for runners",
    "publisher": "marathonhandbook.com",
    "url": "https://marathonhandbook.com/cross-training-for-runners/",
    "category": "training",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Casus van een meerdaagse ultratrail van 768 km in 11 dagen (PMC8776162)",
    "publisher": "PubMed Central",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8776162/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Schoenfeld, Grgic en Krieger 2019, How many times per week should a muscle be trained to maximize muscle hypertrophy?, Journal of Sports Sciences",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/30558493/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Schoenfeld, Ogborn en Krieger 2017, Dose-response relationship between weekly resistance training volume and increases in muscle mass, Journal of Sports Sciences",
    "publisher": "files01.core.ac.uk",
    "url": "https://files01.core.ac.uk/download/pdf/200371264.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Pelland e.a. 2025, The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gains, Sports Medicine",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/41343037/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Pelland en Remmert, preprint over volume per sessie, SportRxiv 537",
    "publisher": "sportrxiv.org",
    "url": "https://sportrxiv.org/index.php/server/preprint/view/537",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Ramos-Campo e.a. 2024, Efficacy of split versus full-body resistance training on strength and muscle growth: a systematic review with meta-analysis, JSCR",
    "publisher": "journals.lww.com",
    "url": "https://journals.lww.com/nsca-jscr/fulltext/2024/07000/efficacy_of_split_versus_full_body_resistance.20.aspx",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "ACSM 2026, Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews (persbericht)",
    "publisher": "acsm.org",
    "url": "https://acsm.org/resistance-training-guidelines-update-2026/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Refalo e.a. 2024, RCT naar nabijheid van spierfalen en hypertrofie, Journal of Sports Sciences",
    "publisher": "tandfonline.com",
    "url": "https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Refalo e.a., Accuracy of intraset repetitions-in-reserve predictions during the bench press exercise in resistance-trained male and female subjects",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/profile/Martin-Refalo-2/publication/375687905_Accuracy_of_Intraset_Repetitions-in-Reserve_Predictions_During_the_Bench_Press_Exercise_in_Resistance-Trained_Male_and_Female_Subjects/links/65d9591fadc608480ae7db13/Accuracy-of-Intraset-Repetitions-in-Reserve-Predictions-During-the-Bench-Press-Exercise-in-Resistance-Trained-Male-and-Female-Subjects.pdf",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Bull e.a. 2020, World Health Organization 2020 guidelines on physical activity and sedentary behaviour, BJSM",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Lundberg e.a. 2022, meta-analyse van gelijktijdige training op vezelniveau",
    "publisher": "PubMed",
    "url": "https://pubmed.ncbi.nlm.nih.gov/35476184/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Robineau e.a. 2016, Specific training effects of concurrent aerobic and strength exercises depend on recovery duration, JSCR",
    "publisher": "semanticscholar.org",
    "url": "https://www.semanticscholar.org/paper/Specific-Training-Effects-of-Concurrent-Aerobic-and-Robineau-Babault/745aa1a9c8ec56a8815895fe71b4cd5feeea9722",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Bell e.a. 2023, Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach, Sports Medicine Open",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Coleman e.a. 2024, Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations, PeerJ",
    "publisher": "peerj.com",
    "url": "https://peerj.com/articles/16777/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Moesgaard e.a. 2022, Effects of periodization on strength and muscle hypertrophy in volume-equated resistance training programs: a systematic review and meta-analysis, Sports Medicine",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/357932732_Effects_of_Periodization_on_Strength_and_Muscle_Hypertrophy_in_Volume-Equated_Resistance_Training_Programs_A_Systematic_Review_and_Meta-analysis",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Iversen, Norum en Schoenfeld 2021, No time to lift? Designing time-efficient training programs for strength and hypertrophy: a narrative review, Sports Medicine",
    "publisher": "ResearchGate",
    "url": "https://www.researchgate.net/publication/352391197_No_Time_to_Lift_Designing_Time-Efficient_Training_Programs_for_Strength_and_Hypertrophy_A_Narrative_Review",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  },
  {
    "title": "Minimal dose resistance training for strength in the general population, Sports Medicine 2024",
    "publisher": "PubMed Central",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11127831/",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: afdalen, tocht, herstel, fietsen, marathon en kracht"
    ]
  }
];
