"""Content used by the seed generator.

SAMPLE DATA for the demo. The obligation catalogue paraphrases the kind of duties found in
Indian mining law (Mines Act 1952, Coal Mines Regulations 2017, Mines Rules 1955, EP Rules 1986,
CLRA 1970, EC/CTO conditions). It is not an official or complete list; the ML engine supplies
the real catalogue.
"""

UG = ["UG", "MIXED"]
OC = ["OC", "MIXED"]

# (code, title, law_ref, category, frequency, severity, evidence_needed, applies_when)
OBLIGATIONS = [
    # ---- safety
    ("SAF-FIRSTAID-W", "Check first-aid boxes and stretchers in every section", "Mines Act 1952 / Mines Rules 1955 (first aid)",
     "safety", "weekly", "medium", "Photo of each first-aid box with checklist", None),
    ("SAF-ROOF-D", "Inspect roof and sides of all working places every shift", "CMR 2017 (roof and side support)",
     "safety", "daily", "critical", "Shift inspection note with geo-tagged photos", {"working_method": UG}),
    ("SAF-SUPPORT-W", "Verify supports follow the Systematic Support Rules at every face", "CMR 2017 (systematic support rules)",
     "safety", "weekly", "high", "Support plan check sheet + photos", {"working_method": UG}),
    ("SAF-GAS-D", "Test for firedamp (methane) at working faces before each shift", "CMR 2017 (gas testing)",
     "safety", "daily", "critical", "Gas test readings entered in the app", {"working_method": UG}),
    ("SAF-GASMON-D", "Check continuous methane monitors and alarm levels", "CMR 2017 (gassy seams)",
     "safety", "daily", "critical", "Monitor reading screenshot / photo", {"working_method": UG, "seam_gas_degree": {"min": 2}}),
    ("SAF-VENT-W", "Measure ventilation air quantity in every district", "CMR 2017 (ventilation)",
     "safety", "weekly", "high", "Air measurement readings", {"working_method": UG}),
    ("SAF-HAUL-D", "Inspect haul roads for spillage, potholes and safety berms", "CMR 2017 (haul roads)",
     "safety", "daily", "high", "Geo-tagged photos of haul road", {"working_method": OC}),
    ("SAF-HEMM-D", "Pre-shift check of dumpers and shovels (brakes, horn, lights, reverse alarm)", "CMR 2017 (machinery)",
     "safety", "daily", "high", "HEMM checklist per machine", {"has_hemm": True}),
    ("SAF-BENCH-W", "Check bench height, width and slope stability", "CMR 2017 (benches and slopes)",
     "safety", "weekly", "high", "Bench survey note + photos", {"working_method": OC}),
    ("SAF-CONV-D", "Inspect conveyor guards, pull-cords and emergency stops", "CMR 2017 (conveyors)",
     "safety", "daily", "high", "Conveyor checklist + photos", {"has_conveyor": True}),
    ("SAF-ELEC-M", "Test earthing and insulation of electrical apparatus", "CEA Safety Regulations (electrical installations)",
     "safety", "monthly", "high", "Earth resistance test report", None),
    ("SAF-EXPL-D", "Reconcile explosives issued, used and returned", "Explosives Rules / CMR 2017 (shot firing)",
     "safety", "daily", "critical", "Explosives reconciliation entry", {"uses_explosives": True}),
    ("SAF-MAG-W", "Inspect explosives magazine (locks, lightning conductor, stock register)", "Explosives Rules (magazines)",
     "safety", "weekly", "high", "Magazine inspection photos", {"uses_explosives": True}),
    ("SAF-FIRE-M", "Check fire extinguishers and fire-fighting equipment", "CMR 2017 (fire precautions)",
     "safety", "monthly", "medium", "Photo of each extinguisher tag", None),
    ("SAF-PUMP-W", "Check dewatering pumps and sump water levels", "CMR 2017 (inundation precautions)",
     "safety", "weekly", "medium", "Pump run log + sump photo", None),
    ("SAF-COMMITTEE-M", "Hold the safety committee meeting and record minutes", "Mines Rules 1955 (safety committee)",
     "safety", "monthly", "medium", "Signed minutes (photo/scan)", {"worker_count": {"min": 100}}),
    ("SAF-VTC-M", "Verify refresher training status of all workers", "Mines Vocational Training Rules 1966",
     "safety", "monthly", "high", "Training status report", None),
    ("SAF-DRILL-Q", "Conduct a mock rescue and evacuation drill", "CMR 2017 (emergency plan)",
     "safety", "quarterly", "high", "Drill report with photos", {"working_method": UG}),
    # ---- environment
    ("ENV-AIR-M", "Monitor ambient air quality (PM10, PM2.5) and record results", "EC condition (air quality monitoring)",
     "environment", "monthly", "medium", "Lab report / monitor readings", None),
    ("ENV-DUST-D", "Run water sprinklers on haul roads and coal yards", "EC condition (dust suppression)",
     "environment", "daily", "medium", "Sprinkler log + photo", {"working_method": OC}),
    ("ENV-WATER-Q", "Test mine discharge water quality", "EP Rules 1986 / CTO condition (effluent)",
     "environment", "quarterly", "medium", "Lab test report", None),
    ("ENV-STATEMENT-Y", "Submit the annual environmental statement", "EP Rules 1986 (environmental statement)",
     "environment", "yearly", "medium", "Submitted statement copy", None),
    ("ENV-GREEN-Q", "Update green belt and plantation progress with photos", "EC condition (green belt)",
     "environment", "quarterly", "low", "Geo-tagged plantation photos", None),
    ("ENV-NOISE-Q", "Monitor noise levels at the lease boundary", "EC condition (noise)",
     "environment", "quarterly", "low", "Noise meter readings", {"working_method": OC}),
    ("ENV-DRAIN-M", "Inspect garland drains and settling ponds", "EC condition (surface water protection)",
     "environment", "monthly", "medium", "Photos of drains and ponds", {"near_water_body": True}),
    ("ENV-FOREST-Q", "Check compliance with forest clearance conditions", "Forest (Conservation) Act conditions",
     "environment", "quarterly", "medium", "Compliance note + photos", {"forest_land": True}),
    ("ENV-CTO-Y", "Renew Consent to Operate before it expires", "Air Act 1981 / Water Act 1974 (CTO)",
     "environment", "yearly", "high", "Renewal application / new CTO", None),
    # ---- labour
    ("LAB-WAGE-M", "Maintain wage register and check minimum wages for contract workers", "CLRA 1970 / Minimum Wages Act",
     "labour", "monthly", "high", "Wage register (scan)", {"contract_worker_count": {"min": 1}}),
    ("LAB-ATTEND-D", "Maintain the daily attendance register for all workers", "Mines Act 1952 (registers)",
     "labour", "daily", "medium", "Attendance summary", None),
    ("LAB-MEDICAL-Y", "Complete periodic medical examination of workers", "Mines Rules 1955 (medical examination)",
     "labour", "yearly", "high", "Medical examination records", None),
    ("LAB-CLRA-Q", "Verify contractor licences are valid", "CLRA 1970 (licensing)",
     "labour", "quarterly", "medium", "Licence copies", {"contract_worker_count": {"min": 1}}),
    ("LAB-HOURS-W", "Check working hours and overtime register", "Mines Act 1952 (hours of work)",
     "labour", "weekly", "low", "Overtime register extract", None),
    # ---- production
    ("PRD-RETURN-M", "Submit the monthly production and despatch return", "Statutory returns (production)",
     "production", "monthly", "medium", "Submitted return copy", None),
    ("PRD-WEIGH-M", "Verify weighbridge calibration", "Legal Metrology (weighbridges)",
     "production", "monthly", "medium", "Calibration certificate", None),
    ("PRD-STOCK-Q", "Physically verify coal stock", "Internal control / statutory audit",
     "production", "quarterly", "medium", "Stock measurement report", None),
]

