import uuid
from app.database import SessionLocal
from app.models.sede import Sede
from app.models.usuario import Usuario
from app.security.hash import hash_password

def main():
    db = SessionLocal()

    # 1) Crear sede base (ajusta a tu ubicación real)
    sede = db.query(Sede).filter(Sede.nombre == "Sede Central").first()
    if not sede:
        sede = Sede(
            sede_id=uuid.uuid4(),
            nombre="Sede Central",
            latitud=-3.99313,
            longitud=-79.20422,
            radio_metros=120,
            direccion="Loja - Centro",
        )
        db.add(sede)
        db.commit()
        db.refresh(sede)

    # 2) SuperAdmin (panel)
    super_email = "superadmin@geoasistencia.com"
    su = db.query(Usuario).filter(Usuario.email == super_email).first()
    if not su:
        su = Usuario(
            usuario_id=uuid.uuid4(),
            documento="SUP-001",
            nombre_real="SuperAdmin Demo",
            email=super_email,
            password_hash=hash_password("SuperAdmin12345"),
            telefono="0000000000",
            sede_id=sede.sede_id,
            rol="SUPERADMIN",
            consentimiento_geolocalizacion=True,
        )
        db.add(su)

    # 3) Admin (panel)
    admin_email = "admin@geoasistencia.com"
    admin = db.query(Usuario).filter(Usuario.email == admin_email).first()
    if not admin:
        admin = Usuario(
            usuario_id=uuid.uuid4(),
            documento="ADM-001",
            nombre_real="Administrador Demo",
            email=admin_email,
            password_hash=hash_password("Admin12345"),
            telefono="0000000000",
            sede_id=sede.sede_id,
            rol="ADMIN",
            consentimiento_geolocalizacion=True,
        )
        db.add(admin)

    # 4) Empleado (app)
    emp_email = "empleado@empresa.com"
    emp = db.query(Usuario).filter(Usuario.email == emp_email).first()
    if not emp:
        emp = Usuario(
            usuario_id=uuid.uuid4(),
            documento="DOC-001",
            nombre_real="Empleado Demo",
            email=emp_email,
            password_hash=hash_password("Empleado12345"),
            telefono="0999999999",
            sede_id=sede.sede_id,
            rol="EMPLEADO",
            consentimiento_geolocalizacion=True,
        )
        db.add(emp)

    db.commit()
    db.close()

    print("✅ Seed listo")
    print("SUPER:", super_email, " / SuperAdmin12345")
    print("ADMIN :", admin_email, " / Admin12345")
    print("EMP   :", emp_email, " / Empleado12345")

if __name__ == "__main__":
    main()
