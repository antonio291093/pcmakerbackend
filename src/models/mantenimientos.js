const pool = require("../config/db");

async function crearMantenimiento({
  fecha_mantenimiento,
  detalle,
  tecnico_id,
  fecha_creacion,
  catalogo_id,
  costo_personalizado,
}) {
  const query = `
    INSERT INTO mantenimientos (
      fecha_mantenimiento, detalle, tecnico_id, fecha_creacion, catalogo_id, costo_personalizado
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    fecha_mantenimiento,
    detalle,
    tecnico_id,
    fecha_creacion,
    catalogo_id || null,
    costo_personalizado || null,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function obtenerMantenimientos() {
  const query = `
    SELECT 
      m.id,
      m.fecha_mantenimiento,
      m.detalle,
      m.tecnico_id,
      m.catalogo_id,
      COALESCE(m.costo_personalizado, cm.costo) AS costo_final,
      cm.descripcion AS tipo_mantenimiento,
      m.fecha_creacion
    FROM mantenimientos m
    LEFT JOIN catalogo_mantenimiento cm ON m.catalogo_id = cm.id
    ORDER BY m.id ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function actualizarMantenimiento(
  id,
  { fecha_mantenimiento, detalle, tecnico_id, catalogo_id, costo_personalizado }
) {
  const query = `
    UPDATE mantenimientos
    SET 
      fecha_mantenimiento = $1,
      detalle = $2,
      tecnico_id = $3,
      catalogo_id = $4,
      costo_personalizado = $5
    WHERE id = $6
    RETURNING *;
  `;
  const values = [
    fecha_mantenimiento,
    detalle,
    tecnico_id,
    catalogo_id || null,
    costo_personalizado || null,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function eliminarMantenimiento(id) {
  const query = `DELETE FROM mantenimientos WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

module.exports = {
  crearMantenimiento,
  obtenerMantenimientos,
  actualizarMantenimiento,
  eliminarMantenimiento,
};
