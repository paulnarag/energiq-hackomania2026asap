import argparse
import math
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


DEFAULT_TARIFF = 0.3278
APPLIANCES = ['Air Conditioning', 'Refridgeration', 'Water Heater', 'Washer', 'Entertainment', 'Kitchen', 'Lighting']


def _is_peak(ts: pd.Timestamp) -> int:
    """Peak window used by dashboard logic: 18:00 to 22:59."""
    return int(18 <= ts.hour < 23)


def _total_slot_kwh(hour_float: float, day_factor: float, seasonal_factor: float, base: float) -> float:
    """Create a realistic half-hour load shape with morning/evening peaks."""
    night = 0.16
    morning_bump = 0.24 * math.exp(-((hour_float - 7.5) ** 2) / 4.5)
    midday = 0.12 * math.exp(-((hour_float - 13.0) ** 2) / 7.0)
    evening_peak = 0.46 * math.exp(-((hour_float - 19.5) ** 2) / 5.2)
    raw = (night + morning_bump + midday + evening_peak) * day_factor * seasonal_factor * base
    noise = random.uniform(0.88, 1.16)
    return max(0.04, raw * noise)


def _appliance_contributions(hour_float: float, day_factor: float, seasonal_factor: float, base: float) -> dict[str, float]:
    """Generate appliance-specific kWh contributions for a half-hour slot."""
    contributions = {}
    # Air Conditioning: peaks in evening and afternoon
    contributions['Air Conditioning'] = 0.28 * math.exp(-((hour_float - 19.5) ** 2) / 5.2) * day_factor * seasonal_factor * base
    # Refridgeration: constant
    contributions['Refridgeration'] = 0.035 * base
    # Water Heater: morning and evening peaks
    contributions['Water Heater'] = 0.1 * (math.exp(-((hour_float - 7.5) ** 2) / 4.5) + math.exp(-((hour_float - 19.0) ** 2) / 5.0)) * day_factor * seasonal_factor * base
    # Washer: morning and evening usage
    contributions['Washer'] = 0.08 * (math.exp(-((hour_float - 7.5) ** 2) / 6.0) + math.exp(-((hour_float - 18.5) ** 2) / 6.0)) * day_factor * seasonal_factor * base
    # Entertainment: evening
    contributions['Entertainment'] = 0.12 * math.exp(-((hour_float - 20.5) ** 2) / 4.0) * day_factor * seasonal_factor * base
    # Kitchen: morning and evening
    contributions['Kitchen'] = 0.09 * (math.exp(-((hour_float - 7.5) ** 2) / 4.5) + math.exp(-((hour_float - 19.5) ** 2) / 5.2)) * day_factor * seasonal_factor * base
    # Lighting: morning and evening
    contributions['Lighting'] = 0.07 * (math.exp(-((hour_float - 6.5) ** 2) / 4.5) + math.exp(-((hour_float - 19.5) ** 2) / 5.2)) * day_factor * seasonal_factor * base
    # Make up the rest to match total
    total_so_far = sum(contributions.values())
    total_target = _total_slot_kwh(hour_float, day_factor, seasonal_factor, base)
    if total_target > total_so_far:
        # Add excess to AC and Kitchen
        excess = total_target - total_so_far
        contributions['Air Conditioning'] += excess * 0.6
        contributions['Kitchen'] += excess * 0.4
    # Add noise to each
    for app in contributions:
        contributions[app] = max(0.001, contributions[app] * random.uniform(0.8, 1.2))
    return contributions

