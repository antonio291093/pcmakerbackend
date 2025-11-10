const pool = require("../config/db");

/** ----------------------------------------------------
 * INSERTAR EQUIPO EN INVENTARIO
 * ---------------------------------------------------- */
async function insertarEquipoEnInventario(
  equipo_id,
  sucursal_id = null,
  precio = 0,
  disponibilidad = true
) {
  const query = `
    INSERT INTO inventario (equipo_id, sucursal_id, tipo, cantidad, estado, disponibilidad, fecha_creacion, precio)
    VALUES ($1, $2, 'Equipo Armado', 1, 'nuevo', $3, NOW(), $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    equipo_id,
    sucursal_id,
    disponibilidad,
    precio,
  ]);
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

/**
 * DESCONTAR STOCK (exclusivo para ventas)
 * ----------------------------------------
 * Disminuye la cantidad de un producto en inventario según su ID.
 */
async function descontarStockVenta({ producto_id, cantidad = 1, sucursal_id }) {
  if (!producto_id || !sucursal_id)
    throw new Error("Debe proporcionar producto_id y sucursal_id");

  // Verificar existencia
  const buscarQuery = `
    SELECT * FROM inventario
    WHERE id = $1 AND sucursal_id = $2
    LIMIT 1;
  `;
  const { rows } = await pool.query(buscarQuery, [producto_id, sucursal_id]);
  const producto = rows[0];

  if (!producto) throw new Error("Producto no encontrado en inventario");

  // Validar stock suficiente
  if (producto.cantidad < cantidad)
    throw new Error(`Stock insuficiente. Disponible: ${producto.cantidad}`);

  // Descontar stock
  const nuevaCantidad = producto.cantidad - cantidad;
  const updateQuery = `
    UPDATE inventario
    SET cantidad = $1
    WHERE id = $2
    RETURNING *;
  `;
  const { rows: updateRows } = await pool.query(updateQuery, [
    nuevaCantidad,
    producto.id,
  ]);

  return updateRows[0];
}

async function agregarOActualizarInventario({
  tipo,
  especificacion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  precio = 0,
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
    // ✅ Ya existe: actualizar cantidad y precio (opcional)
    const inventario = rows[0];
    const nuevaCantidad = inventario.cantidad + cantidad;

    const updateQuery = `
      UPDATE inventario
      SET cantidad = $1,
          precio = $2
      WHERE id = $3
      RETURNING *;
    `;
    const { rows: updateRows } = await pool.query(updateQuery, [
      nuevaCantidad,
      precio,
      inventario.id,
    ]);
    return updateRows[0];
  } else {
    // 🆕 No existe: crear nuevo registro
    const insertQuery = `
      INSERT INTO inventario 
        (tipo, especificacion, cantidad, disponibilidad, estado, precio, memoria_ram_id, almacenamiento_id, sucursal_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const insertValues = [
      tipo,
      especificacion,
      cantidad,
      disponibilidad,
      estado,
      precio,
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
      i.precio,
      i.disponibilidad,
      i.estado,
      i.memoria_ram_id,
      i.almacenamiento_id,
      i.sucursal_id,
      i.fecha_creacion
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    WHERE i.equipo_id IS NULL
    ORDER BY i.id ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function obtenerEquiposArmados() {
  const query = `
    SELECT 
      e.id,
      e.nombre,
      e.procesador,
      le.etiqueta,
      e.sucursal_id,
      s.nombre AS sucursal_nombre,
      i.precio,
      i.estado,
      i.disponibilidad,
      -- Agrupa las memorias RAM asociadas
      COALESCE(
        (
          SELECT json_agg(cmr.descripcion)
          FROM equipos_ram er
          JOIN catalogo_memoria_ram cmr ON er.memoria_ram_id = cmr.id
          WHERE er.equipo_id = e.id
        ),
        '[]'
      ) AS memorias_ram,
      -- Agrupa los almacenamientos asociados
      COALESCE(
        (
          SELECT json_agg(ca.descripcion)
          FROM equipos_almacenamiento ea
          JOIN catalogo_almacenamiento ca ON ea.almacenamiento_id = ca.id
          WHERE ea.equipo_id = e.id
        ),
        '[]'
      ) AS almacenamientos
    FROM inventario i
    JOIN equipos e ON i.equipo_id = e.id
    JOIN lotes_etiquetas le ON e.lote_etiqueta_id = le.id
    LEFT JOIN sucursales s ON e.sucursal_id = s.id
    WHERE e.estado_id = 4 -- Armado
    ORDER BY e.id ASC;
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

async function actualizarInventario(
  id,
  {
    tipo,
    especificacion,
    descripcion,
    cantidad,
    disponibilidad,
    estado,
    precio,
    memoria_ram_id = null,
    almacenamiento_id = null,
    sucursal_id = null,
  }
) {
  // 🧩 Si no hay especificacion pero sí descripcion, úsala
  if (!especificacion && descripcion) {
    especificacion = descripcion;
  }

  const updateQuery = `
    UPDATE inventario
    SET tipo = $1,
        especificacion = $2,
        cantidad = $3,
        disponibilidad = $4,
        estado = $5,
        precio = $6,
        memoria_ram_id = $7,
        almacenamiento_id = $8,
        sucursal_id = $9
    WHERE id = $10;
  `;

  const values = [
    tipo,
    especificacion,
    cantidad,
    disponibilidad,
    estado,
    precio,
    memoria_ram_id,
    almacenamiento_id,
    sucursal_id,
    id,
  ];

  await pool.query(updateQuery, values);

  const selectQuery = `
    SELECT 
      i.id,
      i.tipo,
      COALESCE(cm.descripcion, ca.descripcion, i.especificacion) AS descripcion,
      i.cantidad,
      i.disponibilidad,
      i.estado,
      i.precio, -- ✅ incluir el precio en el retorno
      i.memoria_ram_id,
      i.almacenamiento_id,
      i.sucursal_id,
      i.fecha_creacion
    FROM inventario i
    LEFT JOIN catalogo_memoria_ram cm ON i.memoria_ram_id = cm.id
    LEFT JOIN catalogo_almacenamiento ca ON i.almacenamiento_id = ca.id
    WHERE i.id = $1;
  `;

  const { rows } = await pool.query(selectQuery, [id]);
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

async function crearInventarioGeneral({
  tipo,
  descripcion,
  cantidad = 1,
  disponibilidad = true,
  estado = "usado",
  sucursal_id,
  precio = 0, // ✅ nuevo campo
}) {
  if (!tipo || !descripcion || !sucursal_id)
    throw new Error("Faltan datos requeridos");

  const insertQuery = `
    INSERT INTO inventario 
      (tipo, especificacion, cantidad, disponibilidad, estado, sucursal_id, precio)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    tipo,
    descripcion,
    cantidad,
    disponibilidad,
    estado,
    sucursal_id,
    precio, // ✅ incluirlo en la inserción
  ];

  const { rows } = await pool.query(insertQuery, values);
  return rows[0];
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
  crearInventarioGeneral,
  descontarStockVenta,
  insertarEquipoEnInventario,
  eliminarInventario,
  obtenerEquiposArmados,
};
