const pool = require("../config/db");

/** ----------------------------------------------------
 * AGREGAR O ACTUALIZAR INVENTARIO (por sucursal)
 * ---------------------------------------------------- */
async function agregarOActualizarInventario({
  tipo,
  especificacion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  memoria_ram_id = null,
  almacenamiento_id = null,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let buscarQuery, buscarValues;

  if (memoria_ram_id) {
    buscarQuery = `
      SELECT * FROM inventario
      WHERE memoria_ram_id = $1 AND especificacion = $2 AND sucursal_id = $3
      LIMIT 1;
    `;
    buscarValues = [memoria_ram_id, especificacion, sucursal_id];
  } else if (almacenamiento_id) {
    buscarQuery = `
      SELECT * FROM inventario
      WHERE almacenamiento_id = $1 AND especificacion = $2 AND sucursal_id = $3
      LIMIT 1;
    `;
    buscarValues = [almacenamiento_id, especificacion, sucursal_id];
  } else {
    throw new Error("Debe especificar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(buscarQuery, buscarValues);

  if (rows.length > 0) {
    // ✅ Ya existe: actualizar cantidad
    const inventario = rows[0];
    const nuevaCantidad = inventario.cantidad + cantidad;
    const updateQuery = `
      UPDATE inventario
      SET cantidad = $1
      WHERE id = $2
      RETURNING *;
    `;
    const { rows: updateRows } = await pool.query(updateQuery, [
      nuevaCantidad,
      inventario.id,
    ]);
    return updateRows[0];
  } else {
    // 🆕 No existe: crear nuevo registro
    const insertQuery = `
      INSERT INTO inventario 
        (tipo, especificacion, cantidad, disponibilidad, estado, memoria_ram_id, almacenamiento_id, sucursal_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const insertValues = [
      tipo,
      especificacion,
      cantidad,
      disponibilidad,
      estado,
      memoria_ram_id,
      almacenamiento_id,
      sucursal_id,
    ];
    const { rows: insertRows } = await pool.query(insertQuery, insertValues);
    return insertRows[0];
  }
}

/** ----------------------------------------------------
 * OBTENER TODO EL INVENTARIO
 * ---------------------------------------------------- */
async function obtenerInventario() {
  const query = `
    SELECT 
      i.id,
      i.tipo,
      COALESCE(cm.descripcion, ca.descripcion, i.especificacion) AS descripcion,
      i.cantidad,
      i.disponibilidad,
      i.estado,
      i.memoria_ram_id,
      i.almacenamiento_id,
      i.sucursal_id,
      i.fecha_creacion
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    ORDER BY i.id ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

/** ----------------------------------------------------
 * OBTENER INVENTARIO POR ID
 * ---------------------------------------------------- */
async function obtenerInventarioPorId(id) {
  const query = `SELECT * FROM inventario WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

/** ----------------------------------------------------
 * ACTUALIZAR INVENTARIO
 * ---------------------------------------------------- */
async function actualizarInventario(
  id,
  {
    tipo,
    especificacion,
    cantidad,
    disponibilidad,
    estado,
    memoria_ram_id = null,
    almacenamiento_id = null,
    sucursal_id = null,
  }
) {
  const query = `
    UPDATE inventario
    SET tipo = $1, especificacion = $2, cantidad = $3, disponibilidad = $4, estado = $5,
        memoria_ram_id = $6, almacenamiento_id = $7, sucursal_id = $8
    WHERE id = $9
    RETURNING *;
  `;
  const values = [
    tipo,
    especificacion,
    cantidad,
    disponibilidad,
    estado,
    memoria_ram_id,
    almacenamiento_id,
    sucursal_id,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

/** ----------------------------------------------------
 * ELIMINAR INVENTARIO
 * ---------------------------------------------------- */
async function eliminarInventario(id) {
  const query = `DELETE FROM inventario WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

/** ----------------------------------------------------
 * DESCONTAR STOCK
 * ---------------------------------------------------- */
async function descontarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT * FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT * FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  const inventario = rows[0];
  if (!inventario) throw new Error("Item inventario no encontrado");

  const nuevaCantidad = Math.max(0, inventario.cantidad - cantidad);
  const updateQuery = `
    UPDATE inventario
    SET cantidad = $1
    WHERE id = $2
    RETURNING *;
  `;
  const { rows: updateRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    inventario.id,
  ]);
  return updateRows[0];
}

/** ----------------------------------------------------
 * AUMENTAR STOCK
 * ---------------------------------------------------- */
async function aumentarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT * FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT * FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  const inventario = rows[0];
  if (!inventario) throw new Error("Ítem inventario no encontrado");

  const nuevaCantidad = inventario.cantidad + cantidad;
  const updateQuery = `
    UPDATE inventario SET cantidad = $1 WHERE id = $2 RETURNING *;
  `;
  const { rows: updatedRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    inventario.id,
  ]);
  return updatedRows[0];
}

/** ----------------------------------------------------
 * VALIDAR STOCK
 * ---------------------------------------------------- */
async function validarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
  sucursal_id = null,
}) {
  if (!sucursal_id) throw new Error("Debe especificar sucursal_id");

  let query, id;
  if (memoria_ram_id) {
    query = `SELECT cantidad FROM inventario WHERE memoria_ram_id = $1 AND sucursal_id = $2 LIMIT 1`;
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = `SELECT cantidad FROM inventario WHERE almacenamiento_id = $1 AND sucursal_id = $2 LIMIT 1`;
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id, sucursal_id]);
  if (!rows.length) throw new Error("Item de inventario no encontrado");

  return rows[0].cantidad >= cantidad;
}

module.exports = {
  agregarOActualizarInventario,
  obtenerInventario,
  obtenerInventarioPorId,
  actualizarInventario,
  eliminarInventario,
  descontarStockInventario,
  aumentarStockInventario,
  validarStockInventario,
};
