"""
SIH26054 PostgreSQL Database & Supabase Cloud Persistence Service
Provides complete, robust PostgreSQL persistence for flights, telemetry streams, FMEA alerts, and federated rounds.
Leverages high-performance SQLAlchemy 2.0 connection pooling and PostgreSQL ORM models.
"""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.database import postgres_repo, db_manager

try:
    from supabase import create_client, Client
    SUPABASE_INSTALLED = True
except ImportError:
    SUPABASE_INSTALLED = False


class SupabaseService:
    """PostgreSQL database service with optional remote Supabase cloud sync."""

    def __init__(self):
        self.supabase_url: Optional[str] = os.getenv('SUPABASE_URL')
        self.supabase_key: Optional[str] = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.client: Optional[Any] = None
        self.repo = postgres_repo
        self.manager = db_manager

        if SUPABASE_INSTALLED and self.supabase_url and self.supabase_key:
            try:
                self.client = create_client(self.supabase_url, self.supabase_key)
                self.mode = 'postgres_cloud_sync'
            except Exception as e:
                print(f'[WARN] Supabase client init notice: {e}. Using PostgreSQL direct storage.')
                self.mode = 'postgres_direct'
        else:
            self.mode = 'postgres_direct'

    def get_status(self) -> Dict[str, Any]:
        """Returns PostgreSQL connection status, table metrics, and storage health."""
        table_counts = self.repo.get_table_counts()
        metrics = self.manager.get_metrics()

        return {
            'mode': self.mode,
            'is_cloud_active': bool(self.client is not None),
            'database_dialect': metrics.get('dialect', 'postgresql'),
            'database_driver': metrics.get('driver', 'psycopg'),
            'database_connected': metrics.get('is_connected', True),
            'supabase_url': self.supabase_url if self.supabase_url else 'postgresql://postgres@localhost:5432/sih_digital_twin',
            'tables': {
                'flights': table_counts.get('flights', 0),
                'telemetry_logs': table_counts.get('telemetry_logs', 0),
                'alerts': table_counts.get('alerts', 0),
                'operator_feedback': table_counts.get('operator_feedback', 0),
                'fleet_rounds': table_counts.get('fleet_rounds', 0),
                'mavlink_logs': table_counts.get('mavlink_logs', 0),
            },
            'pool_status': metrics.get('pool', {}),
            'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
        }

    def save_flight(
        self,
        flight_id: str,
        engine_id: str = 'engine_001',
        profile: str = 'patrol',
        duration_s: float = 600.0,
        num_samples: int = 600,
        status: str = 'completed',
    ) -> Dict[str, Any]:
        """Inserts or updates flight record in PostgreSQL database with flexible signature support."""
        # Check if legacy positional call: (flight_id, profile, duration_s, status)
        if isinstance(profile, (int, float)) and isinstance(engine_id, str) and not engine_id.startswith('engine_'):
            actual_profile = engine_id
            actual_duration = float(profile)
            actual_status = str(duration_s) if isinstance(duration_s, str) else 'completed'
            actual_engine = 'engine_001'
            actual_samples = int(num_samples) if isinstance(num_samples, int) else 600
        else:
            actual_engine = str(engine_id)
            actual_profile = str(profile)
            actual_duration = float(duration_s)
            actual_samples = int(num_samples) if isinstance(num_samples, int) else 600
            actual_status = str(status)

        record = self.repo.save_flight(
            flight_id=flight_id,
            engine_id=actual_engine,
            profile=actual_profile,
            duration_s=actual_duration,
            num_samples=actual_samples,
            status=actual_status,
        )

        # Mirror to remote Supabase cloud if active
        if self.client:
            try:
                self.client.table('flights').upsert({
                    'flight_id': flight_id,
                    'engine_id': actual_engine,
                    'profile': actual_profile,
                    'duration_s': actual_duration,
                    'status': actual_status,
                    'created_at': record.get('created_at'),
                }).execute()
            except Exception as e:
                print(f'[WARN] Remote Supabase cloud upsert notice: {e}')

        return record

    def get_flights(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves historical flights from PostgreSQL."""
        if self.client:
            try:
                res = self.client.table('flights').select('*').order('created_at', desc=True).limit(limit).execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        return self.repo.get_flights(limit=limit)

    def save_telemetry_packet(self, packet: Dict[str, Any]) -> bool:
        """Saves a telemetry frame to PostgreSQL safely without raising exceptions."""
        try:
            success = self.repo.save_telemetry_packet(packet)

            if self.client:
                try:
                    risk = packet.get('mission_risk', {})
                    health_score = float(risk.get('health_score', 100.0) if isinstance(risk, dict) else 100.0)
                    self.client.table('telemetry_logs').insert({
                        'flight_id': packet.get('flight_id', 'flight_demo'),
                        'timestamp_s': float(packet.get('t', 0.0)),
                        'rpm': float(packet.get('rpm', 2400.0)),
                        'health_score': health_score,
                        'stage1_anomaly': bool(packet.get('stage1_anomaly', False)),
                        'stage2_fault': str(packet.get('stage2_fault', 'normal')),
                        'channels': packet.get('channels', {}),
                        'created_at': datetime.now(timezone.utc).isoformat() + 'Z',
                    }).execute()
                except Exception:
                    pass

            return success
        except Exception:
            return False

    def save_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Saves an alert and associated diagnostic debrief in PostgreSQL."""
        success = self.repo.save_alert(alert_data)

        if self.client:
            try:
                sev = alert_data.get('severity', 'warning')
                if isinstance(sev, dict):
                    sev = sev.get('value', 'warning')
                self.client.table('alerts').upsert({
                    'alert_id': str(alert_data.get('alert_id', '')),
                    'flight_id': str(alert_data.get('flight_id', 'flight_demo')),
                    'timestamp_s': float(alert_data.get('timestamp', alert_data.get('timestamp_s', 0.0))),
                    'fault_type': str(alert_data.get('fault_type', 'normal')),
                    'confidence': float(alert_data.get('confidence', 0.95)),
                    'severity': str(sev),
                    'auto_action_eligible': bool(alert_data.get('auto_action_eligible', False)),
                    'key_sensors': alert_data.get('key_sensors', []),
                    'report_text': alert_data.get('report_text', ''),
                    'created_at': datetime.now(timezone.utc).isoformat() + 'Z',
                }).execute()
            except Exception:
                pass

        return success

    def get_alerts(self, flight_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent alerts from PostgreSQL."""
        if self.client:
            try:
                query = self.client.table('alerts').select('*').order('created_at', desc=True).limit(limit)
                if flight_id:
                    query = query.eq('flight_id', flight_id)
                res = query.execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        return self.repo.get_alerts(flight_id=flight_id, limit=limit)


# Singleton service instance
supabase_service = SupabaseService()
