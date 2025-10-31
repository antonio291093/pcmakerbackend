const pool = require("../config/db");

async function agregarOActualizarInventario({
  tipo,
  especificacion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  memoria_ram_id = null,
  almacenamiento_id = null,
}) {
  let buscarQuery, buscarValues;
  if (memoria_ram_id) {
    buscarQuery = `SELECT * FROM inventario WHERE memoria_ram_id = $1 AND especificacion = $2 LIMIT 1`;
    buscarValues = [memoria_ram_id, especificacion];
  } else if (almacenamiento_id) {
    buscarQuery = `SELECT * FROM inventario WHERE almacenamiento_id = $1 AND especificacion = $2 LIMIT 1`;
    buscarValues = [almacenamiento_id, especificacion];
  }

  const { rows } = await pool.query(buscarQuery, buscarValues);

  if (rows.length > 0) {
    // Ya existe: actualiza la cantidad
    const inventario = rows[0];
    const nuevaCantidad = inventario.cantidad + cantidad;
    const updateQuery = `
      UPDATE inventario SET cantidad = $1 WHERE id = $2 RETURNING *;
    `;
    const { rows: updateRows } = await pool.query(updateQuery, [
      nuevaCantidad,
      inventario.id,
    ]);
    return updateRows[0];
  } else {
    // No existe: crea nuevo registro
    const insertQuery = `
      INSERT INTO inventario (tipo, especificacion, cantidad, disponibilidad, estado, memoria_ram_id, almacenamiento_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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
    ];
    const { rows: insertRows } = await pool.query(insertQuery, insertValues);
    return insertRows[0];
  }
}

// Obtener todo inventario
async function obtenerInventario() {
  const query = `SELECT * FROM inventario ORDER BY id ASC;`;
  const { rows } = await pool.query(query);
  return rows;
}

// Obtener inventario por ID
async function obtenerInventarioPorId(id) {
  const query = `SELECT * FROM inventario WHERE id = $1;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

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
  }
) {
  const query = `
    UPDATE inventario
    SET tipo = $1, especificacion = $2, cantidad = $3, disponibilidad = $4, estado = $5,
        memoria_ram_id = $6, almacenamiento_id = $7
    WHERE id = $8
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
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Eliminar inventario
async function eliminarInventario(id) {
  const query = `DELETE FROM inventario WHERE id = $1 RETURNING *;`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

async function descontarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
}) {
  let query, id;
  if (memoria_ram_id) {
    query = "SELECT * FROM inventario WHERE memoria_ram_id = $1";
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query = "SELECT * FROM inventario WHERE almacenamiento_id = $1";
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id]);
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

// Aumentar stock en inventario
async function aumentarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
}) {
  let query = "SELECT * FROM inventario WHERE ";
  let id;
  if (memoria_ram_id) {
    query += "memoria_ram_id = $1";
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query += "almacenamiento_id = $1";
    id = almacenamiento_id;
  }
  const { rows } = await pool.query(query, [id]);
  const inventario = rows[0];
  if (!inventario) throw new Error("Ítem inventario no encontrado");
  const nuevaCantidad = inventario.cantidad + cantidad;
  const { rows: updatedRows } = await pool.query(
    `
      UPDATE inventario SET cantidad = $1 WHERE id = $2 RETURNING *;
    `,
    [nuevaCantidad, inventario.id]
  );
  return updatedRows[0];
}

async function validarStockInventario({
  memoria_ram_id = null,
  almacenamiento_id = null,
  cantidad = 1,
}) {
  let query, id;
  if (memoria_ram_id) {
    query = "SELECT cantidad FROM inventario WHERE memoria_ram_id = $1 LIMIT 1";
    id = memoria_ram_id;
  } else if (almacenamiento_id) {
    query =
      "SELECT cantidad FROM inventario WHERE almacenamiento_id = $1 LIMIT 1";
    id = almacenamiento_id;
  } else {
    throw new Error("Debe proporcionar memoria_ram_id o almacenamiento_id");
  }

  const { rows } = await pool.query(query, [id]);
  if (!rows.length) {
    throw new Error("Item de inventario no encontrado");
  }
  const cantidadDisponible = rows[0].cantidad;
  if (cantidadDisponible < cantidad) {
    return false; // No hay suficiente stock
  }
  return true; // Hay stock suficiente
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
