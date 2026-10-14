import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = BASE_DIR / "reliefroute.db"

# Default planning parameters (Humanitarian Sphere Standards & WHO guidelines)
DEFAULT_PLANNING_HORIZON_DAYS = 3.0
DEFAULT_FOOD_KG_PER_PERSON_DAY = 0.50     # ~2,100 kcal / person / day
DEFAULT_WATER_L_PER_PERSON_DAY = 3.00     # Essential drinking & basic survival water
DEFAULT_MED_KITS_PER_1000 = 2.00          # Baseline primary care & hygiene units
DEFAULT_EMERGENCY_KITS_PER_CASE = 1.00    # Trauma / critical acute care kits

# Optimization objective weights
DEFAULT_WEIGHT_CRITICAL = 10.0
DEFAULT_WEIGHT_HIGH = 5.0
DEFAULT_WEIGHT_MEDIUM = 2.5
DEFAULT_WEIGHT_LOW = 1.0

DEFAULT_WEIGHT_MEDICAL = 4.0
DEFAULT_WEIGHT_WATER = 3.0
DEFAULT_WEIGHT_FOOD = 2.0

DEFAULT_TRANSPORT_PENALTY_LAMBDA = 0.005  # Transport distance penalty factor
DEFAULT_MIN_COVERAGE_TARGET = 0.20       # Ensure at least 20% basic needs met if feasible