def generate_workbook(days: int, tariff: float) -> tuple[str, dict[str, pd.DataFrame]]:
    """Build all dashboard-compatible DataFrames and return default filename."""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=days - 1)
    start = start.replace(hour=0)

    household_variants = [
        {"type": "4-room HDB", "town": "Tampines", "residents": 3},
        {"type": "5-room HDB", "town": "Punggol", "residents": 4},
        {"type": "Condo", "town": "Bishan", "residents": 2},
        {"type": "3-room HDB", "town": "Jurong West", "residents": 2},
    ]
    profile_pick = random.choice(household_variants)
    base = random.uniform(0.75, 1.05)

    rows = []
    for day in range(days):
        date_base = start + timedelta(days=day)
        weekday = date_base.weekday()  # 0=Mon ... 6=Sun
        is_weekend = weekday >= 5
        day_factor = 1.13 if is_weekend else 1.0
        seasonal_factor = 0.97 + 0.06 * math.sin((day / max(days, 1)) * 2 * math.pi)

        for slot in range(48):
            ts = date_base + timedelta(minutes=30 * slot)
            hour_float = ts.hour + ts.minute / 60.0
            contributions = _appliance_contributions(hour_float, day_factor, seasonal_factor, base)
            total_kwh = sum(contributions.values())
            peak = _is_peak(pd.Timestamp(ts))
            # Small premium during peak to make cost trends meaningful.
            effective_tariff = tariff * (1.08 if peak else 0.97)

            row = {
                "timestamp": ts,
                "kwh": round(total_kwh, 4),
                "cost_sgd": round(total_kwh * effective_tariff, 4),
                "is_peak": peak,
                "day_type": "weekend" if is_weekend else "weekday",
            }
            row.update({app: round(contributions[app], 4) for app in APPLIANCES})
            rows.append(row)

    half_hourly = pd.DataFrame(rows)

    # Daily summary
    daily = (
        half_hourly.assign(date=half_hourly["timestamp"].dt.date)
        .groupby("date", as_index=False)
        .agg(
            total_kwh=("kwh", "sum"),
            peak_kwh=("kwh", lambda s: s[half_hourly.loc[s.index, "is_peak"] == 1].sum()),
            **{f"{app}_kwh": (app, "sum") for app in APPLIANCES}
        )
    )
    daily["peak_ratio"] = np.where(daily["total_kwh"] > 0, daily["peak_kwh"] / daily["total_kwh"] * 100, 0)
    daily["temp"] = np.round(np.random.normal(loc=30.2, scale=1.6, size=len(daily)), 1)
    daily["total_kwh"] = daily["total_kwh"].round(3)
    daily["peak_ratio"] = daily["peak_ratio"].round(2)
    for app in APPLIANCES:
        daily[f"{app}_kwh"] = daily[f"{app}_kwh"].round(3)

    # Billing history
    month_df = half_hourly.assign(
        billing_period=half_hourly["timestamp"].dt.to_period("M").astype(str)
    )
    billing = (
        month_df.groupby("billing_period", as_index=False)
        .agg(
            total_kwh=("kwh", "sum"),
            est_cost_sgd=("cost_sgd", "sum"),
            **{f"{app}_kwh": (app, "sum") for app in APPLIANCES}
        )
        .sort_values("billing_period")
    )
    billing["total_kwh"] = billing["total_kwh"].round(1)
    billing["est_cost_sgd"] = billing["est_cost_sgd"].round(2)
    for app in APPLIANCES:
        billing[f"{app}_kwh"] = billing[f"{app}_kwh"].round(1)

    # Profile sheet parsing
    profile = pd.DataFrame(
        [
            {"field": "customer_name", "value": random.choice(["Lim Wei Jian", "Nur Izzati", "Jason Tan", "Alicia Lee"])},
            {"field": "housing_type", "value": profile_pick["type"]},
            {"field": "town", "value": profile_pick["town"]},
            {"field": "residents", "value": profile_pick["residents"]},
            {"field": "account_type", "value": "residential"},
            {"field": "tariff_sgd", "value": round(tariff, 4)},
            {"field": "generated_at", "value": now.strftime("%Y-%m-%d %H:%M:%S")},
        ]
    )

    readme = pd.DataFrame(
        [
            {"sheet": "HalfHourlyUsage", "description": "Primary time-series data used for KPI calculations, including appliance-specific kWh breakdowns"},
            {"sheet": "DailySummary", "description": "Daily totals, peak ratio, temperature, and appliance usage"},
            {"sheet": "BillingHistory", "description": "Monthly rollup for billing section with appliance contributions"},
            {"sheet": "HouseholdProfile", "description": "Profile key-value pairs including tariff_sgd"},
        ]
    )

    filename = f"sp_energy_mock_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    sheets = {
        "README": readme,
        "HalfHourlyUsage": half_hourly,
        "DailySummary": daily,
        "BillingHistory": billing,
        "HouseholdProfile": profile,
    }
    return filename, sheets


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate fresh dashboard-compatible SP-style energy mock data"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Number of days of half-hourly data to generate (default: 90)",
    )
    parser.add_argument(
        "--tariff",
        type=float,
        default=DEFAULT_TARIFF,
        help=f"Base tariff SGD/kWh (default: {DEFAULT_TARIFF})",
    )
    parser.add_argument(
        "--out-dir",
        default="generated_data",
        help="Output directory for generated Excel files (default: generated_data)",
    )
    args = parser.parse_args()

    if args.days < 30:
        raise ValueError("--days must be at least 30 so 30-day KPI windows are valid.")

    os.makedirs(args.out_dir, exist_ok=True)
    filename, sheets = generate_workbook(days=args.days, tariff=args.tariff)
    out_path = os.path.join(args.out_dir, filename)

    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"Generated fresh data file: {out_path}")


if __name__ == "__main__":
    main()