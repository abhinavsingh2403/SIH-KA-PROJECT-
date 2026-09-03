"""
SIH26054 Supabase Database Client & Cloud Sync Service
Provides persistence for flights, telemetry streams, FMEA alerts, and federated rounds.
Automatically falls back to local SQLite if remote Supabase environment variables are unset.
"""

import os
import json
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

try:
    from supabase import create_client, Client
    SUPABASE_INSTALLED = True
except ImportError:
    SUPABASE_INSTALLED = False


class SupabaseService:
    def __init__(self):
        self.supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
        self.supabase_key: Optional[str] = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.client: Optional[Any] = None
        self.mode: str = "unconfigured"

        # Local SQLite fallback path
        os.makedirs("data", exist_ok=True)
        self.db_path = os.path.join("data", "supabase_local_sync.db")
        self._init_sqlite_tables()

        if SUPABASE_INSTALLED and self.supabase_url and self.supabase_key:
            try:
                self.client = create_client(self.supabase_url, self.supabase_key)
                self.mode = "cloud"
            except Exception as e:
                print(f"[WARN] Failed to initialize Supabase cloud client: {e}. Using local fallback.")
                self.mode = "local_fallback"
        else:
            self.mode = "local_fallback"

    def _init_sqlite_tables(self):
        """Initializes equivalent schema in local SQLite database for offline resilience."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS flights (
                    flight_id TEXT PRIMARY KEY,
                    profile TEXT NOT NULL,
                    duration_s REAL NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_id TEXT NOT NULL,
                    timestamp_s REAL NOT NULL,
                    rpm REAL NOT NULL,
                    health_score REAL NOT NULL,
                    stage1_anomaly INTEGER NOT NULL,
                    stage2_fault TEXT NOT NULL,
                    channels_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    alert_id TEXT PRIMARY KEY,
                    flight_id TEXT NOT NULL,
                    timestamp_s REAL NOT NULL,
                    fault_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    severity TEXT NOT NULL,
                    auto_action_eligible INTEGER NOT NULL,
                    key_sensors_json TEXT NOT NULL,
                    report_text TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS fleet_rounds (
                    round_num INTEGER PRIMARY KEY,
                    num_clients INTEGER NOT NULL,
                    global_f1 REAL NOT NULL,
                    summary_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()

    def get_status(self) -> Dict[str, Any]:
        """Returns connection status, cloud mode, and storage metrics."""
        flight_count = 0
        telemetry_count = 0
        alert_count = 0

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM flights")
            flight_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM telemetry_logs")
            telemetry_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM alerts")
            alert_count = cursor.fetchone()[0]

        return {
            "mode": self.mode,
            "is_cloud_active": self.mode == "cloud",
            "supabase_url": self.supabase_url if self.supabase_url else "http://localhost:54321",
            "tables": {
                "flights": flight_count,
                "telemetry_logs": telemetry_count,
                "alerts": alert_count,
            },
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        }

    def save_flight(self, flight_id: str, profile: str = "patrol", duration_s: float = 600.0, status: str = "completed") -> Dict[str, Any]:
        """Inserts or updates flight record."""
        now_str = datetime.now(timezone.utc).isoformat() + "Z"
        row = {
            "flight_id": flight_id,
            "profile": profile,
            "duration_s": duration_s,
            "status": status,
            "created_at": now_str,
        }

        # Local SQLite save
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flights (flight_id, profile, duration_s, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (flight_id, profile, duration_s, status, now_str))
            conn.commit()

        # Cloud Supabase save if active
        if self.mode == "cloud" and self.client:
            try:
                self.client.table("flights").upsert(row).execute()
            except Exception as e:
                print(f"[WARN] Supabase cloud upsert failed: {e}")

        return row

    def get_flights(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves historical flights."""
        if self.mode == "cloud" and self.client:
            try:
                res = self.client.table("flights").select("*").order("created_at", desc=True).limit(limit).execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM flights ORDER BY created_at DESC LIMIT ?", (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def save_telemetry_packet(self, packet: Dict[str, Any]) -> bool:
        """Saves a telemetry frame to the database."""
        flight_id = packet.get("flight_id", "flight_demo")
        t = float(packet.get("t", 0.0))
        rpm = float(packet.get("rpm", 2400.0))
        risk = packet.get("mission_risk", {})
        health_score = float(risk.get("health_score", 96.0))
        is_anom = 1 if packet.get("stage1_anomaly") else 0
        fault = str(packet.get("stage2_fault", "normal"))
        channels_json = json.dumps(packet.get("channels", {}))
        now_str = datetime.now(timezone.utc).isoformat() + "Z"

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO telemetry_logs (flight_id, timestamp_s, rpm, health_score, stage1_anomaly, stage2_fault, channels_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (flight_id, t, rpm, health_score, is_anom, fault, channels_json, now_str))
            conn.commit()

        if self.mode == "cloud" and self.client:
            try:
                self.client.table("telemetry_logs").insert({
                    "flight_id": flight_id,
                    "timestamp_s": t,
                    "rpm": rpm,
                    "health_score": health_score,
                    "stage1_anomaly": bool(is_anom),
                    "stage2_fault": fault,
                    "channels": packet.get("channels", {}),
                    "created_at": now_str,
                }).execute()
            except Exception:
                pass

        return True

    def save_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Saves an alert and associated diagnostic debrief."""
        now_str = datetime.now(timezone.utc).isoformat() + "Z"
        alert_id = alert_data.get("alert_id", f"alert_{int(datetime.now(timezone.utc).timestamp())}")
        flight_id = alert_data.get("flight_id", "flight_demo")
        ts = float(alert_data.get("timestamp", 0.0))
        fault = alert_data.get("fault_type", "normal")
        conf = float(alert_data.get("confidence", 0.95))
        sev = alert_data.get("severity", {}).get("value", "warning") if isinstance(alert_data.get("severity"), dict) else str(alert_data.get("severity", "warning"))
        auto_act = 1 if alert_data.get("auto_action_eligible") else 0
        key_sensors = json.dumps(alert_data.get("key_sensors", []))
        report_text = alert_data.get("report_text", "")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO alerts (alert_id, flight_id, timestamp_s, fault_type, confidence, severity, auto_action_eligible, key_sensors_json, report_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (alert_id, flight_id, ts, fault, conf, sev, auto_act, key_sensors, report_text, now_str))
            conn.commit()

        if self.mode == "cloud" and self.client:
            try:
                self.client.table("alerts").upsert({
                    "alert_id": alert_id,
                    "flight_id": flight_id,
                    "timestamp_s": ts,
                    "fault_type": fault,
                    "confidence": conf,
                    "severity": sev,
                    "auto_action_eligible": bool(auto_act),
                    "key_sensors": alert_data.get("key_sensors", []),
                    "report_text": report_text,
                    "created_at": now_str,
                }).execute()
            except Exception:
                pass

        return True

    def get_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent alerts."""
        if self.mode == "cloud" and self.client:
            try:
                res = self.client.table("alerts").select("*").order("created_at", desc=True).limit(limit).execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            alerts = []
            for r in rows:
                item = dict(r)
                try:
                    item["key_sensors"] = json.loads(item.pop("key_sensors_json", "[]"))
                except Exception:
                    item["key_sensors"] = []
                alerts.append(item)
            return alerts


# Singleton service instance
supabase_service = SupabaseService()