# mine name -> profile (sample values)
MINE_PROFILES = {
    "Moonidih UG": dict(working_method="UG", depth_m=380, seam_gas_degree=2, worker_count=1450, contract_worker_count=320,
                        production_capacity_mtpa=0.6, uses_explosives=True, has_conveyor=True, has_hemm=False,
                        has_washery=True, near_water_body=False, forest_land=False, state="Jharkhand"),
    "Bastacolla OCP": dict(working_method="OC", depth_m=110, seam_gas_degree=None, worker_count=820, contract_worker_count=410,
                           production_capacity_mtpa=2.5, uses_explosives=True, has_conveyor=False, has_hemm=True,
                           has_washery=False, near_water_body=True, forest_land=False, state="Jharkhand"),
    "Kusunda OCP": dict(working_method="OC", depth_m=140, seam_gas_degree=None, worker_count=960, contract_worker_count=520,
                        production_capacity_mtpa=3.0, uses_explosives=True, has_conveyor=True, has_hemm=True,
                        has_washery=False, near_water_body=True, forest_land=False, state="Jharkhand"),
    "Dhansar UG": dict(working_method="UG", depth_m=290, seam_gas_degree=1, worker_count=610, contract_worker_count=90,
                       production_capacity_mtpa=0.3, uses_explosives=True, has_conveyor=True, has_hemm=False,
                       has_washery=False, near_water_body=False, forest_land=False, state="Jharkhand"),
    "Ashoka OCP": dict(working_method="OC", depth_m=95, seam_gas_degree=None, worker_count=1100, contract_worker_count=600,
                       production_capacity_mtpa=15.0, uses_explosives=True, has_conveyor=True, has_hemm=True,
                       has_washery=False, near_water_body=False, forest_land=True, state="Jharkhand"),
    "Piparwar OCP": dict(working_method="OC", depth_m=85, seam_gas_degree=None, worker_count=900, contract_worker_count=450,
                         production_capacity_mtpa=10.0, uses_explosives=True, has_conveyor=True, has_hemm=True,
                         has_washery=True, near_water_body=True, forest_land=True, state="Jharkhand"),
    "Urimari OCP": dict(working_method="OC", depth_m=75, seam_gas_degree=None, worker_count=540, contract_worker_count=260,
                        production_capacity_mtpa=2.0, uses_explosives=True, has_conveyor=False, has_hemm=True,
                        has_washery=False, near_water_body=False, forest_land=True, state="Jharkhand"),
    "Bhurkunda UG": dict(working_method="UG", depth_m=240, seam_gas_degree=1, worker_count=480, contract_worker_count=60,
                         production_capacity_mtpa=0.25, uses_explosives=False, has_conveyor=True, has_hemm=False,
                         has_washery=False, near_water_body=False, forest_land=False, state="Jharkhand"),
    "Lingaraj OCP": dict(working_method="OC", depth_m=120, seam_gas_degree=None, worker_count=1300, contract_worker_count=700,
                         production_capacity_mtpa=16.0, uses_explosives=True, has_conveyor=True, has_hemm=True,
                         has_washery=False, near_water_body=True, forest_land=False, state="Odisha"),
    "Jagannath OCP": dict(working_method="OC", depth_m=100, seam_gas_degree=None, worker_count=1000, contract_worker_count=520,
                          production_capacity_mtpa=10.0, uses_explosives=True, has_conveyor=False, has_hemm=True,
                          has_washery=False, near_water_body=False, forest_land=False, state="Odisha"),
    "Lajkura OCP": dict(working_method="OC", depth_m=90, seam_gas_degree=None, worker_count=850, contract_worker_count=480,
                        production_capacity_mtpa=12.0, uses_explosives=True, has_conveyor=False, has_hemm=True,
                        has_washery=False, near_water_body=True, forest_land=True, state="Odisha"),
    "Samaleswari OCP": dict(working_method="OC", depth_m=105, seam_gas_degree=None, worker_count=990, contract_worker_count=560,
                            production_capacity_mtpa=15.0, uses_explosives=True, has_conveyor=True, has_hemm=True,
                            has_washery=False, near_water_body=False, forest_land=False, state="Odisha"),
}

