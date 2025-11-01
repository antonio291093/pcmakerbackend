const pool = require("../config/db");

async function obtenerHistorialTecnico(tecnicoId) {
  const query = `
    -- 🔹 Equipos armados o revisados por el técnico
    SELECT 
      e.id AS referencia_id,
      e.nombre AS equipo,
      e.procesador,
      'Equipo' AS tipo,
      e.estado_id,
      e.fecha_creacion AS fecha,
      json_build_object(
        'ram', COALESCE((
          SELECT json_agg(cmr.descripcion)
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ), '[]'),
        'almacenamiento', COALESCE((
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ), '[]')
      ) AS especificaciones
    FROM equipos e
    WHERE e.tecnico_id = $1

    UNION ALL

    -- 🔹 Mantenimientos realizados por el técnico
    SELECT 
      m.id AS referencia_id,
      cm.descripcion AS equipo,
      NULL AS procesador,
      'Mantenimiento' AS tipo,
      m.catalogo_id AS estado_id,
      m.fecha_mantenimiento AS fecha,
      json_build_object(
        'detalle', m.detalle,
        'costo_final', COALESCE(m.costo_personalizado, cm.costo)
      ) AS especificaciones
    FROM mantenimientos m
    LEFT JOIN catalogo_mantenimiento cm ON m.catalogo_id = cm.id
    WHERE m.tecnico_id = $1

    ORDER BY fecha DESC;
  `;

  const { rows } = await pool.query(query, [tecnicoId]);
  return rows;
}

module.exports = { obtenerHistorialTecnico };
