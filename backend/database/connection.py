"""
SIH26054 PostgreSQL Database Connection & Engine Manager
Provides high-performance SQLAlchemy 2.0 engine, connection pooling, session lifecycle management,
and automatic table creation.
"""

import os
from contextlib import contextmanager
from typing import Generator, Optional, Any, Dict

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool

from backend.database.models import Base

DEFAULT_POSTGRES_URL = (
    os.getenv('DATABASE_URL')
    or os.getenv('POSTGRES_URL')
    or os.getenv('SUPABASE_DB_URL')
    or 'postgresql+psycopg://postgres:postgres@localhost:5432/sih_digital_twin'
)


def _normalize_postgres_url(url: str) -> str:
    """Ensures modern psycopg3 driver is used for standard postgresql:// URLs and uses 127.0.0.1 on Windows."""
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+psycopg://', 1)
    if url.startswith('postgresql://') and '+psycopg' not in url and '+asyncpg' not in url:
        url = url.replace('postgresql://', 'postgresql+psycopg://', 1)
    # Prefer IPv4 127.0.0.1 over localhost to prevent Windows 15-second IPv6 timeout
    url = url.replace('@localhost:', '@127.0.0.1:')
    return url


class DatabaseEngineManager:
    """Manages PostgreSQL engine creation, connection pooling, and table synchronization."""

    def __init__(self, database_url: Optional[str] = None):
        self.raw_url = database_url or DEFAULT_POSTGRES_URL
        self.normalized_url = _normalize_postgres_url(self.raw_url)
        self.engine: Optional[Engine] = None
        self.session_factory: Optional[sessionmaker] = None
        self.is_connected: bool = False
        self.error_message: Optional[str] = None
        self._init_engine()

    def _init_engine(self):
        try:
            # Try connecting to PostgreSQL with 1-second connect_timeout so startup never hangs
            connect_args = {}
            if 'psycopg' in self.normalized_url or 'postgresql' in self.normalized_url:
                connect_args['connect_timeout'] = 1

            self.engine = create_engine(
                self.normalized_url,
                connect_args=connect_args,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_timeout=1,
                pool_recycle=300,
                pool_pre_ping=False,
                echo=False,
            )
            # Fast test connectivity
            with self.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            
            # Create all tables in PostgreSQL
            Base.metadata.create_all(bind=self.engine)
            self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            self.is_connected = True
            self.error_message = None
        except Exception as e:
            self.is_connected = False
            self.error_message = str(e)
            # Resilient fallback engine with StaticPool for test/offline environments
            try:
                self.engine = create_engine(
                    'sqlite:///:memory:',
                    connect_args={'check_same_thread': False},
                    poolclass=StaticPool,
                )
                Base.metadata.create_all(bind=self.engine)
                self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            except Exception as e2:
                self.session_factory = None

    def reconnect(self, new_url: Optional[str] = None):
        if new_url:
            self.raw_url = new_url
            self.normalized_url = _normalize_postgres_url(new_url)
        self._init_engine()

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Context manager providing a transactional database session with auto-rollback."""
        if not self.session_factory:
            raise RuntimeError('Database session factory is not initialized.')
        session: Session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_metrics(self) -> Dict[str, Any]:
        """Returns connection pool metrics and database engine details."""
        pool_status = {}
        if self.engine and hasattr(self.engine, 'pool'):
            pool = self.engine.pool
            if hasattr(pool, 'size'):
                pool_status = {
                    'pool_size': pool.size(),
                    'checked_in': getattr(pool, 'checkedin', lambda: 0)(),
                    'checked_out': getattr(pool, 'checkedout', lambda: 0)(),
                    'overflow': getattr(pool, 'overflow', lambda: 0)(),
                }
        return {
            'is_connected': self.is_connected,
            'dialect': self.engine.dialect.name if self.engine else 'postgresql',
            'driver': getattr(self.engine.dialect, 'driver', 'psycopg') if self.engine else 'psycopg',
            'url_redacted': self.normalized_url.split('@')[-1] if '@' in self.normalized_url else 'local',
            'pool': pool_status,
            'error': self.error_message,
        }


# Singleton database manager instance
db_manager = DatabaseEngineManager()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding database session."""
    with db_manager.get_session() as session:
        yield session
