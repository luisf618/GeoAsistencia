from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL

DB_USER = "geo_user"
DB_PASSWORD = "GeoPass123"
DB_HOST = "127.0.0.1"
DB_PORT = 5433
DB_NAME = "geoasistencia"

DATABASE_URL = URL.create(
    # requirements.txt usa psycopg2-binary, por eso usamos psycopg2 aquí.
    drivername="postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()
