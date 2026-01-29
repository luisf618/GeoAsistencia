BEGIN;

-- Tabla para solicitudes de asistencia manual (requiere revisión ADMIN/SUPERADMIN)
CREATE TABLE IF NOT EXISTS public.solicitud_asistencia_manual
(
    solicitud_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    sede_id uuid NOT NULL,
    tipo character varying NOT NULL,
    timestamp_evento timestamp without time zone NOT NULL,
    latitud character varying,
    longitud character varying,
    device_info jsonb,
    evidence character varying,
    detalle character varying NOT NULL,
    estado character varying NOT NULL DEFAULT 'PENDIENTE',
    created_at timestamp without time zone,
    revisado_por uuid,
    revisado_at timestamp without time zone,
    decision_comentario character varying,
    CONSTRAINT solicitud_asistencia_manual_pkey PRIMARY KEY (solicitud_id),
    CONSTRAINT solicitud_asistencia_manual_usuario_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuario (usuario_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT solicitud_asistencia_manual_sede_fkey FOREIGN KEY (sede_id)
        REFERENCES public.sede (sede_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT solicitud_asistencia_manual_revisado_por_fkey FOREIGN KEY (revisado_por)
        REFERENCES public.usuario (usuario_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

COMMIT;