CHECKLISTS = [
    ("Daily Haul Road Inspection", "OC", [
        ("HR-1", "Haul road surface free of potholes", "haul_road"),
        ("HR-2", "No coal or material spillage on the road", "haul_road"),
        ("HR-3", "Safety berms at least half the wheel height", "haul_road"),
        ("HR-4", "Road gradient and width as per plan", "haul_road"),
        ("HR-5", "Water sprinkling done (no dust cloud)", "dust"),
        ("HR-6", "Speed limit and caution boards in place", "haul_road"),
        ("HR-7", "Drainage along the road clear", "water"),
        ("HR-8", "Lighting working for night shift", "electrical"),
        ("HR-9", "Dumper reverse alarms working", "machinery"),
        ("HR-10", "Operators wearing PPE", "ppe"),
    ]),
    ("Conveyor Safety Check", None, [
        ("CV-1", "Guards fitted on head, tail and drive pulleys", "conveyor"),
        ("CV-2", "Pull-cord switches working along the full length", "conveyor"),
        ("CV-3", "Emergency stop buttons tested", "conveyor"),
        ("CV-4", "No coal spillage under the belt", "conveyor"),
        ("CV-5", "Belt alignment and splices in good condition", "conveyor"),
        ("CV-6", "Fire extinguisher near drive head", "fire"),
        ("CV-7", "Cables properly supported and insulated", "electrical"),
        ("CV-8", "Crossing points / bridges provided", "conveyor"),
        ("CV-9", "Warning siren before start working", "conveyor"),
        ("CV-10", "Workers wearing PPE", "ppe"),
    ]),
    ("Underground Roof Support Inspection", "UG", [
        ("RS-1", "Roof bolts installed as per support plan", "roof"),
        ("RS-2", "No visible cracks or loose roof", "roof"),
        ("RS-3", "Sides dressed, no loose coal", "roof"),
        ("RS-4", "Props and cogs in position", "roof"),
        ("RS-5", "Telltale / convergence indicators readable", "roof"),
        ("RS-6", "Methane reading below limit", "other"),
        ("RS-7", "Ventilation stoppings intact", "other"),
        ("RS-8", "No water accumulation at the face", "water"),
        ("RS-9", "Stone dust barriers maintained", "fire"),
        ("RS-10", "Cap lamps and self-rescuers carried", "ppe"),
        ("RS-11", "Cables hung properly, no damage", "electrical"),
        ("RS-12", "Escape route marked and clear", "other"),
    ]),
]

