"""
sp_energy_coach.py  —  SP AI Energy Coach  |  HackOMania 2026
=============================================================

Terminal dashboard that reads ANY electricity Excel file and
generates AI-powered insights via the Puter SDK.

Usage
-----
  python sp_energy_coach.py                           # interactive prompt
  python sp_energy_coach.py my_data.xlsx              # pass file directly
  python sp_energy_coach.py --demo                    # use generated sample data
  python sp_energy_coach.py my_data.xlsx --ai \\
      --user myname --pass mypassword                 # with AI insights

Requirements
------------
  pip install puter-python-sdk pandas numpy openpyxl
"""

import sys
import os
import argparse
import textwrap
import random
from datetime import datetime

import pandas as pd
import numpy as np

from puter import PuterAI

from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file if present


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: AUTH CONFIG  —  set your Puter credentials here
# ─────────────────────────────────────────────────────────────────────────────

PUTER_USERNAME = os.getenv("PUTER_USERNAME")
PUTER_PASSWORD = os.getenv("PUTER_PASSWORD")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ANSI COLOUR HELPERS
# ─────────────────────────────────────────────────────────────────────────────

R = "\033[0m"

def bold(s):    return "\033[1m"  + str(s) + R
def dim(s):     return "\033[2m"  + str(s) + R
def green(s):   return "\033[92m" + str(s) + R
def yellow(s):  return "\033[93m" + str(s) + R
def red(s):     return "\033[91m" + str(s) + R
def cyan(s):    return "\033[96m" + str(s) + R
def blue(s):    return "\033[94m" + str(s) + R
def magenta(s): return "\033[95m" + str(s) + R

TARIFF = 0.3278   # SGD/kWh — SP Group standard tariff
WIDTH  = 72

def sep(char="─", col="\033[2m"):
    print(col + char * WIDTH + R)


def page_header(title, col="\033[96m"):
    sep("═")
    pad   = (WIDTH - len(title) - 2) // 2
    inner = "═" * pad + " " + title + " " + "═" * (WIDTH - pad - len(title) - 2) + "═"
    print(col + "\033[1m" + inner + R)
    sep("═")


def section(title):
    print()
    print(blue("\033[1m▌ " + title + R))
    sep()


def kv(label, value, width=28):
    """Print a key-value metric row."""
    print("  " + f"{label:<{width}}" + " " + str(value))


def bar_spark(values, width=50):
    """Return a Unicode sparkline string from a list of floats."""
    blocks = " ▁▂▃▄▅▆▇█"
    if not values:
        return "─" * width
    lo, hi = min(values), max(values)
    rng    = hi - lo or 1
    xs     = np.interp(np.linspace(0, len(values) - 1, width),
                       range(len(values)), values)
    return "".join(blocks[min(8, int((v - lo) / rng * 8))] for v in xs)


def score_bar(score, width=40):
    filled = int(score / 100 * width)
    col    = "\033[92m" if score >= 70 else "\033[93m" if score >= 45 else "\033[91m"
    return col + "█" * filled + "\033[2m" + "░" * (width - filled) + R + "  " + bold(str(score)) + "/100"


def wrap(text, indent=4):
    prefix = " " * indent
    for line in textwrap.wrap(str(text), WIDTH - indent):
        print(prefix + line)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: EXCEL LOADER  —  dynamic, schema-agnostic
# Maps logical field names to lists of possible column header variants
# so the script works with any SP-style export format.
# ─────────────────────────────────────────────────────────────────────────────

COL_ALIASES = {
    "timestamp":      ["timestamp", "datetime", "date_time", "time", "date",
                       "period", "interval", "ts"],
    "kwh":            ["kwh", "consumption", "usage", "energy", "usage_kwh",
                       "consumption_kwh", "units", "reading", "value", "kw_h"],
    "cost":           ["cost", "cost_sgd", "amount", "charge", "bill", "sgd", "price"],
    "is_peak":        ["is_peak", "is_peak_hour", "peak", "peak_hour", "peak_flag"],
    "total_kwh":      ["total_kwh", "total", "daily_kwh", "day_total", "kwh_total"],
    "peak_ratio":     ["peak_ratio", "peak_ratio_pct", "peak_pct", "peak_percent"],
    "temp":           ["temp", "temp_celsius", "temperature", "temp_c", "ambient"],
    "date":           ["date", "day", "cal_date"],
    "field":          ["field", "parameter", "attribute", "key", "name", "setting"],
    "value_col":      ["value", "val", "data", "setting_value"],
    "billing_period": ["billing_period", "period", "month", "billing_month",
                       "invoice_period"],
}


def resolve_col(df: pd.DataFrame, key: str):
    """Return the actual column name that best matches the alias list for key."""
    aliases   = COL_ALIASES.get(key, [key])
    lower_map = {c.lower().strip(): c for c in df.columns}
    for alias in aliases:
        if alias.lower() in lower_map:
            return lower_map[alias.lower()]
    return None


