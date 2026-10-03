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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
    ]
  },
  {
    "title": "Howatson e.a., Trekking poles reduce exercise-induced muscle injury during mountain walking (ScienceDaily-samenvatting)",
    "publisher": "ScienceDaily",
    "url": "https://www.sciencedaily.com/releases/2010/06/100602121000.htm",
    "category": "wetenschap",
    "usedIn": [
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
      "Onderzoek: trainingsopbouw voor de GR5"
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
  }
];