# category -> list of finding descriptions
FINDING_TEXTS = {
    "roof": ["Crack observed in roof near junction", "Loose roof at the goaf edge", "Roof bolt missing in gallery",
             "Side spalling near conveyor road", "Convergence indicator showing movement"],
    "haul_road": ["Pothole on haul road near the ramp", "Safety berm eroded along the haul road",
                  "Haul road too narrow at the bend", "Caution board missing at the haul road junction"],
    "conveyor": ["Pull-cord switch not working", "Guard missing at tail pulley", "Belt misaligned and rubbing structure",
                 "Coal spillage below the conveyor belt"],
    "electrical": ["Cable insulation damaged", "Earthing not connected on switchboard", "Open junction box at the face"],
    "fire": ["Fire extinguisher pressure low", "Stone dust barrier not maintained", "Fire extinguisher missing near drive head"],
    "water": ["Water accumulation at the face", "Garland drain choked with silt", "Sump pump not working"],
    "dust": ["Heavy dust on haul road, sprinkler not working", "Dust cloud near the coal yard"],
    "ppe": ["Worker without helmet near the shovel", "Worker without reflective jacket on haul road",
            "Self-rescuer not carried by worker"],
    "machinery": ["Dumper reverse alarm not working", "Shovel brake test overdue", "Dozer operating without a spotter"],
    "explosives": ["Explosives register not updated", "Magazine lightning conductor damaged"],
    "other": ["Escape route not marked", "Ventilation stopping damaged", "First-aid box incomplete"],
}

# The planted recurring violation, written in different words each time.
SPILLAGE_VARIANTS = [
    "Coal spillage on haul road near bench 3",
    "Spilled coal lying on the haul road, slipping hazard for dumpers",
    "Haul road spillage from overloaded dumper",
    "Coal spilled across the haul road at the ramp",
    "Heavy spillage on haul road not cleared since morning",
    "Loose coal spillage on the haul road bend",
    "Material spillage on the main haul road",
]

# Categories most likely per working method (weights)
CATEGORY_WEIGHTS = {
    "UG": {"roof": 30, "conveyor": 14, "electrical": 12, "fire": 10, "water": 10, "ppe": 10, "other": 10, "explosives": 4},
    "OC": {"haul_road": 26, "machinery": 16, "dust": 12, "ppe": 12, "electrical": 8, "water": 8, "fire": 6,
           "explosives": 6, "conveyor": 6},
}