class ExcelLoader:
    """
    Reads any SP-style electricity Excel workbook.
    Auto-detects column names via COL_ALIASES so it works with
    different export formats (SP app CSV, manual spreadsheets,
    third-party smart-meter exports, etc.).
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.sheets   = {}
        self.profile  = {}
        self.tariff   = TARIFF
        self._load()

    def _load(self):
        print(dim("  Reading: " + self.filepath))
        xls = pd.ExcelFile(self.filepath, engine="openpyxl")
        print(dim("  Sheets found: " + str(xls.sheet_names)))
        for name in xls.sheet_names:
            df         = pd.read_excel(xls, sheet_name=name)
            df.columns = [str(c).strip() for c in df.columns]
            key        = name.lower().replace(" ", "_")
            self.sheets[key] = df
        self._parse_profile()
        self._parse_tariff()

    def _parse_profile(self):
        for name, df in self.sheets.items():
            if "household" in name or "profile" in name or "meta" in name:
                fcol = resolve_col(df, "field")
                vcol = resolve_col(df, "value_col")
                if fcol and vcol:
                    for _, row in df.iterrows():
                        self.profile[str(row[fcol]).strip()] = row[vcol]
                return

    def _parse_tariff(self):
        for k, v in self.profile.items():
            if "tariff" in k.lower() and "sgd" in k.lower():
                try:
                    self.tariff = float(v)
                except (ValueError, TypeError):
                    pass

    # ── Public accessors ─────────────────────────────────────────────────────

    def get_half_hourly(self) -> "pd.DataFrame | None":
        """Return cleaned half-hourly (or sub-daily) DataFrame."""
        for name, df in self.sheets.items():
            if any(k in name for k in ("half", "hourly", "interval", "raw", "meter", "usage")):
                return self._clean_ts(df)
        best = max(
            (df for df in self.sheets.values()
             if resolve_col(df, "timestamp") and resolve_col(df, "kwh")),
            key=len, default=None,
        )
        return self._clean_ts(best) if best is not None else None

    def get_daily(self) -> "pd.DataFrame | None":
        for name, df in self.sheets.items():
            if any(k in name for k in ("daily", "day", "summary", "monthly")):
                return self._clean_daily(df)
        return None

    def get_billing(self) -> "pd.DataFrame | None":
        for name, df in self.sheets.items():
            if any(k in name for k in ("bill", "monthly", "invoice")):
                return df
        return None

    # ── Cleaners ─────────────────────────────────────────────────────────────

    def _clean_ts(self, df: pd.DataFrame) -> pd.DataFrame:
        tcol = resolve_col(df, "timestamp")
        kcol = resolve_col(df, "kwh")
        if not tcol or not kcol:
            return df
        out          = df.copy()
        out["_ts"]   = pd.to_datetime(out[tcol], errors="coerce")
        out["_kwh"]  = pd.to_numeric(out[kcol],  errors="coerce").fillna(0)
        out["_hour"] = out["_ts"].dt.hour + out["_ts"].dt.minute / 60
        pk = resolve_col(df, "is_peak")
        if pk:
            out["_is_peak"] = pd.to_numeric(out[pk], errors="coerce").fillna(0).astype(int)
        else:
            out["_is_peak"] = (
                (out["_ts"].dt.hour >= 18) & (out["_ts"].dt.hour < 23)
            ).astype(int)
        cc           = resolve_col(df, "cost")
        out["_cost"] = pd.to_numeric(out[cc], errors="coerce") if cc else out["_kwh"] * self.tariff
        return out.dropna(subset=["_ts", "_kwh"])

    def _clean_daily(self, df: pd.DataFrame) -> pd.DataFrame:
        dcol = resolve_col(df, "date") or resolve_col(df, "timestamp")
        kcol = resolve_col(df, "total_kwh") or resolve_col(df, "kwh")
        if not dcol or not kcol:
            return df
        out               = df.copy()
        out["_date"]      = pd.to_datetime(out[dcol], errors="coerce")
        out["_total_kwh"] = pd.to_numeric(out[kcol],  errors="coerce").fillna(0)
        pr                = resolve_col(df, "peak_ratio")
        out["_peak_ratio"] = (
            pd.to_numeric(out[pr], errors="coerce").fillna(50) / 100
            if pr else 0.50
        )
        temp         = resolve_col(df, "temp")
        out["_temp"] = pd.to_numeric(out[temp], errors="coerce").fillna(30.0) if temp else 30.0
        return out.dropna(subset=["_date", "_total_kwh"])


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ANALYTICS ENGINE  —  all KPIs derived via pandas / numpy
# ─────────────────────────────────────────────────────────────────────────────

class AnalyticsEngine:
    """Derives every KPI, anomaly flag, and feature from the loaded data."""

    def __init__(self, loader: ExcelLoader):
        self.loader  = loader
        self.hh      = loader.get_half_hourly()
        self.daily   = loader.get_daily()
        self.billing = loader.get_billing()
        self.tariff  = loader.tariff
        self.results = {}
        self._compute()

    def _compute(self):
        r  = self.results
        hh = self.hh

        if hh is None or hh.empty:
            print(red("  No time-series sheet found — cannot compute features."))
            return

        t_max = hh["_ts"].max()

        # ── Time windows
        last30 = hh[hh["_ts"] >= t_max - pd.Timedelta(days=30)]
        last7  = hh[hh["_ts"] >= t_max - pd.Timedelta(days=7)]
        today  = hh[hh["_ts"].dt.date == t_max.date()]

        # ── Core KPIs
        r["total_kwh_30d"]    = round(last30["_kwh"].sum(), 2)
        r["avg_daily_kwh"]    = round(r["total_kwh_30d"] / 30, 2)
        r["est_monthly_bill"] = round(r["total_kwh_30d"] * self.tariff, 2)
        r["today_kwh"]        = round(today["_kwh"].sum(), 2)
        r["today_cost"]       = round(r["today_kwh"] * self.tariff, 2)

        # ── Peak ratio (6–10 PM slots in last 7 days)
        peak7  = last7[last7["_is_peak"] == 1]["_kwh"].sum()
        total7 = last7["_kwh"].sum()
        r["peak_ratio"]     = round(peak7 / total7, 3) if total7 > 0 else 0.0
        r["peak_ratio_pct"] = round(r["peak_ratio"] * 100, 1)

        # ── Standby baseline (2–4 AM avg, last 7 days)
        night7 = hh[
            (hh["_ts"] >= t_max - pd.Timedelta(days=7)) &
            (hh["_ts"].dt.hour >= 2) & (hh["_ts"].dt.hour < 5)
        ]
        r["standby_kwh_per_slot"] = round(night7["_kwh"].mean(), 4) if len(night7) else 0.0
        r["standby_monthly_cost"] = round(r["standby_kwh_per_slot"] * 6 * 2 * 30 * self.tariff, 2)

        # ── Anomaly detection via rolling Z-score (7-day window)
        hh            = hh.copy()
        roll_mean     = hh["_kwh"].rolling(window=48 * 7, min_periods=10).mean()
        roll_std      = hh["_kwh"].rolling(window=48 * 7, min_periods=10).std().replace(0, np.nan)
        hh["_zscore"] = (hh["_kwh"] - roll_mean) / roll_std
        anomalies     = hh[
            (hh["_zscore"] > 2.5) &
            (hh["_ts"] >= t_max - pd.Timedelta(days=7))
        ]
        r["anomaly_count"]   = len(anomalies)
        r["anomaly_samples"] = anomalies[["_ts", "_kwh", "_zscore"]].head(5).to_dict("records")

        # ── Month-on-month change
        this_m = last30["_kwh"].sum()
        prev_m = hh[
            (hh["_ts"] >= t_max - pd.Timedelta(days=60)) &
            (hh["_ts"] <  t_max - pd.Timedelta(days=30))
        ]["_kwh"].sum()
        r["mom_change_pct"] = round((this_m - prev_m) / prev_m * 100, 1) if prev_m > 0 else 0.0

        # ── Weekend vs weekday
        last30c           = last30.copy()
        last30c["_is_we"] = last30c["_ts"].dt.weekday >= 5
        wd_avg            = last30c[~last30c["_is_we"]]["_kwh"].mean()
        we_avg            = last30c[ last30c["_is_we"]]["_kwh"].mean()
        r["weekend_uplift_pct"] = round((we_avg - wd_avg) / wd_avg * 100, 1) if wd_avg > 0 else 0.0

        # ── Today's hourly profile
        r["hourly_today"] = (
            today.groupby(today["_ts"].dt.hour)["_kwh"].sum()
            .reindex(range(24), fill_value=0.0)
            .tolist()
        )

        # ── 7-day daily totals (for sparkline)
        r["daily_7d"] = (
            last7.groupby(last7["_ts"].dt.date)["_kwh"].sum().tolist()
        )

        # ── Billing history and household profile
        billing_df           = self.billing
        r["billing_history"] = billing_df.to_dict("records") if billing_df is not None else []
        r["profile"]         = self.loader.profile

        # ── Energy score (0–100 composite)
        # Use gentler coefficients so typical values do not all hit hard caps.
        score = 100.0

        peak_penalty = max(0.0, (r["peak_ratio"] - 0.35) * 120)
        standby_penalty = min(18.0, r["standby_kwh_per_slot"] * 95)
        anomaly_penalty = min(16.0, r["anomaly_count"] * 1.15)
        weekend_penalty = max(0.0, min(8.0, r["weekend_uplift_pct"] * 0.2))
        mom_penalty = max(0.0, min(8.0, r["mom_change_pct"] * 0.2))
        mom_bonus = max(0.0, min(4.0, abs(r["mom_change_pct"]) * 0.15)) if r["mom_change_pct"] < 0 else 0.0

        score -= peak_penalty
        score -= standby_penalty
        score -= anomaly_penalty
        score -= weekend_penalty
        score -= mom_penalty
        score += mom_bonus

        r["energy_score"] = max(5, min(100, round(score)))

        # ── Savings potential
        r["potential_peak_saving"]    = round(r["total_kwh_30d"] * r["peak_ratio"] * self.tariff * 0.15, 2)
        r["potential_standby_saving"] = round(r["standby_monthly_cost"] * 0.70, 2)
        r["potential_ac_saving"]      = round(r["total_kwh_30d"] * 0.38 * 0.06 * self.tariff, 2)

        self.hh = hh


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: TERMINAL DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

class Dashboard:
    def __init__(self, results: dict, filepath: str, tariff: float = TARIFF):
        self.r      = results
        self.fp     = filepath
        self.tariff = tariff

    def render(self):
        self._banner()
        self._kpis()
        self._score()
        self._sparklines()
        self._hourly()
        self._anomalies()
        self._peak()
        self._billing()
        self._profile()
        self._savings()
        sep("═")
        print()

    # ── Sections ─────────────────────────────────────────────────────────────

    def _banner(self):
        page_header("SP AI ENERGY COACH  —  HackOMania 2026", "\033[92m")
        print("  " + dim("File:      ") + cyan(os.path.basename(self.fp)))
        print("  " + dim("Generated: ") + cyan(datetime.now().strftime("%d %b %Y  %H:%M:%S")))
        sep()

    def _kpis(self):
        section("KEY METRICS  (Last 30 Days)")
        r   = self.r
        mom = r["mom_change_pct"]
        mom_tag = (red("↑ " + str(mom) + "%") if mom > 0
                   else green("↓ " + str(abs(mom)) + "%") if mom < 0
                   else dim("─ 0%"))
        kv("Monthly Consumption",        bold(str(r["total_kwh_30d"]) + " kWh") + "   " + mom_tag)
        kv("Average Daily Usage",        bold(str(r["avg_daily_kwh"]) + " kWh"))
        kv("Today's Usage",              bold(str(r["today_kwh"]) + " kWh") + "   " + dim("S$" + str(r["today_cost"]) + " est."))
        print()
        kv("Estimated Monthly Bill",     yellow(bold("S$" + str(r["est_monthly_bill"]))))
        kv("Tariff Rate",                dim("S$" + f"{self.tariff:.4f}" + "/kWh"))
        pr     = r["peak_ratio_pct"]
        pr_col = red if pr > 55 else (yellow if pr > 45 else green)
        kv("Peak Hour Ratio (6-10 PM)",  pr_col(bold(str(pr) + "%")) + "  " + dim("(district avg 45%)"))
        sb     = str(r["standby_kwh_per_slot"]) + " kWh/slot"
        sb_tag = dim("approx S$" + str(r["standby_monthly_cost"]) + "/mo wasted")
        kv("Overnight Standby (2-4 AM)", bold(sb) + "   " + sb_tag)
        kv("Weekend vs Weekday",         bold(str(r["weekend_uplift_pct"]) + "% uplift"))

    def _score(self):
        section("ENERGY EFFICIENCY SCORE")
        score    = self.r["energy_score"]
        tier     = ("EXCELLENT" if score >= 80 else "GOOD" if score >= 65
                    else "FAIR" if score >= 45 else "NEEDS WORK")
        tier_col = ("\033[92m" if score >= 80 else "\033[96m" if score >= 65
                    else "\033[93m" if score >= 45 else "\033[91m")
        print("  " + score_bar(score))
        print("  Rating: " + tier_col + bold(tier) + R)
        pct = min(99, round(score * 0.72))
        print("  Better than approx. " + cyan(bold(str(pct) + "%")) + " of similar households in your district.")

    def _sparklines(self):
        section("7-DAY DAILY CONSUMPTION  (sparkline)")
        vals = self.r.get("daily_7d", [])
        if vals:
            print("  " + cyan(bar_spark(vals, width=50)))
            print("  " + dim("Low: " + f"{min(vals):.1f}" + " kWh") + "  ←  " + dim("High: " + f"{max(vals):.1f}" + " kWh"))
        else:
            print(dim("  No 7-day data."))

    def _hourly(self):
        section("TODAY'S HOURLY USAGE  (bar chart)")
        hourly = self.r.get("hourly_today", [])
        if not any(hourly):
            print(dim("  No data for today."))
            return
        max_v    = max(hourly) or 1
        peak_hrs = set(range(18, 23))
        show_hrs = {0, 6, 7, 8, 9, 12, 15, 18, 19, 20, 21, 22, 23}
        for h, v in enumerate(hourly):
            if v == 0 and h not in show_hrs:
                continue
            lbl     = f"{h:02d}:00"
            bar_len = int(v / max_v * 35)
            bar     = "█" * bar_len
            tag     = red(" ◀ PEAK") if h in peak_hrs else ""
            col     = "\033[91m" if h in peak_hrs else ("\033[96m" if h in range(6, 10) else "\033[92m")
            print("  " + lbl + "  " + col + bar + R + "  " + dim(f"{v:.3f} kWh") + tag)

    def _anomalies(self):
        section("ANOMALY DETECTION  (Z-score > 2.5 σ)")
        count   = self.r.get("anomaly_count", 0)
        samples = self.r.get("anomaly_samples", [])
        if count == 0:
            print("  " + green("✓") + " No anomalies detected in the past 7 days.")
        else:
            print("  " + red(bold("⚠  " + str(count) + " unusual spike(s) detected this week")))
            print()
            for a in samples:
                ts     = a["_ts"]
                kwh    = a["_kwh"]
                z      = a["_zscore"]
                ts_str = pd.Timestamp(ts).strftime("%d %b %Y  %H:%M") if not isinstance(ts, str) else ts
                print("  " + red("►") + "  " + cyan(ts_str) + "   "
                      + bold(f"{kwh:.3f} kWh") + "   "
                      + dim("Z=" + f"{z:.1f}" + "σ above baseline"))
            print()
            print("  " + yellow("Likely causes:") + " water heater left on, dryer running overnight,")
            print("                 gaming console or EV charger on unexpected schedule.")

    def _peak(self):
        section("PEAK DEMAND ANALYSIS")
        r     = self.r
        ratio = r["peak_ratio_pct"]
        print("  " + str(ratio) + "% of your electricity is used during peak hours (6–10 PM).")
        diff  = ratio - 45.0
        if diff > 0:
            extra  = round(r["total_kwh_30d"] * (diff / 100) * self.tariff, 2)
            saving = "S$" + str(r["potential_peak_saving"]) + "/month"
            print("  " + red(str(diff) + "% above district average")
                  + " — costing an extra " + red(bold("S$" + str(extra) + "/month")))
            print()
            print("  " + yellow("Tip:") + " Shift laundry + dishwasher to after 10 PM and save")
            print("       up to " + green(bold(saving)) + " on a Time-of-Use plan.")
        else:
            print("  " + green("✓") + " Your peak usage is below the district average — great habit!")

    def _billing(self):
        history = self.r.get("billing_history", [])
        if not history:
            return
        section("BILLING HISTORY")
        for row in history:
            parts = []
            for k, v in row.items():
                if str(k).startswith("_"):
                    continue
                v_str = ("S$" + f"{v:.2f}" if isinstance(v, float) and
                         any(x in str(k).lower() for x in ("cost", "bill", "sgd", "amount"))
                         else str(v))
                parts.append(dim(str(k)) + ": " + bold(v_str))
            print("  " + "   ".join(parts))

    def _profile(self):
        profile = self.r.get("profile", {})
        if not profile:
            return
        section("HOUSEHOLD PROFILE")
        for k, v in profile.items():
            print("  " + cyan(f"{str(k):<32}") + bold(str(v)))

    def _savings(self):
        section("SAVINGS POTENTIAL SUMMARY")
        r    = self.r
        rows = [
            ("Peak shift to off-peak hours",  r["potential_peak_saving"],    "high"),
            ("Eliminate standby loads (70%)", r["potential_standby_saving"], "high"),
            ("AC setpoint 23 C → 25 C (~6%)", r["potential_ac_saving"],      "medium"),
        ]
        total = sum(v for _, v, _ in rows)
        for label, saving, urgency in rows:
            col = red if urgency == "high" else yellow
            print("  " + col("●") + "  " + f"{label:<42}" + green(bold("S$" + f"{saving:.2f}" + "/mo")))
        sep()
        print("  " + f"{'Total Potential Monthly Savings':<44}" + green(bold("S$" + f"{total:.2f}" + "/mo")))
        print("  " + f"{'Annual Projection':<44}"               + green(bold("S$" + f"{total * 12:.0f}" + "/year")))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: PUTER AI  —  insight generation + interactive chat
# Uses puter-python-sdk: pip install puter-python-sdk
# Docs: https://github.com/CuzImSlymi/puter-python-sdk
# ─────────────────────────────────────────────────────────────────────────────

def _build_prompt(r: dict) -> str:
    profile_lines = "\n".join("  " + str(k) + ": " + str(v)
                              for k, v in r.get("profile", {}).items())
    return (
        "You are an AI Energy Coach embedded in the SP Group app in Singapore.\n\n"
        "HOUSEHOLD DATA (last 30 days):\n"
        "  Monthly consumption   : " + str(r["total_kwh_30d"])       + " kWh\n"
        "  Average daily usage   : " + str(r["avg_daily_kwh"])        + " kWh\n"
        "  Estimated monthly bill: S$" + str(r["est_monthly_bill"])   + "\n"
        "  Month-on-month change : " + str(r["mom_change_pct"])       + "%\n"
        "  Peak ratio (6-10 PM)  : " + str(r["peak_ratio_pct"])       + "% (district avg 45%)\n"
        "  Standby (2-4 AM avg)  : " + str(r["standby_kwh_per_slot"]) + " kWh/half-hour slot\n"
        "  Standby monthly waste : S$" + str(r["standby_monthly_cost"]) + "\n"
        "  Anomalies this week   : " + str(r["anomaly_count"])        + "\n"
        "  Weekend uplift        : " + str(r["weekend_uplift_pct"])   + "%\n"
        "  Energy score          : " + str(r["energy_score"])         + "/100\n\n"
        "HOUSEHOLD PROFILE:\n" + (profile_lines or "  Not provided")  + "\n\n"
        "Generate exactly 4 personalised insight cards. "
        "For each card use this exact format:\n\n"
        "--- CARD 1 ---\n"
        "Category: STANDBY\n"
        "Priority: HIGH\n"
        "Headline: (one punchy line with a specific number from the data)\n"
        "Explanation: (2 non-technical sentences referencing real figures)\n"
        "Action: (one specific thing to do tonight or this week)\n"
        "Saving: S$X.XX/month\n\n"
        "Categories: STANDBY | PEAK | ANOMALY | PROGRESS\n"
        "Be specific, warm, and reference Singapore context "
        "(HDB, NEA 25°C guideline, SP time-of-use tariff)."
    )


def run_ai_insights(r: dict, username: str, password: str) -> "PuterAI | None":
    """Authenticate via puter-python-sdk, generate insights, return the AI client."""
    page_header("AI-GENERATED PERSONALISED INSIGHTS", "\033[95m")
    print("  " + dim("Connecting to Puter AI..."))

    try:
        # ── Init and login exactly as shown in puter-python-sdk docs ──
        ai = PuterAI(username=username, password=password)

        if not ai.login():
            print(red("  Login failed — check your credentials."))
            return None

        print(green("  ✓ Authenticated with Puter AI"))
        print(dim("  Generating insights (10–20 seconds)..."))
        print()

        # ── First call: 4 structured insight cards ──
        response = ai.chat(_build_prompt(r))
        _render_cards(response)

        # ── Follow-up: SDK keeps conversation history automatically ──
        followup = ai.chat(
            "Based on the insights above, give me the single most impactful "
            "one-sentence recommendation this household should act on today."
        )
        sep()
        print("  " + bold(cyan("★ TOP RECOMMENDATION:")))
        wrap(followup, indent=4)
        sep("═")

        return ai

    except Exception as e:
        print(red("  Error while generating insights: " + str(e)))

    return None


def _render_cards(response: str):
    ICONS = {"STANDBY": "🔴", "PEAK": "⚠️ ", "ANOMALY": "📈", "PROGRESS": "🌱"}
    cards = response.split("--- CARD")

    for card in cards:
        card = card.strip()
        if not card or not card[0].isdigit():
            if card:
                wrap(card, indent=2)
            continue

        lines    = card.splitlines()
        card_num = lines[0].replace("---", "").strip()
        fields   = {}
        for line in lines[1:]:
            if ":" in line:
                k, _, v = line.partition(":")
                fields[k.strip()] = v.strip()

        category    = fields.get("Category",    "")
        priority    = fields.get("Priority",    "")
        headline    = fields.get("Headline",    "")
        explanation = fields.get("Explanation", "")
        action      = fields.get("Action",      "")
        saving      = fields.get("Saving",      "")

        p_col  = red if priority == "HIGH" else (yellow if priority == "MEDIUM" else green)
        icon   = ICONS.get(category, "💡")
        border = magenta("╔══ INSIGHT " + card_num + " " + "═" * (50 - len(card_num)))

        print("  " + border)
        print("  " + icon + "  " + bold(headline))
        print("  " + dim("Category: ") + cyan(category) + "   " + dim("Priority: ") + p_col(bold(priority)))
        print()
        wrap(explanation, indent=4)
        print()
        print("    " + yellow("→ Action: ") + action)
        print("    " + green("💰 Saving: ") + bold(saving))
        print("  " + magenta("╚" + "═" * 60))
        print()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: INTERACTIVE MENU
# ─────────────────────────────────────────────────────────────────────────────

def interactive_menu(results: dict, filepath: str, ai: "PuterAI | None",
                     tariff: float = TARIFF):
    sep("═")
    print()
    print("  " + bold(cyan("INTERACTIVE MODE")))
    sep()
    print("  " + green("dashboard") + "   Re-print the full dashboard")
    print("  " + green("insights")  + "    Generate new AI insight cards")
    print("  " + green("chat")      + "        Open AI coaching chat")
    print("  " + green("quit")      + "        Exit")
    sep()

    while True:
        try:
            cmd = input("\n" + cyan("sp-coach") + " " + dim("›") + " ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\n" + dim("Goodbye!"))
            break

        if cmd in ("quit", "exit", "q"):
            print(dim("Goodbye!"))
            break

        elif cmd in ("dashboard", "dash", "d"):
            Dashboard(results, filepath, tariff).render()

        elif cmd in ("insights", "i"):
            if ai:
                try:
                    ai.clear_chat_history()
                    response = ai.chat(_build_prompt(results))
                    _render_cards(response)
                except PuterAPIError as e:
                    print(red("  API error: " + str(e)))
            else:
                print(yellow("  AI not configured. Re-run with --ai flag."))

        elif cmd in ("chat", "c"):
            if not ai:
                print(yellow("  AI not configured. Re-run with --ai flag."))
                continue
            print(dim("  Type a question. 'back' to return."))
            while True:
                try:
                    q = input("  " + magenta("you") + " › ").strip()
                except (EOFError, KeyboardInterrupt):
                    break
                if q.lower() in ("back", "exit", "quit", ""):
                    break
                context = (
                    "Household data: monthly " + str(results["total_kwh_30d"]) + " kWh, "
                    "peak ratio " + str(results["peak_ratio_pct"]) + "%, "
                    "score " + str(results["energy_score"]) + "/100, "
                    "bill S$" + str(results["est_monthly_bill"]) + ". "
                    "Question: " + q
                )
                try:
                    answer = ai.chat(context)
                    print()
                    print("  " + cyan(bold("AI Coach:")))
                    wrap(answer, indent=4)
                    print()
                except PuterAPIError as e:
                    print(red("  API error: " + str(e)))

        elif len(cmd) > 5 and ai:
            # Treat unknown input longer than 5 chars as a free-text question
            try:
                context = (
                    "User electricity data: monthly " + str(results["total_kwh_30d"]) + " kWh, "
                    "score " + str(results["energy_score"]) + "/100. "
                    "Question: " + cmd
                )
                answer = ai.chat(context)
                print()
                wrap(answer, indent=4)
                print()
            except PuterAPIError as e:
                print(red("  API error: " + str(e)))

        else:
            print(dim("  Unknown command. Try: dashboard / insights / chat / quit"))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: DATA GENERATOR
# Generates sp_energy_mock_data.xlsx with different households,
# months, and fields compared to the original uploaded file.
# ─────────────────────────────────────────────────────────────────────────────

def generate_sample_data(out_path: str):
    """
    Writes a fresh multi-sheet Excel file to out_path.
    Households: H001–H004 (was U001–U003)
    Months: Oct–Dec 2025  (was Jan–Mar 2026)
    Extra fields: solar_panel, ev_charger, peak_kwh, off_peak_kwh
    """
    random.seed(42)
    print(dim("  Generating sample data → " + out_path))

    users     = ["H001", "H002", "H003", "H004"]
    months    = ["2025-10", "2025-11", "2025-12"]
    dwellings = ["HDB 3-Room", "HDB 4-Room", "Condo", "Landed"]
    notes_map = {
        "H001": "Solar panels installed; daytime grid draw is significantly reduced",
        "H002": "EV charger causes pronounced late-night usage spikes on weekdays",
        "H003": "Single occupant; usage is consistently low across all periods",
        "H004": "Large family with solar + EV; complex and variable usage pattern",
    }
    base_kwh = {"H001": 0.28, "H002": 0.45, "H003": 0.15, "H004": 0.55}

    # ── HouseholdMeta sheet ──
    meta_rows = [
        {
            "user_id":        uid,
            "household_size": [2, 4, 1, 5][i],
            "dwelling_type":  dwellings[i],
            "solar_panel":    [True, False, False, True][i],
            "ev_charger":     [False, True, False, True][i],
            "notes":          notes_map[uid],
        }
        for i, uid in enumerate(users)
    ]

    # ── ActionAssumptions sheet (5 actions, different from original 4) ──
    actions = [
        {"action": "install_led_lighting",      "monthly_kwh_reduction": 18.5, "estimated_monthly_cost_saving_sgd": 5.18,  "description": "Replace all incandescent bulbs with LED alternatives"},
        {"action": "smart_thermostat_schedule", "monthly_kwh_reduction": 31.2, "estimated_monthly_cost_saving_sgd": 8.74,  "description": "Auto-adjust cooling based on time-of-day schedule"},
        {"action": "off_peak_dishwasher",       "monthly_kwh_reduction":  9.4, "estimated_monthly_cost_saving_sgd": 2.63,  "description": "Run dishwasher after 11pm on off-peak tariff"},
        {"action": "solar_self_consumption",    "monthly_kwh_reduction": 42.0, "estimated_monthly_cost_saving_sgd": 11.76, "description": "Shift high-load tasks to solar peak hours 10am-3pm"},
        {"action": "unplug_idle_electronics",   "monthly_kwh_reduction":  6.8, "estimated_monthly_cost_saving_sgd": 1.90,  "description": "Unplug TVs and chargers when idle to cut phantom load"},
    ]

    # ── HourlyUsage rows ──
    def tariff_at(h):
        if h >= 23 or h < 7:        return "off_peak"
        if (7 <= h < 9) or h >= 18: return "peak"
        return "normal"

    DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    hourly    = []

    for uid in users:
        for month in months:
            yr, mo     = [int(x) for x in month.split("-")]
            import calendar
            days_in_mo = calendar.monthrange(yr, mo)[1]
            for d in range(1, days_in_mo + 1):
                dt         = datetime(yr, mo, d)
                weekday    = dt.weekday()  # 0=Mon, 6=Sun
                is_weekend = weekday >= 5
                day_name   = DAY_NAMES[(weekday + 1) % 7]
                for h in range(24):
                    tariff       = tariff_at(h)
                    peak_mult    = 1.6 if tariff == "peak" else (0.7 if tariff == "off_peak" else 1.0)
                    weekend_mult = 1.15 if is_weekend else 1.0
                    noise        = 0.85 + random.random() * 0.3
                    kwh          = round(base_kwh[uid] * peak_mult * weekend_mult * noise, 3)
                    hourly.append({
                        "timestamp":     f"{yr}-{mo:02d}-{d:02d} {h:02d}:00:00",
                        "user_id":       uid,
                        "usage_kwh":     kwh,
                        "billing_month": month,
                        "date":          f"{yr}-{mo:02d}-{d:02d}",
                        "hour":          h,
                        "day_of_week":   day_name,
                        "is_weekend":    is_weekend,
                        "tariff_type":   tariff,
                    })

    # ── MonthlySummary sheet (with peak/off-peak breakdown) ──
    hdf     = pd.DataFrame(hourly)
    summary = []
    for uid in users:
        for month in months:
            sub     = hdf[(hdf["user_id"] == uid) & (hdf["billing_month"] == month)]
            total   = round(sub["usage_kwh"].sum(), 1)
            peak    = round(sub[sub["tariff_type"] == "peak"]["usage_kwh"].sum(), 1)
            offpeak = round(sub[sub["tariff_type"] == "off_peak"]["usage_kwh"].sum(), 1)
            summary.append({
                "user_id":       uid,
                "billing_month": month,
                "usage_kwh":     total,
                "peak_kwh":      peak,
                "off_peak_kwh":  offpeak,
            })

    # ── Write all sheets ──
    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        pd.DataFrame([
            {"Sheet": "HouseholdMeta",     "Description": "Metadata for 4 synthetic households (H001-H004), Oct-Dec 2025"},
            {"Sheet": "HourlyUsage",       "Description": "Hourly electricity usage with tariff type and weekend flag"},
            {"Sheet": "MonthlySummary",    "Description": "Aggregated monthly kWh with peak/off-peak breakdown"},
            {"Sheet": "ActionAssumptions", "Description": "Five energy saving actions with estimated kWh/cost impact"},
        ]).to_excel(writer, sheet_name="README", index=False)

        pd.DataFrame(meta_rows).to_excel(writer, sheet_name="HouseholdMeta",     index=False)
        hdf.to_excel(                     writer, sheet_name="HourlyUsage",       index=False)
        pd.DataFrame(summary).to_excel(   writer, sheet_name="MonthlySummary",    index=False)
        pd.DataFrame(actions).to_excel(   writer, sheet_name="ActionAssumptions", index=False)

    print(green("  ✓ Sample data written to: " + out_path))


def get_latest_generated_file(generated_dir: str) -> str | None:
    """Return newest .xlsx file from generated_dir, or None if unavailable."""
    if not os.path.isdir(generated_dir):
        return None
    candidates = [
        os.path.join(generated_dir, name)
        for name in os.listdir(generated_dir)
        if name.lower().endswith(".xlsx")
    ]
    if not candidates:
        return None
    return max(candidates, key=os.path.getmtime)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SP AI Energy Coach — HackOMania 2026")
    parser.add_argument("file",     nargs="?", help="Path to Excel file (.xlsx)")
    parser.add_argument("--demo",   action="store_true", help="Use latest generated_data/*.xlsx file")
    parser.add_argument("--ai",     action="store_true", help="Enable Puter AI insights")
    parser.add_argument("--user",   default="", help="Puter username (overrides PUTER_USERNAME constant)")
    parser.add_argument("--pass",   dest="password", default="", help="Puter password (overrides PUTER_PASSWORD constant)")
    args = parser.parse_args()

    print()
    sep("═")
    print("  " + green(bold("⚡  SP AI Energy Coach")) + "  " + dim("— HackOMania 2026"))
    sep("═")
    print()

    here         = os.path.dirname(os.path.abspath(__file__))
    generated_dir = os.path.join(here, "generated_data")

    # ── Resolve file path ─────────────────────────────────────────────────────
    if args.demo:
        latest_generated = get_latest_generated_file(generated_dir)
        if latest_generated:
            filepath = latest_generated
            print(dim("  Using latest file from generated_data: " + filepath))
        else:
            print(red("  No .xlsx files found in generated_data/."))
            print(dim("  Run: python generate_fresh_energy_data.py"))
            sys.exit(1)

    elif args.file:
        filepath = args.file

    else:
        print("  " + cyan("Enter path to your SP electricity Excel file:"))
        print("  " + dim("(Press Enter to use latest file in generated_data/)"))
        filepath = input("  " + cyan("File path") + " › ").strip()
        if not filepath:
            latest_generated = get_latest_generated_file(generated_dir)
            if latest_generated:
                filepath = latest_generated
                print(dim("  Using latest file from generated_data: " + filepath))
            else:
                print(red("  No .xlsx files found in generated_data/."))
                print(dim("  Run: python generate_fresh_energy_data.py"))
                sys.exit(1)

    if not os.path.exists(filepath):
        print(red("  File not found: " + filepath))
        sys.exit(1)

    # ── Load & analyse ────────────────────────────────────────────────────────
    print()
    print(dim("  Loading and analysing Excel data..."))
    loader  = ExcelLoader(filepath)
    engine  = AnalyticsEngine(loader)
    results = engine.results

    if not results:
        print(red("  Could not extract data. Check sheet/column names."))
        sys.exit(1)

    # ── Render dashboard ──────────────────────────────────────────────────────
    Dashboard(results, filepath, loader.tariff).render()

    # ── Optional AI insights ──────────────────────────────────────────────────
    ai_client = None
    run_ai    = args.ai

    if not run_ai:
        print()
        print("  " + cyan("Run AI-powered insights?") + "  " + dim("(requires Puter account)"))
        choice = input("  " + cyan("[y/N]") + " › ").strip().lower()
        run_ai = (choice == "y")

    if run_ai:
        # CLI flags take priority; fall back to env variables
        username = args.user or PUTER_USERNAME
        password = args.password or PUTER_PASSWORD
        ai_client = run_ai_insights(results, username, password)

    # ── Interactive shell ─────────────────────────────────────────────────────
    interactive_menu(results, filepath, ai_client, loader.tariff)


if __name__ == "__main__":
    main()