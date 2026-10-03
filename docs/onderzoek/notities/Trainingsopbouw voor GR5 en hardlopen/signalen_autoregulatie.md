# Signals for autoregulation: progress, hold, or scale back (recreational GR5 trekker + runner, Garmin FR255)

Evidence grades used below: **Strong** = consistent meta-analyses / large RCTs; **Moderate** = several RCTs or a systematic review with heterogeneity; **Weak** = single small studies, observational data, vendor data; **Expert opinion** = consensus statements, coaching heuristics, blogs.

## 1. Session RPE (Foster), RPE drift for a fixed session, talk test

### Takeaway
Session RPE (RPE x minutes) is a valid, reliable, cheap internal-load measure and can stand alone for load monitoring (Moderate–Strong for *monitoring*); there is little direct evidence for using RPE drift on a fixed session as a *progression trigger*, so that use is a reasonable inference / expert practice rather than tested rule. The talk test validly marks the ventilatory/lactate threshold and is useful for keeping "easy" sessions easy (Moderate).

### Cited Findings
- Haddad et al. 2017 (Frontiers in Neuroscience 11:612) review: studies "confirmed the validity and good reliability and internal consistency of session-RPE method in several sports and physical activities with men and women of different age categories ... among various expertise levels"; the method "could be used as a 'standing alone' method for training load monitoring purposes though some recommend to combine it with other physiological parameters as heart rate." (Grade: Moderate–Strong for monitoring load) — [Haddad et al. 2017](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full)
- A 2024 review applies session-RPE to elite endurance athletes' load monitoring (confirms ongoing use in endurance sport) — [Research application of session-RPE in elite endurance athletes (PMC11155691)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11155691/)
- Talk test (Reed & Pipe 2014, Curr Opin Cardiol): comfortable speech is likely possible when intensity is below the ventilatory/lactate threshold and not possible above it; valid in "competitive athletes, healthy active adults and patients with cardiovascular disease" and consistent across modes (treadmill, walking, jogging, cycling, stair stepper). (Grade: Moderate) — [Reed & Pipe 2014 (ResearchGate)](https://www.researchgate.net/publication/263814983_The_talk_test_A_useful_tool_for_prescribing_and_monitoring_exercise_intensity); [Validity of talk test in cardiac patients, PubMed 32604216](https://pubmed.ncbi.nlm.nih.gov/32604216/)
- Subjective measures (incl. perceived exertion/fatigue) respond to acute and chronic load changes with better sensitivity than common objective markers (see section 4, Saw et al. 2016). — [Saw et al. 2016 (Semantic Scholar)](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)

### Inferences
- ASCEND already logs duration + RPE, so sRPE load (RPE x min) per session and per week is computable with zero extra burden. Use it to compute the weekly load and, optionally, Foster-style "monotony/strain" — but keep it as a descriptive number, not a hard trigger (see ACWR caveats in section 5).
- "RPE drift" rule: for a recurring benchmark session (e.g., the same easy 45-min run, or a fixed hike/loaded stair session with the same pack), an RPE that is >=2 points above the athlete's usual value for that session at equal duration/pace, or rising across 2+ consecutive exposures, is a plausible fatigue flag; RPE at or below target for 2 weeks is a plausible "ready to progress" signal. This is **expert-opinion / inference** — no trial was found that tested RPE-drift thresholds as the progression rule.
- Talk test can be shown as an in-app cue for easy/zone-2 sessions ("you should be able to speak full sentences"), especially on climbs with a pack where pace is meaningless.

### Gaps
- No published validated threshold (e.g., "+1 vs +2 RPE points") for RPE drift on a fixed session as a fatigue/progression marker was found.
- Foster's original 1998/2001 papers (monotony, strain) were not retrieved directly in this session; their use is cited only via the Haddad review.

## 2. Heart-rate based signals: resting HR, HR drift / aerobic decoupling (Pa:HR), pace/speed at fixed HR

### Takeaway
Submaximal exercise HR (HR at a fixed speed, or speed at a fixed HR) is the most reliable HR measure (CV ~3%) and has been used successfully in a published autoregulation RCT with a ±3–4 bpm threshold (Moderate). Resting HR is noisy (CV ~10%) and only modestly informative; HR recovery is very noisy (CV ~25%). Aerobic decoupling <5% is a widely used coaching heuristic, not a validated threshold (Expert opinion). Interpretation of HR changes is ambiguous (lower HR can mean fitness *or* fatigue).

### Cited Findings
- Buchheit 2014 (Front Physiol) typical error / CV: resting HR ~10%, resting lnRMSSD ~12%, **submaximal exercise HR ~3%**, post-exercise HR recovery (HRR60s) ~25%, post-exercise HRV ~16% (lnRMSSD) to ~65% (LF/HF). Smallest worthwhile changes: resting HR ~ −2%, resting vagal HRV ~ +3%, exercise HR ~ −1%, HRR ~ +7%. — [Buchheit 2014, PMC3936188](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)
- Buchheit 2014: measures from 5-min (near-daily) resting recordings and submaximal exercise HR (30–60 s average) "are likely the most useful monitoring tools"; correlations with performance "could only be observed using the average of at least 3–4 days of HR and HRV data"; "An increased HR should not be used as a clear marker of fatigue and/or fitness impairment." — [Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)
- Buchheit 2014: resting HR is only slightly weaker than vagal HRV for tracking non-functional overreaching trends (r = 0.81 vs 0.88). — [Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)
- Nuuttila et al. 2022 (MSSE) individualized-training RCT in recreational runners used an **HR–running speed index** from minutes 5:00–10:00 of runs (average speed vs average HR); "the maximum decrement of 0.50 compared with previous 2-wk average, equivalent to 3- to 4-bpm increase in HR at the same running speed, was defined as normal" — larger decrements counted as a negative marker. (Grade: Moderate — single RCT, n=30 completers) — [Nuuttila et al. 2022, PMC9473708](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)
- Aerobic decoupling (Pa:HR / Pw:HR, first vs second half of a steady effort): <5% = good aerobic endurance at that intensity, 5–10% = moderate limitation/fatigue, >10% = above aerobic threshold or insufficient endurance. This is Joe Friel's coaching threshold, not a validated scientific cut-off. (Grade: Expert opinion) — [TrainingPeaks coach blog](https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/); [Uphill Athlete HR drift test](https://uphillathlete.com/aerobic-training/heart-rate-drift/)
- A blog claim that the HR drift test "correlates at 95%+ with laboratory gas exchange testing" appeared in search results but no primary study backing it was found — treat as unverified. — [search result aggregator: hashiri.ai](https://hashiri.ai/knowledge/heart-rate-drift)
- A 2025 study proposes machine-learning quantification of training response from cardiovascular drift in cycling (exploratory). — [PMC12271085](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12271085/)

### Inferences
- With a chest strap, the FR255 gives accurate exercise HR, so "HR at a fixed easy pace on a flat benchmark route" (or "pace at a fixed HR") is the best objective fitness/fatigue marker ASCEND can compute from data it already logs (duration, distance, avg HR). Because single-session noise (~3% CV ≈ 4 bpm at 130 bpm) exceeds the SWC (~1%), compare a 2-week rolling average, not single sessions, and only on comparable sessions (same route/terrain, similar temperature).
- Avg HR over a hilly hike is heavily confounded by D+, pack weight, heat and altitude; do not use hike HR/pace as a fitness marker unless normalized (e.g., same route with same pack). Use flat-ish runs for the HR-speed index.
- Decoupling requires within-session splits (first vs second half) that ASCEND does not log (it only logs averages). It is therefore only usable if imported from Garmin/FIT later; keep it optional and informational.
- Resting HR (if entered manually from Garmin's overnight RHR) is a reasonable secondary flag only when the 7-day average rises clearly above the athlete's baseline (e.g., >= ~5 bpm); this threshold is an inference from the CV/SWC figures, not a tested rule.

### Gaps
- No validated threshold found for resting-HR elevation as a weekly "reduce" trigger in recreational athletes.
- No study found validating aerobic decoupling percentages against physiological thresholds or as a progression gate.

## 3. HRV-guided training vs predefined plans; practical rules

### Takeaway
HRV-guided training gives small, mostly non-significant advantages for VO2max and performance, a moderate advantage for submaximal markers (thresholds), and fewer non-/negative responders (Moderate). The standard rule is: 7-day rolling average of lnRMSSD compared with a baseline band of mean ± 0.5 SD (SWC); inside the band → planned/harder training; outside → easier training. Garmin's HRV Status on the FR255 implements essentially this logic (7-day average vs baseline range), but Garmin wrist HRV agrees less well with ECG than some competitors.

### Cited Findings
- Düking et al. 2021 (J Sci Med Sport) meta-analysis, 8 studies / 198 participants: HRV-guided training had a significant medium-sized effect on submaximal physiological parameters (g = 0.296, 95% CI 0.031–0.562, p = 0.028) but "only a small and non-significant influence on performance and V̇O2peak"; fewer non-responders for performance. (Grade: Moderate) — [Düking et al. 2021, PubMed 34489178](https://pubmed.ncbi.nlm.nih.gov/34489178/)
- Manresa-Rocamora et al. 2021 (IJERPH) meta-analysis, 8 studies / 199 participants: VO2max SMD 0.13 (−0.12 to 0.39, p = 0.30); endurance performance SMD 0.20 (−0.09 to 0.48); VT2 capacity SMD 0.26 (−0.05 to 0.57); standing RMSSD/SD1 SMD 0.50 (0.09 to 0.91, significant). Conclusion: HRV-guided training "may be more effective than predefined training for maintaining and improving vagal-mediated HRV, with less likelihood of negative responses. However, if HRV-guided training is superior ... it is only by a small margin." 75% of interventions were ≤8 weeks; applies to healthy adults 22–39 y. — [Manresa-Rocamora et al. 2021, PMC8507742](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)
- Rules used in trials (from Manresa-Rocamora 2021): Javaloyes et al. 2020 — RMSSD, 7-day average, fixed reference of 28 values, mean ± 0.5·SD; Kiviniemi et al. 2007 — single-day HF vs moving 10-day reference, mean − 1·SD: high intensity when HRV not suppressed, low intensity when suppressed. Half the studies used single-day values with a moving reference, half used rolling averages with a fixed reference. — [PMC8507742](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)
- Vesterinen et al. 2016 (MSSE 48(7):1347–54), 40 recreational runners: moderate/high-intensity sessions were programmed only if HRV was within the individual SWC (mean ± 0.5 × SD of lnRMSSD from familiarization); HRV-guided training improved performance more than predefined and used fewer moderate/high sessions. — [Vesterinen et al. 2016, PubMed 26909534](https://pubmed.ncbi.nlm.nih.gov/26909534/)
- Schaffarczyk & Sperlich 2026 (Front Sports Act Living) perspective: the main limitation "is no longer the availability of physiological data, but the lack of transparent and physiologically grounded decision frameworks"; thresholds remain "highly study-specific"; commercial composite readiness scores are "black boxes"; PPG-derived pulse-rate variability "should not be considered fully interchangeable" with ECG HRV but provides "acceptable estimates for standardized longitudinal monitoring"; favourable adaptation = rising lnRMSSD with low/reduced lnRMSSD CV. (Grade: Expert opinion) — [Schaffarczyk & Sperlich 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1858271/full)
- Buchheit 2014: under heavy training, vagal HRV can paradoxically *increase* (parasympathetic saturation, typically when R-R > 1000 ms), so a high HRV is not always "recovered"; recommends at least 3–4 recordings per week and averaging. — [Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)
- Garmin FR255 HRV Status: measured from wrist HR during sleep; needs three weeks of consistent sleep data; compares "seven-day average HRV" to "your baseline range": Balanced (within baseline), Unbalanced (above or below baseline), Low (well below baseline), Poor (well below normal for age), No Status. (Vendor documentation) — [Garmin FR255 manual: HRV Status](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-9282196F-D969-404D-B678-F48A13D8D0CB.html)
- Validity of Garmin nocturnal HRV: Dial et al. 2025 (Physiological Reports) compared nocturnal RHR/HRV from five wearables with ECG; per search-result summaries Garmin (Fenix 6) showed the poorest HRV agreement (reported CCC 0.87, MAPE 10.52% ± 8.63%), Oura best, WHOOP acceptable. Full text was not accessible (HTTP 403), so the numbers are from secondary summaries. (Grade: Weak–Moderate, small sample) — [Dial et al. 2025](https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527); [secondary summary, sensai.fit](https://www.sensai.fit/blog/wearable-hrv-accuracy-validation-studies-2026)
- A vendor-adjacent analysis (Labfront) reports that older Garmin beat-to-beat processing overestimated low and underestimated high RMSSD, and that "Enhanced BBI" on newer Garmin generations removes this non-linear bias (mean offset ≈ +8 ms). Whether the FR255 uses Enhanced BBI was not established. (Grade: Weak) — [Labfront](https://www.labfront.com/article/garmin-enhanced-bbi-hrv-accuracy-validation)

### Inferences
- For a weekly (not daily) decision, Garmin's HRV Status category is a usable, low-burden input because its logic (7-day avg vs personal baseline band) mirrors the research rule; absolute RMSSD values are less trustworthy than the trend within one device. Map: Balanced → no flag; Unbalanced → soft flag; Low → strong flag; No Status → ignore.
- Because the benefit of HRV guidance over a sensible plan is small at group level, HRV should be one input among several (not the sole gate), and the app must work fully without it (no Garmin integration yet; manual entry optional).
- The evidence base is for *daily intensity selection*, not weekly volume progression; applying it to a weekly progress/hold/reduce decision is an extrapolation.

### Gaps
- No study found testing HRV-guided progression specifically for hiking/trekking or loaded walking.
- Whether the FR255 HRV Status baseline band corresponds to ±0.5 SD (or another width) is not published by Garmin.
- No independent validation of the FR255 specifically was found.

## 4. Sleep, mood, soreness/DOMS, wellness questionnaires

### Takeaway
Subjective self-reports (wellness, mood, fatigue, soreness, perceived recovery) track training load changes more sensitively and consistently than common objective markers, and they often do not correlate with objective markers — i.e., they carry independent information (Moderate–Strong, systematic review of 56 studies). A simple "feel worse than usual" log plus soreness/fatigue items is evidence-supported.

### Cited Findings
- Saw, Main & Gastin 2016 (BJSM) systematic review of 56 studies with concurrent subjective and objective measures: "Subjective and objective measures of athlete well-being generally did not correlate"; subjective measures "reflected acute and chronic training loads with superior sensitivity and consistency than objective measures"; well-being was impaired with acute load increases and chronic training and improved with acute load decreases; subjective measures "may stand alone or be incorporated into a mixed methods approach." — [Saw et al. 2016 (Semantic Scholar)](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7); [ResearchGate copy](https://www.researchgate.net/publication/282360724_Monitoring_the_athlete_training_response_Subjective_self-reported_measures_trump_commonly_used_objective_measures_A_systematic_review)
- Nuuttila et al. 2022 used a 1–7 scale for muscle soreness, fatigue, sleep quality and stress, with values >5 "associated with staleness" counted as a negative marker in the adjust-load decision. — [Nuuttila et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)
- A practical review notes subjective load monitoring needs standardised, consistent implementation to be useful. — [Current State of Subjective Training Load Monitoring, Sports Med Open 2018](https://link.springer.com/article/10.1186/s40798-018-0172-x)

### Inferences
- ASCEND's three-level "better/normal/worse than usual" feel is a coarse but evidence-consistent wellness item. A single optional extra item — "pain/soreness that changes how you move (yes/no)" — would capture the most decision-relevant information (injury risk) at minimal burden.
- Downhill-heavy mountain sessions (eccentric loading) cause DOMS that HR-based metrics miss (see section 5, Recovery Time); a soreness item is therefore particularly important for GR5 preparation.
- Use counts over the week (e.g., ≥2 "worse" sessions) rather than single responses, since single subjective reports are noisy.

### Gaps
- No validated threshold for a 3-level feel item was found; the ">5 on 1–7" cut-off from Nuuttila is the closest published anchor.
- Sleep-specific thresholds (hours, Garmin sleep score) as progression gates were not researched in depth here.

## 5. Garmin metrics: Training Status, Acute Load, Load Focus, Recovery Time, HRV Status, Body Battery, Training Readiness

### Takeaway
Garmin/Firstbeat metrics are mostly proprietary composites with little or no independent validation as decision tools (Weak / vendor data). HRV Status (trend vs own baseline) and the raw Acute Load trend are the most defensible to use as soft inputs; Training Status depends on VO2max-estimate trends that are noisy on hilly/trail terrain; Recovery Time and Body Battery are unvalidated and should be informational only. The **FR255 does not have Training Readiness**.

### Cited Findings
- FR255 Training Status "is based on changes to your VO2 max., acute load, and HRV status over an extended time period." (Vendor documentation) — [Garmin FR255 manual: Training Status](https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-4663DDC6-A6DF-4C1B-98E0-270DA60EC4F2-8699.html)
- Training Readiness is not available on the FR255 (user forum threads with consistent reports; Garmin's own FR265 manual documents it for that model). (Grade: Weak but consistent; confirm in the FR255 manual) — [Garmin forum: Why doesn't FR 255 have Training Readiness?](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/424837/why-doesn-t-fr-255-have-training-readiness); [FR265 manual: Training Readiness](https://www8.garmin.com/manuals/webhelp/GUID-F41EAFB3-6CC9-42DE-9C6C-9E358DBB0671/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html)
- Firstbeat load: session load is based on EPOC predicted from heart-beat data (intensity as %VO2max × time); Acute Training Load is derived from the TRIMP/EPOC sum of the last 7 days compared to a personalised scale; Firstbeat Sports' Training Status incorporates acute load and acute:chronic workload ratio. (Vendor white papers — potential bias) — [Firstbeat EPOC white paper](https://www.firstbeat.com/wp-content/uploads/2015/10/white_paper_epoc.pdf); [Firstbeat EPOC & Training Effect](https://www.firstbeat.com/en/science-and-physiology/epoc-and-training-effect/); [Firstbeat Sports Training Status](https://support.firstbeat.com/hc/en-us/articles/360024695553-Feature-Firstbeat-Sports-Training-Status)
- VO2max estimate validity (Forerunner 245, independent, 2025): MAPE 7.9% and 7.2% across two runs, underestimation of −4.73 and −4.05 ml/kg/min; moderately trained athletes MAPE 2.8–4.1% (ICC 0.63–0.66), highly trained MAPE 9.4–10.4% (ICC 0.34–0.41). Firstbeat's own validation claimed ~95% accuracy (MAPE ~5%) over 2690 runs from 79 runners. (Grade: Moderate for the independent study) — [Validity of VO2max estimates from FR245, PMC12881131](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12881131/)
- No independent validation found for Training Readiness, Recovery Time or Body Battery against lab recovery markers; Recovery Time is EPOC-based and HR-based recovery models are argued to underestimate neuromuscular recovery after eccentric-dominant exercise; Body Battery "can't distinguish between productive training fatigue and problematic accumulated stress." (Grade: Expert opinion / tech-blog) — [the5krunner: Recovery Time](https://the5krunner.com/garmin-features/training/recovery-time/); [the5krunner: Body Battery](https://the5krunner.com/garmin-features/sleep/body-battery/); [the5krunner: Training Readiness](https://the5krunner.com/garmin-features/training/training-readiness/)
- Critical tech-press view that Firstbeat-derived stats (e.g., training status/load outputs) can be "simply wrong" in practice. (Opinion) — [the5krunner 2022](https://the5krunner.com/2022/08/01/garmin-is-broken-firstbeat-stats-are-simply-wrong/)
- Acute:chronic workload ratio, which underlies "load balance"/status-type metrics: Impellizzeri et al. 2020 (IJSPP) — "There is no evidence supporting the use of ACWR in training-load-management systems or for training recommendations aimed at reducing injury risk"; ratio has statistical artefacts and arbitrary windows. (Grade: Moderate, critical methodological review) — [Impellizzeri et al. 2020, IJSPP](https://journals.humankinetics.com/view/journals/ijspp/15/6/article-p907.xml); [Training Load and Injury Prevention Part 2, PMC7534938](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/)

### Inferences
- Reasonable to use (as soft inputs, manually entered or later via the `DataSourceAdapter` with `source: 'garmin'`): **HRV Status category** (best of the bunch), **resting HR trend**, and the **direction** of Acute Load (to sanity-check that the planned load is actually happening).
- Use only informationally: **Training Status** (VO2max-trend driven; hiking with pack and trail running depress pace-based VO2max estimates, so "Unproductive/Detraining" labels can be artefacts), **Load Focus** (descriptive intensity distribution; fine for showing whether easy volume dominates, not a gate), **Recovery Time** (EPOC-based; misses downhill eccentric damage), **Body Battery** (unvalidated composite).
- Not available: **Training Readiness** on FR255 — the app should not depend on it.
- The ASCEND rule engine should consume generic shapes (e.g., `RecoveryMetric { kind: 'hrv-status', value: 'balanced'|'unbalanced'|'low', source }`), consistent with the project's adapter rule, not Garmin-named fields.

### Gaps
- No peer-reviewed independent validation found for Garmin Training Status, Load Focus, Recovery Time, Body Battery.
- Garmin does not publish the width of the HRV Status baseline band or the exact Training Status decision logic.

## 6. Overreaching / overtraining warning signs (Meeusen et al. 2013)

### Takeaway
The ECSS/ACSM consensus frames a continuum: functional overreaching (performance dip, recovers in days, leads to supercompensation) → non-functional overreaching (weeks–months) → overtraining syndrome (months–years). There is no single diagnostic marker; a sustained, unexplained performance decrement despite rest, together with mood/sleep disturbances, is the core warning sign (Expert consensus).

### Cited Findings
- Meeusen et al. 2013, Eur J Sport Sci 13(1):1–24, joint ECSS/ACSM consensus (authors incl. Meeusen, Duclos, Foster, Fry, Gleeson, Nieman, Raglin, Rietjens, Steinacker, Urhausen). — [VUB research portal](https://researchportal.vub.be/en/publications/prevention-diagnosis-and-treatment-of-the-overtraining-syndrome-j/); [Loughborough repository](https://repository.lboro.ac.uk/articles/journal_contribution/Prevention_diagnosis_and_treatment_of_the_overtraining_syndrome_Joint_consensus_statement_of_the_European_College_of_Sport_Science_ECSS_and_the_American_College_of_Sports_Medicine_ACSM_/9627380)
- Functional overreaching = "short-term performance decrement, without severe psychological, or lasting other negative symptoms" that leads to improvement after recovery; when training–recovery balance is not respected, non-functional overreaching can occur; recovery times ~days (FOR), weeks–months (NFOR), months–years (OTS). — [Meeusen et al. 2013 (ResearchGate)](https://www.researchgate.net/publication/262859591_Prevention_diagnosis_and_treatment_of_the_overtraining_syndrome_Joint_consensus_statement_of_the_European_College_of_Sport_Science_ECSS_and_the_American_College_of_Sports_Medicine_ACSM); [UESCA summary](https://uesca.com/overtraining-syndrome/)
- Saw et al. 2016: subjective well-being deteriorates with acute load increases and with chronic training — i.e., wellness logs are the earliest practical warning. — [Saw et al. 2016](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)
- Buchheit 2014: HRV can rise (not fall) in heavily loaded states (parasympathetic saturation), so HRV alone can mislead. — [Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)

### Inferences
- Operational warning pattern for ASCEND (weekly): worse performance on benchmark sessions (higher RPE and/or higher HR at same pace) **plus** worse subjective feel persisting ≥ 1–2 weeks despite a lighter week → "reduce" and suggest checking illness, sleep, life stress; if it persists after a reduce week, advise seeing a doctor. This translates the consensus logic; the specific week counts are inference.
- For a recreational athlete, true OTS is rare; the realistic risk is NFOR from life stress + training, and overuse injuries from too-fast volume ramps (section 8).

### Gaps
- The full symptom list and the consensus's recommended diagnostic checklist / two-bout exercise test were not retrieved verbatim in this session (PDF behind ResearchGate); report writer should not quote specific symptom lists from these notes.

## 7. Autoregulation vs fixed plans in endurance training

### Takeaway
Individualised/autoregulated endurance training performs at least as well as predefined plans and tends to produce more high responders and fewer negative responders (Moderate: a handful of small RCTs and two meta-analyses). Group-mean advantages are small; the main benefit is protection against poor/negative response.

### Cited Findings
- Nuuttila et al. 2022 (MSSE), 15 weeks, 30 recreational runners completing: 10-km time −2.9% ± 2.4% (predefined) vs −6.2% ± 2.8% (individualised), P = 0.002 between groups; maximal treadmill speed +3.0% vs +4.0%; VO2max improved in both with no between-group difference. High responders 23% vs 81%; negative responders 8% vs 0%. — [Nuuttila et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)
- Düking 2021 and Manresa-Rocamora 2021 meta-analyses: small, non-significant benefits for VO2max/performance; medium for submaximal parameters; fewer non-responders / less likelihood of negative responses. — [Düking 2021](https://pubmed.ncbi.nlm.nih.gov/34489178/); [Manresa-Rocamora 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)
- Vesterinen 2016: HRV-guided recreational runners improved more with fewer hard sessions. — [PubMed 26909534](https://pubmed.ncbi.nlm.nih.gov/26909534/)

### Inferences
- The strongest argument for ASCEND's weekly progress/hold/reduce engine is avoidance of bad outcomes (injury, stagnation from fatigue), not a large average fitness gain.
- Mixed-marker frameworks (HRV + HR-speed + subjective) are what showed the largest effects (Nuuttila), supporting a multi-signal majority rule rather than any single metric.

### Gaps
- No autoregulation RCT in hikers/trekkers or with loaded walking was found; transfer from runners is an assumption.
- Trials are short (mostly ≤ 8–15 weeks) and mostly in 20–40-year-olds.

## 8. Concrete decision rules and published frameworks

### Takeaway
The closest published, deterministic framework is Nuuttila et al. 2022: evaluate three markers (nocturnal HRV vs 4-week rolling mean ± 0.5 SD; HR–running-speed index vs previous 2-week average, tolerance ≈ 3–4 bpm; perceived soreness/fatigue >5/7 = negative), then **increase (+5% duration), maintain, or decrease (−25% duration)**, twice weekly. In that trial the outcome was 35% increase / 55% maintain / 10% decrease. Volume ramps >30% over two weeks are associated with more distance-related injuries in novice runners (Moderate, observational).

### Cited Findings
- Nuuttila et al. 2022: three options each evaluation — "increase training load, maintain, or decrease"; volume period: duration +5% increments or −25%; interval period: number of high-intensity sessions 1–3/week; adjusted Mondays and Thursdays; markers: nocturnal HRV "4-wk rolling average ±0.5 × SD" (values outside range negative), muscle soreness/fatigue >5 on 1–7 negative, HR–speed index decrement > 0.50 (≈3–4 bpm) vs previous 2-week average negative. Reported decisions: "55% ± 12% maintained the training load, 35% ± 10% increased the training load, and 10% ± 8% decreased the training load." The exact rule for combining markers is shown in a figure, not as a formula in the text retrieved. Nocturnal HRV was measured with wrist PPG (Polar Vantage V2). — [Nuuttila et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)
- Javaloyes et al. 2020 / Vesterinen 2016 / Kiviniemi 2007: HRV inside SWC (mean ± 0.5 SD, or > mean − 1 SD) → planned moderate/high session; outside → low intensity or rest. — [Manresa-Rocamora 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/); [Vesterinen 2016](https://pubmed.ncbi.nlm.nih.gov/26909534/)
- Nielsen et al. 2014 (JOSPT), 874 novice runners with GPS: those progressing weekly distance by >30% over 2 weeks had more distance-related injuries (e.g., patellofemoral pain, gluteus medius, trochanteric bursitis, ITB/TFL, patellar tendinopathy) than those progressing <10%; no significant difference in overall injury risk across <10%, 10–30%, >30% groups. (Grade: Moderate, observational) — [Nielsen et al. 2014, JOSPT](https://www.jospt.org/doi/10.2519/jospt.2014.5164)
- Systematic reviews on training-load change and running injury conclude the evidence is limited/inconsistent. — [PMC6253751](https://pmc.ncbi.nlm.nih.gov/articles/PMC6253751/); [PMC9528699](https://pmc.ncbi.nlm.nih.gov/articles/PMC9528699/)

### Inferences — proposed deterministic weekly rule set for ASCEND (Expert opinion / synthesis; not itself validated)

Inputs per week (all computable from current logs, Garmin inputs optional):
1. **Pain flag** — any session logged with pain that alters movement (proposed new yes/no field) or a planned session skipped for pain.
2. **Feel** — count of sessions marked "worse than usual".
3. **RPE vs target** — for sessions with a target RPE (or recurring benchmark sessions): mean (logged RPE − target RPE).
4. **HR at fixed pace** — HR–speed index on comparable flat easy runs, current week vs previous 2-week average (flag if HR ≥ ~4 bpm higher at same pace; Nuuttila tolerance 3–4 bpm).
5. **Completion** — % of planned sessions with a `SessionLog` (derived status, consistent with the app's model).
6. *(optional)* **HRV Status** (Garmin category) and/or 7-day resting HR vs baseline.

Decision (evaluate in this order; first match wins):
- **REDUCE** (e.g., −20–30% volume, keep some easy frequency; Nuuttila used −25%) if any of:
  - pain flag present (Expert opinion; overuse injuries are the main risk);
  - ≥ 2 negative markers among {feel ≥ 2× "worse", RPE ≥ target + 2 on average, HR at fixed pace ≥ +4 bpm, HRV Status "Low"};
  - "HOLD" was triggered by fatigue markers for 2 consecutive weeks without improvement (consistent with FOR→NFOR logic, Meeusen 2013).
- **HOLD / consolidate** (repeat last week's load) if any of:
  - exactly 1 negative marker (including HRV Status "Unbalanced" or a 1× "worse" week with RPE > target);
  - completion < ~80% (the planned load was not actually absorbed — progressing on top of missed work is a ramp);
  - illness or unusual life stress noted;
  - the previous week was a progression and this week is its first full exposure (optional, to avoid back-to-back jumps).
- **PROGRESS** (e.g., +5–10% weekly volume or one extra step on the GR5 ladder, keeping two-week change < ~30% per Nielsen) only if:
  - no pain, no negative markers, completion ≥ ~80–90%, and
  - RPE at or below target on benchmark/standard sessions for **2 consecutive weeks** (user's proposed rule; consistent with "average ≥ 3–4 days / multiple exposures" logic from Buchheit).
- **Calibration check**: a sensible rule set should mostly output HOLD; Nuuttila's distribution (≈35% increase, 55% maintain, 10% decrease) is a useful sanity target for simulations of the engine on seed history.
- Keep progression of D+ / pack weight as separate dimensions from running volume: progress one dimension at a time (Expert opinion; no study found).
- Scheduled deload every 3rd–4th week is common coaching practice but no supporting study was retrieved in this session (Expert opinion).

### Gaps
- No published framework specifically for multi-day trekking preparation (pack load, D+ progression) was found.
- Optimal size of progression steps (5% vs 10%) for recreational runners is not established by RCTs; Nuuttila's +5% / −25% are the only trial-tested numbers found.
- The exact marker-combination rule (e.g., "≥ 2 of 3 negative → decrease") from Nuuttila 2022 was not visible in the retrieved text; the "≥ 2 negative markers" rule above is an inference.
- Evidence for the 10% rule specifically is weak/inconsistent; Nielsen showed no overall injury difference across progression groups.