OBSERVATION_TEXTS = {
    "near_miss": ["Dumper nearly hit a light vehicle at the haul road junction",
                  "Loose stone fell close to a worker at the face",
                  "Worker slipped near the conveyor but was not hurt",
                  "Shovel bucket swung close to a helper"],
    "unsafe_condition": ["Water collecting near the sump, pump not running", "Crack seen in the roof near the junction",
                         "Berm damaged at the bend", "Cable lying on wet floor"],
    "unsafe_act": ["Worker crossing the conveyor without using the bridge", "Operator using a mobile phone while driving",
                   "Worker entering the blasting zone after the siren"],
    "incident": ["Worker injured by falling stone at the face", "Dumper toppled at the dump edge, operator injured",
                 "Worker hand caught in conveyor tail pulley", "Minor fire at the conveyor drive head"],
}

# Hindi voice reports: (transcript, type, category, severity, English hazard)
HINDI_VOICE = [
    ("कन्वेयर 3 के पास छत में दरार है", "unsafe_condition", "roof", "high", "Crack in roof near Conveyor 3"),
    ("हॉल रोड पर कोयला गिरा हुआ है, गाड़ी फिसल सकती है", "unsafe_condition", "haul_road", "medium",
     "Coal spilled on haul road, vehicles may skid"),
    ("संप के पास पानी भर रहा है, पंप बंद है", "unsafe_condition", "water", "high", "Water rising near sump, pump off"),
    ("एक मजदूर बिना हेलमेट के काम कर रहा है", "unsafe_act", "ppe", "medium", "Worker working without a helmet"),
    ("डंपर पीछे जाते समय हॉर्न नहीं बजा, एक आदमी बाल-बाल बचा", "near_miss", "machinery", "high",
     "Dumper reversed without horn, a worker narrowly escaped"),
]

FIRST_NAMES = ["Ramesh", "Suresh", "Birsa", "Sunil", "Anil", "Manoj", "Rajesh", "Santosh", "Ajay", "Vijay", "Dinesh",
               "Mahesh", "Ganesh", "Prakash", "Raju", "Sanjay", "Mukesh", "Arjun", "Budhan", "Somra", "Lakhan",
               "Jitendra", "Pradeep", "Bablu", "Chotu", "Shankar", "Kishore", "Nitin", "Deepak", "Ravi", "Pankaj",
               "Sunita", "Geeta", "Sarita", "Anita", "Rekha", "Puja", "Kavita", "Meena", "Laxmi"]
LAST_NAMES = ["Mahato", "Kumar", "Singh", "Hansda", "Murmu", "Soren", "Oraon", "Munda", "Das", "Prasad", "Yadav",
              "Rajak", "Bauri", "Tudu", "Hembrom", "Mahli", "Gope", "Rabidas", "Behera", "Nayak", "Sahu", "Pradhan",
              "Barik", "Majhi", "Paswan"]

# mine name -> contractor names (15 in total)
CONTRACTORS = {
    "Moonidih UG": ["Shree Ganesh Enterprises", "Maa Tara Mining Works", "Jharkhand Earthmovers"],
    "Kusunda OCP": ["Damodar Transport Co.", "Kusum Infra Services"],
    "Bastacolla OCP": ["Bharat Coal Handlers"],
    "Dhansar UG": ["Dhanbad Mine Services"],
    "Ashoka OCP": ["Chatra Excavators"],
    "Piparwar OCP": ["Piparwar Logistics"],
    "Urimari OCP": ["Hazaribagh Contractors"],
    "Bhurkunda UG": ["Ramgarh Mining Works"],
    "Lingaraj OCP": ["Talcher Earthworks"],
    "Jagannath OCP": ["Angul Mining Services"],
    "Lajkura OCP": ["Ib Valley Transport"],
    "Samaleswari OCP": ["Jharsuguda Infra"],
}

GRIEVANCES = {
    "wages": ["Wages for last month not paid yet", "Paid less than the notified daily wage",
              "Overtime not paid for night shifts"],
    "safety": ["Supervisor forces us to work without helmets", "Water in the gallery for a week, nobody fixing it",
               "Dust on the haul road is making workers sick"],
    "harassment": ["Contractor supervisor is abusive to workers", "Being threatened for raising a complaint"],
    "facilities": ["No drinking water at the pit top", "Toilet near the canteen is broken", "Canteen food is stale"],
    "leave": ["Leave not sanctioned even for medical reasons"],
}
